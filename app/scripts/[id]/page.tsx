'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { SCRIPT_TYPES, type ScriptType } from '@/lib/scriptMeta'


/** =========================
 *  Types
 *  ========================= */
type Script = {
  id: string
  user_id: string
  title: string
  logline: string | null
  genre: string | null
  subgenre: string | null
  tags: string[] | null
  content: string | null
  is_public: boolean
  upvotes_count: number | null
  views_count: number | null
  script_type: ScriptType | null        
}

type Soundtrack = {
  id: string
  scene_label: string | null
  provider: string | null
  url: string
}

type WorldPin = {
  id: string
  type: string
  title: string
  image_url: string | null
  description: string | null
}

type VoteState = {
  hasVoted: boolean
  count: number
}

type Comment = {
  id: string
  line_index: number
  body: string
  author_id: string | null
  author_username: string | null
  author_avatar_url: string | null
  created_at: string
  updated_at?: string | null
  likes_count: number
  liked_by_user: boolean
}

/** =========================
 *  Small helpers
 *  ========================= */
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
type LineBlock = { html: string; align?: 'left' | 'center' | 'right' }

function formatCommentTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
function isReply(body: string) {
  return body.trim().startsWith('@')
}

function MusicEmbed({ url, provider }: { url: string; provider: string }) {
  if (!url) return null

  if (provider === 'youtube') {
    const id = (() => {
      try {
        const u = new URL(url)
        if (u.hostname === 'youtu.be') return u.pathname.slice(1)
        return u.searchParams.get('v')
      } catch {
        return null
      }
    })()
    if (!id) return null
    return (
      <iframe
        className="w-full h-24 rounded-md border border-zinc-800"
        src={`https://www.youtube.com/embed/${id}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="lazy"
      />
    )
  }

  if (provider === 'spotify') {
    const embedUrl = url.replace('open.spotify.com/track', 'open.spotify.com/embed/track')
    return (
      <iframe
        className="w-full h-80 rounded-md border border-zinc-800"
        src={embedUrl}
        allow="autoplay; clipboard-write; encrypted-media"
        loading="lazy"
      />
    )
  }

  if (provider === 'soundcloud') {
    const encoded = encodeURIComponent(url)
    return (
      <iframe
        className="w-full h-24 rounded-md border border-zinc-800"
        src={`https://w.soundcloud.com/player/?url=${encoded}`}
        loading="lazy"
      />
    )
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-[0.6rem] text-zinc-300 underline">
      Open soundtrack
    </a>
  )
}

/** =========================
 *  3-dots menu used in comments
 *  ========================= */
function OverflowMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="px-2 py-1 rounded-md text-xs border border-zinc-700 hover:bg-zinc-800 cursor-pointer"
        aria-label="Open comment menu"
        title="More"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 rounded-lg border border-zinc-800 bg-zinc-950 shadow-lg p-1 z-10">
          <button
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-zinc-900 cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-zinc-900 text-red-400 cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

/** =========================
 *  CommentPanel (memoized slide-over)
 *  ========================= */
type CommentPanelProps = {
  open: boolean
  onClose: () => void
  blocks: { html: string }[]
  focusedLineIndex: number | null
  selectedRange: { start: number; end: number } | null
  comments: Comment[]
  currentUserId: string | null
  onLike: (id: string) => void
  onSaveEdit: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAdd: (body: string) => Promise<void>
}

const CommentPanel = React.memo(function CommentPanel({
  open,
  onClose,
  blocks,
  focusedLineIndex,
  selectedRange,
  comments,
  currentUserId,
  onLike,
  onSaveEdit,
  onDelete,
  onAdd,
}: CommentPanelProps) {
  if (!open) return null

  const [newBody, setNewBody] = React.useState('')
  const [posting, setPosting] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingBody, setEditingBody] = React.useState('')

  function ReplyInline({
    commenter,
    onSubmit,
  }: {
    commenter: string
    onSubmit: (text: string) => Promise<void>
  }) {
    const [open, setOpen] = React.useState(false)
    const [val, setVal] = React.useState('')

    if (!open) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="text-[0.75rem] font-semibold text-zinc-300 hover:text-white cursor-pointer"
        >
          Reply
        </button>
      )
    }

    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const text = val.trim()
          if (!text) return
          await onSubmit(text)
          setVal('')
          setOpen(false)
        }}
        className="flex items-center gap-2"
      >
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={`Reply to ${commenter}…`}
          className="bg-black border border-zinc-800 rounded-full px-3 py-1 text-sm outline-none"
        />
        <button
          type="submit"
          className="px-3 py-1 rounded-full bg-white text-black text-[0.72rem] font-semibold"
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => {
            setVal('')
            setOpen(false)
          }}
          className="px-2 py-1 rounded-full border border-zinc-700 text-[0.72rem]"
        >
          Cancel
        </button>
      </form>
    )
  }

  const focusedComments = React.useMemo(
    () =>
      focusedLineIndex !== null
        ? comments.filter((c) => c.line_index === focusedLineIndex)
        : [],
    [comments, focusedLineIndex]
  )

  const quoteText = React.useMemo(() => {
    if (selectedRange) {
      return blocks
        .slice(selectedRange.start, selectedRange.end + 1)
        .map((b) => b.html.replace(/<[^>]+>/g, ''))
        .join(' ')
    }
    if (focusedLineIndex !== null) {
      return blocks[focusedLineIndex]?.html.replace(/<[^>]+>/g, '') || ''
    }
    return ''
  }, [blocks, focusedLineIndex, selectedRange])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBody.trim()) return
    try {
      setPosting(true)
      setErr(null)
      await onAdd(newBody.trim())
      setNewBody('')
    } catch (e: any) {
      setErr(e?.message || 'Failed to post.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-zinc-950 border-l border-zinc-800 shadow-2xl">
        <header className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold">
            {selectedRange
              ? `Comments • Lines ${selectedRange.start + 1}–${selectedRange.end + 1}`
              : focusedLineIndex !== null
              ? `Comments • Line ${focusedLineIndex + 1}`
              : 'Comments'}
          </h3>
          <button
            onClick={onClose}
            className="cursor-pointer px-2 py-1 rounded-md text-xs border border-zinc-700 hover:bg-zinc-800"
          >
            Close
          </button>
        </header>

        <div className="h-[calc(100%-56px)] overflow-y-auto p-4 space-y-3">
          {quoteText && (
            <p className="text-[0.7rem] text-zinc-300 bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 line-clamp-4">
              {quoteText}
            </p>
          )}

          <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
            {focusedComments.length === 0 ? (
              <p className="text-[0.85rem] text-zinc-400">Be the first to comment here.</p>
            ) : (
              focusedComments.map((c) => {
                const isAuthor = currentUserId && c.author_id === currentUserId
                const edited =
                  c.updated_at && c.updated_at !== c.created_at ? ` • edited ${formatCommentTime(c.updated_at)}` : ''

                return (
  <div
    key={c.id}
    className={`
      relative border rounded-xl space-y-2
      ${isReply(c.body)
        ? 'ml-8 bg-zinc-900/40 border-zinc-800 px-3 py-2 text-[0.75rem]'
        : 'bg-zinc-900/70 border-zinc-800 px-3 py-2 text-[0.8rem]'}
      text-zinc-200
    `}
  >
    {/* optional vertical connector for replies */}
    {isReply(c.body) && (
      <div className="absolute -left-4 top-2 bottom-2 w-px bg-zinc-800" />
    )}

    {/* Top row: author + time + 3-dots menu (if author) */}
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {c.author_avatar_url && (
          <img
            src={c.author_avatar_url}
            alt={c.author_username || 'User'}
            className="w-4 h-4 rounded-full object-cover"
          />
        )}
        <span className="font-semibold text-zinc-100 text-[0.72rem]">
          {c.author_username || 'Reader'}
        </span>
        <span className="text-[0.6rem] text-zinc-500">
          {formatCommentTime(c.created_at)}
          {edited}
        </span>
      </div>

      {isAuthor ? (
        <OverflowMenu
          onEdit={() => {
            setEditingId(c.id)
            setEditingBody(c.body)
          }}
          onDelete={() => onDelete(c.id)}
        />
      ) : (
        <span className="inline-block w-5" />
      )}
    </div>

    {/* Body OR editor */}
    {editingId === c.id ? (
      <div className="space-y-2">
        <textarea
          value={editingBody}
          onChange={(e) => setEditingBody(e.target.value)}
          rows={3}
          className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm outline-none"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await onSaveEdit(c.id, editingBody)
              setEditingId(null)
            }}
            className="cursor-pointer px-3 py-1.5 rounded-full bg-white text-black text-[0.72rem] font-semibold transition"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditingId(null)
              setEditingBody('')
            }}
            className="cursor-pointer px-3 py-1.5 rounded-full border border-zinc-700 text-[0.72rem] transition"
          >
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <p className="text-zinc-300">{c.body}</p>
    )}

    {/* Actions row UNDER the comment: heart + count, Reply */}
    <div className="flex items-center gap-4 pt-1">
      <button
        onClick={() => onLike(c.id)}
        className="flex items-center gap-1 text-[0.75rem] transition-colors cursor-pointer"
        title={c.liked_by_user ? 'Unlike' : 'Like'}
        aria-label={c.liked_by_user ? 'Unlike comment' : 'Like comment'}
      >
        <span className={c.liked_by_user ? 'text-red-500' : 'text-zinc-500 hover:text-white'}>
          {c.liked_by_user ? '♥' : '♡'}
        </span>
        <span className={c.liked_by_user ? 'text-red-500' : 'text-zinc-500 hover:text-white'}>
          {c.likes_count}
        </span>
      </button>

      <ReplyInline
        commenter={c.author_username || 'Reader'}
        onSubmit={async (replyText: string) => {
          // simple mention-reply: post another comment on the same line
          await onAdd(`@${c.author_username || 'user'} ${replyText}`)
        }}
      />
    </div>
  </div>
)

              })
            )}
          </div>

          {/* New comment composer */}
          <form
            onSubmit={submit}
            className="flex items-center gap-2 border border-zinc-800 rounded-full px-3 bg-black"
          >
            <input
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 bg-transparent text-[0.95rem] text-zinc-100 outline-none py-2"
            />
            <button
              type="submit"
              disabled={!newBody.trim() || posting}
              className="cursor-pointer px-3 py-1.5 rounded-full bg-white text-black text-[0.75rem] font-semibold disabled:opacity-40 transition hover:bg-zinc-200"
              title="Post comment"
            >
              {posting ? '…' : 'Send'}
            </button>
          </form>
          {!!err && <p className="text-[0.7rem] text-red-400">{err}</p>}
        </div>
      </aside>
    </div>
  )
})

/** =========================
 *  Page
 *  ========================= */
export default function ScriptReaderPage() {
  const params = useParams()
  const router = useRouter()
  const scriptId = params?.id as string
const searchParams = useSearchParams()

// initial tab from URL (?tab=worldboard), fallback to 'script'
const [tab, setTab] = useState<'script' | 'worldboard'>(() => {
  const t = searchParams.get('tab')
  return t === 'worldboard' ? 'worldboard' : 'script'
})

// keep tab in sync if the URL changes client-side
useEffect(() => {
  const t = searchParams.get('tab')
  if (t === 'worldboard' || t === 'script') {
    setTab(t)
  }
}, [searchParams])

  // core state
  const [script, setScript] = useState<Script | null>(null)
  const [soundtracks, setSoundtracks] = useState<Soundtrack[]>([])
  const [worldboardId, setWorldboardId] = useState<string | null>(null)
  const [pins, setPins] = useState<WorldPin[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [vote, setVote] = useState<VoteState>({ hasVoted: false, count: 0 })
  

  // NEW: local views counter for display
  const [viewsCount, setViewsCount] = useState<number>(0)

  // comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [activeLine, setActiveLine] = useState<number | null>(null)
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null)
  const [commentPanelOpen, setCommentPanelOpen] = useState(false)

  // ui state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!scriptId) return
    ;(async () => {
      setLoading(true)
      setError(null)

      // user
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user ?? null
      setCurrentUserId(user ? user.id : null)

      // script
      const { data: s, error: sErr } = await supabase
  .from('scripts')
  .select(
    'id, user_id, title, logline, genre, subgenre, tags, content, is_public, upvotes_count, views_count, script_type'
  )
  .eq('id', scriptId)
  .single<Script>()


      if (sErr || !s) {
        setError('Script not found.')
        setLoading(false)
        return
      }
      if (!s.is_public && user?.id !== s.user_id) {
        setError('This script is private.')
        setLoading(false)
        return
      }
      setScript(s)

      // initialise views count from DB
      setViewsCount(s.views_count ?? 0)

      // vote
      let hasVoted = false
      if (user) {
        const { data: existingVote } = await supabase
          .from('script_votes')
          .select('id')
          .eq('script_id', scriptId)
          .eq('user_id', user.id)
          .maybeSingle()
        hasVoted = !!existingVote
      }
      setVote({ hasVoted, count: s.upvotes_count ?? 0 })

      // soundtrack
      const { data: stData } = await supabase
        .from('scene_soundtracks')
        .select('id, scene_label, provider, url')
        .eq('script_id', scriptId)
        .order('created_at', { ascending: true })
      setSoundtracks(stData || [])

      // worldboard + pins
      const { data: wb } = await supabase
        .from('worldboards')
        .select('id')
        .eq('script_id', scriptId)
        .maybeSingle()
      const wbId = wb?.id ?? null
      setWorldboardId(wbId)

      if (wbId) {
        const { data: pinsData } = await supabase
          .from('world_pins')
          .select('id, type, title, image_url, description')
          .eq('worldboard_id', wbId)
          .order('created_at', { ascending: false })
        setPins(pinsData || [])
      }

      // comments (+likes, +profile, +updated_at)
      const { data: rawComments, error: cErr } = await supabase
        .from('script_comments')
        .select(
          `
          id,
          line_index,
          body,
          author_id,
          created_at,
          updated_at,
          likes_count,
          profiles (username, avatar_url),
          comment_likes (user_id)
        `
        )
        .eq('script_id', scriptId)
        .order('created_at', { ascending: true })

      if (cErr) console.error('Error loading comments:', cErr)

      const mapped: Comment[] = (rawComments || []).map((c: any) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
        const likedByUser = Array.isArray(c.comment_likes)
          ? c.comment_likes.some((cl: any) => cl.user_id === user?.id)
          : false
        return {
          id: c.id,
          line_index: c.line_index,
          body: c.body,
          author_id: c.author_id ?? null,
          author_username: profile?.username ?? null,
          author_avatar_url: profile?.avatar_url ?? null,
          created_at: c.created_at,
          updated_at: c.updated_at ?? null,
          likes_count: c.likes_count ?? 0,
          liked_by_user: likedByUser,
        }
      })
      setComments(mapped)

      // best-effort view log + optimistic UI bump
      fetch(`/api/scripts/${scriptId}/view`, { method: 'POST' })
        .then(() => {
          setViewsCount(prev => prev + 1)
        })
        .catch(() => {})

      setLoading(false)
    })()
  }, [scriptId])

  const isOwner = !!script && currentUserId === script.user_id

  /** Votes */
  const handleToggleVote = async () => {
    if (!script || !currentUserId) return router.push('/login')
    if (vote.hasVoted) {
      const { error } = await supabase
        .from('script_votes')
        .delete()
        .eq('script_id', script.id)
        .eq('user_id', currentUserId)
      if (!error) setVote(v => ({ hasVoted: false, count: Math.max(0, v.count - 1) }))
    } else {
      const { error } = await supabase.from('script_votes').insert({ script_id: script.id, user_id: currentUserId })
      if (!error) setVote(v => ({ hasVoted: true, count: v.count + 1 }))
    }
  }

  /** Editor-parity line blocks */
  const blocks: LineBlock[] = useMemo(() => {
    const raw = script?.content || ''
    if (!raw.trim()) return []
    if (!/^\s*</.test(raw)) {
      return raw.split(/\r?\n/).map(t => ({ html: escapeHtml(t) }))
    }
    const normalized = raw.replace(/<br\s*\/?>/gi, '\n')
    const tmp = document.createElement('div')
    tmp.innerHTML = normalized
    const out: LineBlock[] = []
    const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'PRE', 'BLOCKQUOTE'])

    const pushBlock = (el: HTMLElement) => {
      const alignInline = (el.getAttribute('style') || '').match(/text-align\s*:\s*(left|center|right)/i)
      const styleAlign = alignInline?.[1]?.toLowerCase() as LineBlock['align'] | undefined
      let align = styleAlign
      const parts = el.innerHTML.split('\n')
      parts.forEach(p => out.push({ html: p, align }))
    }

    Array.from(tmp.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (BLOCKS.has(el.tagName)) pushBlock(el)
        else {
          const shell = document.createElement('div')
          shell.innerHTML = el.outerHTML
          pushBlock(shell)
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent || '').split('\n')
        text.forEach(t => out.push({ html: escapeHtml(t) }))
      }
    })

    const cleaned: LineBlock[] = []
    let blanks = 0
    for (const b of out) {
      const plain = b.html.replace(/<[^>]+>/g, '').trim()
      if (plain === '') {
        blanks++
        if (blanks <= 2) cleaned.push(b)
      } else {
        blanks = 0
        cleaned.push(b)
      }
    }
    return cleaned
  }, [script?.content])

  /** Visibility toggle */
  const handleSetVisibility = async (nextPublic: boolean) => {
    if (!script || !isOwner) return
    if (nextPublic && !script.is_public) {
      if (!window.confirm('Make this script public? It will be visible to anyone on Discover.')) return
    }
    const { error } = await supabase
      .from('scripts')
      .update({ is_public: nextPublic })
      .eq('id', script.id)
      .eq('user_id', currentUserId || '')
    if (error) return alert('Could not update visibility. Please try again.')
    setScript(s => (s ? { ...s, is_public: nextPublic } : s))
  }

  /** Comment operations */
  const openCommentsForLine = (idx: number, range?: { start: number; end: number } | null) => {
    setActiveLine(idx)
    setSelectedRange(range ?? null)
    setCommentPanelOpen(true)
  }

  const lineCommentCount = (idx: number) => comments.filter(c => c.line_index === idx).length

  const toggleCommentLike = async (commentId: string) => {
    if (!currentUserId) return router.push('/login')
    const target = comments.find(c => c.id === commentId)
    if (!target) return

    if (target.liked_by_user) {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', currentUserId)
      if (!error) {
        setComments(prev =>
          prev.map(c =>
            c.id === commentId ? { ...c, liked_by_user: false, likes_count: Math.max(0, c.likes_count - 1) } : c
          )
        )
      }
    } else {
      const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: currentUserId })
      if (!error) {
        setComments(prev =>
          prev.map(c => (c.id === commentId ? { ...c, liked_by_user: true, likes_count: c.likes_count + 1 } : c))
        )
      }
    }
  }

  const onAddComment = useCallback(async (body: string) => {
    if (!script || !currentUserId) {
      router.push('/login')
      return
    }
    const lineIndex = activeLine ?? (selectedRange ? selectedRange.start : null)
    if (lineIndex === null) throw new Error('Pick a line first.')

    const { data, error } = await supabase
      .from('script_comments')
      .insert({
        script_id: script.id,
        line_index: lineIndex,
        body,
        author_id: currentUserId,
      })
      .select(`
        id,line_index,body,author_id,created_at,updated_at,likes_count,
        profiles!script_comments_author_id_fkey (username, avatar_url)
      `)
      .single()

    if (error || !data) throw new Error(error?.message || 'Failed to post.')
    const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles
    setComments((prev) => [
      ...prev,
      {
        id: data.id,
        line_index: data.line_index,
        body: data.body,
        author_id: data.author_id ?? null,
        author_username: profile?.username ?? null,
        author_avatar_url: profile?.avatar_url ?? null,
        created_at: data.created_at,
        updated_at: data.updated_at ?? null,
        likes_count: data.likes_count ?? 0,
        liked_by_user: false,
      },
    ])
  }, [script, currentUserId, activeLine, selectedRange, router])

  const onSaveEdit = useCallback(async (id: string, body: string) => {
    const { data, error } = await supabase
      .from('script_comments')
      .update({ body })
      .eq('id', id)
      .select('id, updated_at')
      .single()
    if (error || !data) throw new Error(error?.message || 'Failed to edit.')
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, body, updated_at: data.updated_at } : c)))
  }, [])

  const onDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from('script_comments').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setComments((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const onLike = useCallback((id: string) => { toggleCommentLike(id) }, [toggleCommentLike])

  /** Loading / error */
  if (!scriptId) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-red-400">Missing script id.</p>
      </main>
    )
  }
  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading script…</p>
      </main>
    )
  }
  if (error || !script) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-red-400">{error || 'Something went wrong.'}</p>
      </main>
    )
  }

  /** Derived selections */
  const focusedLineIndex =
    activeLine !== null ? activeLine : selectedRange ? selectedRange.start : null

  const totalComments = comments.length

  return (
    <main className="min-h-screen bg-black text-white py-8 px-4 flex justify-center">
      <div className="w-full max-w-5xl space-y-6">
        {/* Header */}
<div className="flex items-start justify-between gap-6">
  <div className="flex-1">
    {/* Top label now respects script_type */}
    <p className="text-[0.6rem] uppercase tracking-[0.2em] text-zinc-500">
      {script.script_type
        ? SCRIPT_TYPES.find((t) => t.value === script.script_type)?.label || 'Screenplay'
        : 'Screenplay'}
    </p>

    <h1 className="text-3xl md:text-4xl font-semibold mt-1">
      {script.title}
    </h1>

    {script.logline && (
      <p className="text-[0.95rem] text-zinc-300 mt-4 max-w-3xl leading-8">
        {script.logline}
      </p>
    )}

    {/* Script type + genre block */}
    <div className="mt-6 space-y-1">
      {/* Optional: small secondary label line if you want */}
      <div className="text-[0.7rem] tracking-[0.18em] uppercase text-zinc-500">
        {script.genre ? 'Genre' : ''}
      </div>

      <div>
        {script.genre ? (
          <span className="text-[0.75rem] tracking-[0.18em] uppercase text-zinc-400">
            {script.genre}
            {script.subgenre ? (
              <span className="text-[0.65rem] text-zinc-600"> — {script.subgenre}</span>
            ) : null}
          </span>
        ) : (
          <span className="text-[0.75rem] tracking-[0.18em] uppercase text-zinc-700">
            (No genre)
          </span>
        )}
      </div>
    </div>

    {/* Tags */}
    {Array.isArray(script.tags) && script.tags.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-2">
        {script.tags.map((t) => (
          <span
            key={t}
            className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200"
          >
            {t}
          </span>
        ))}
      </div>
    )}

    {/* Visibility note for owner */}
    <div className="mt-3 text-sm">
      {isOwner &&
        (script.is_public ? (
          <span className="text-green-400">Public</span>
        ) : (
          <span className="text-red-400">Private</span>
        ))}
    </div>
  </div>

  {/* RIGHT: actions – unchanged */}
  <div className="flex flex-col items-end gap-2">
    {isOwner && (
      <Link
        href={`/scripts/${script.id}/edit`}
        className="cursor-pointer px-3 py-1.5 rounded-full border border-zinc-600 text-[0.7rem] hover:bg-zinc-800"
      >
        Edit script
      </Link>
    )}

    {isOwner && (
      <button
        onClick={() => handleSetVisibility(!script.is_public)}
        className={`px-3 py-1.5 rounded-full border text-[0.7rem] ${
          script.is_public
            ? 'cursor-pointer border-emerald-500 text-emerald-300 hover:bg-emerald-500 hover:text-black'
            : 'border-zinc-600 text-zinc-300 hover:bg-zinc-200 hover:text-black'
        }`}
        title={script.is_public ? 'Set to Private' : 'Publish (Public)'}
      >
        {script.is_public ? 'Set Private' : 'Publish'}
      </button>
    )}

    {/* VOTE BUTTON */}
    <button
      onClick={handleToggleVote}
      className={`cursor-pointer px-3 py-2 rounded-full border text-[0.7rem] flex items-center gap-2 min-w-[100px] ${
        vote.hasVoted
          ? 'bg-white text-black border-white'
          : 'bg-black text-zinc-200 border-zinc-700 hover:border-zinc-400'
      }`}
    >
      <span className="text-sm">{vote.hasVoted ? '★' : '☆'}</span>
      <span className="font-semibold tracking-[0.14em] uppercase">
        {vote.hasVoted ? 'Voted' : 'Vote'}
      </span>
    </button>

    {/* Stats */}
    <div className="mt-1 flex items-center gap-3 text-[0.65rem] text-zinc-400">
      <span>
        {vote.count} {vote.count === 1 ? 'vote' : 'votes'}
      </span>
      <span>
        · {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
      </span>
      <span>
        · {viewsCount} {viewsCount === 1 ? 'view' : 'views'}
      </span>
    </div>
  </div>
</div>


        {/* Tabs */}
        <div className="border-b border-zinc-800 flex gap-6 text-[0.75rem]">
          <button
            onClick={() => setTab('script')}
            className={`cursor-pointer pb-2 uppercase tracking-[0.16em] ${
              tab === 'script' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            Script
          </button>
          <button
            onClick={() => setTab('worldboard')}
            className={`cursor-pointer pb-2 uppercase tracking-[0.16em] ${
              tab === 'worldboard' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            Worldboard
          </button>
        </div>

        {/* SCRIPT TAB */}
        {tab === 'script' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            {/* Script content */}
            <div
              className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 max-w-2xl mx-auto space-y-2"
              onMouseUp={() => {
                const sel = window.getSelection()
                if (!sel || sel.isCollapsed || sel.toString().trim() === '') {
                  setSelectedRange(null)
                  setActiveLine(null)
                  return
                }
                const getLineEl = (node: Node | null): HTMLElement | null => {
                  while (node && !(node instanceof HTMLElement)) node = node.parentNode as Node | null
                  if (!node) return null
                  return (node as HTMLElement).closest('[data-line-index]') as HTMLElement | null
                }
                const startEl = getLineEl(sel.anchorNode)
                const endEl = getLineEl(sel.focusNode)
                if (!startEl || !endEl) return
                const start = Number(startEl.dataset.lineIndex)
                const end = Number(endEl.dataset.lineIndex)
                if (Number.isNaN(start) || Number.isNaN(end)) return
                const s = Math.min(start, end)
                const e = Math.max(start, end)
                if (s === e && sel.toString().trim() === '') return
                setActiveLine(s)
                setSelectedRange({ start: s, end: e })
              }}
            >
              {blocks.map((block, idx) => {
                const hasText = block.html.replace(/<[^>]+>/g, '').trim().length > 0
                const inSelectedRange = selectedRange && idx >= selectedRange.start && idx <= selectedRange.end
                const cnt = lineCommentCount(idx)

                const alignClass =
                  block.align === 'left' ? 'text-left' : block.align === 'right' ? 'text-right' : 'text-center'

                return (
                  <div
                    key={idx}
                    data-line-index={idx}
                    className={`group relative flex items-start gap-3 ${
                      inSelectedRange ? 'bg-zinc-900/80' : ''
                    } ${activeLine === idx && !inSelectedRange ? 'bg-zinc-900/40' : ''}`}
                  >
                    <div
                      className={`flex-1 whitespace-pre-wrap text-[0.95rem] leading-[1.75rem] font-mono text-zinc-100 cursor-text max-w-3xl mx-auto ${alignClass}`}
                      dangerouslySetInnerHTML={{ __html: block.html || '&nbsp;' }}
                    />

                    {/* comment trigger */}
                    {hasText && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          openCommentsForLine(idx, null)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition text-[0.75rem] px-2.5 py-1.5 rounded-full border border-zinc-600 text-zinc-200 cursor-pointer hover:bg-zinc-800"
                        title="Open comments"
                      >
                        💬
                      </button>
                    )}

                    {/* count badge */}
                    {cnt > 0 && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          openCommentsForLine(idx, null)
                        }}
                        className="cursor-pointer mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-100 border border-zinc-600 hover:bg-zinc-700"
                        title="View comments for this line"
                      >
                        {cnt}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Sidebar is now ONLY Soundtrack (comments moved to slide-over) */}
            <aside className="border border-zinc-900 bg-zinc-950 rounded-xl p-5 flex flex-col h-[80vh] sticky top-16">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[0.7rem] uppercase tracking-[0.16em] text-zinc-500">Soundtrack</h2>
                {isOwner && (
                  <Link
                    href={`/scripts/${script.id}/edit-soundtrack`}
                    className="text-[0.6rem] text-zinc-500 underline hover:text-zinc-300"
                  >
                    Manage
                  </Link>
                )}
              </div>

              {soundtracks.length === 0 ? (
                <p className="text-[0.75rem] text-zinc-500 mt-1">No music attached yet.</p>
              ) : (
                <div className="mt-2 space-y-2 overflow-y-auto pr-1">
                  {soundtracks.map(st => (
                    <div key={st.id} className="border border-zinc-900 rounded-lg p-2 space-y-1 bg-zinc-950">
                      {st.scene_label && (
                        <p className="text-[0.6rem] uppercase tracking-[0.14em] text-zinc-500">{st.scene_label}</p>
                      )}
                      <MusicEmbed url={st.url} provider={st.provider || 'other'} />
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        )}

        {/* WORLDBOARD TAB */}
        {tab === 'worldboard' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[0.7rem] uppercase tracking-[0.16em] text-zinc-500">Visual Worldboard</h2>
              {isOwner && (
                <p className="text-[0.6rem] text-zinc-500">Add cast, locations, props & mood to visualize this project.</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pins.map(pin => (
                <div key={pin.id} className="bg-zinc-950 border border-zinc-900 rounded-lg p-2 space-y-1">
                  <p className="text-[0.55rem] uppercase tracking-[0.14em] text-zinc-500">{pin.type}</p>
                  <p className="text-[0.7rem] font-semibold text-zinc-100">{pin.title}</p>
                  {pin.image_url && (
                    <img src={pin.image_url} alt={pin.title} className="w-full h-20 object-cover rounded-md" />
                  )}
                  {pin.description && (
                    <p className="text-[0.6rem] text-zinc-400 line-clamp-3">{pin.description}</p>
                  )}
                </div>
              ))}

              {pins.length === 0 && (
                <p className="text-[0.7rem] text-zinc-500 col-span-full">
                  No pins yet.{' '}
                  {isOwner
                    ? 'Start adding references to bring this world to life.'
                    : 'The writer has not shared a worldboard for this script yet.'}
                </p>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Slide-over comments */}
      <CommentPanel
        open={commentPanelOpen}
        onClose={() => setCommentPanelOpen(false)}
        blocks={blocks}
        focusedLineIndex={focusedLineIndex}
        selectedRange={selectedRange}
        comments={comments}
        currentUserId={currentUserId}
        onAdd={onAddComment}
        onSaveEdit={onSaveEdit}
        onDelete={onDelete}
        onLike={onLike}
      />
    </main>
  )
}
