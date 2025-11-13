'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { GENRES, SUBGENRES, type Genre } from '@/lib/scriptMeta'
import { RECOMMENDED_TAGS } from '@/lib/scriptMeta'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Save,
} from 'lucide-react'

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
}

export default function EditScriptPage() {
  const params = useParams()
  const scriptId = params?.id as string

  const [script, setScript] = useState<Script | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // editable header fields
  const [titleInput, setTitleInput] = useState('')
  const [loglineInput, setLoglineInput] = useState('')
  const [genreInput, setGenreInput] = useState<Genre | ''>('') // dropdown
  const [subgenreInput, setSubgenreInput] = useState<string>('') // optional UI only

  // editor refs/state
  const editorRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null)
  const [selectionActive, setSelectionActive] = useState(false)

  const [tagsInput, setTagsInput] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  useEffect(() => {
    if (!scriptId) return
    ;(async () => {
      setLoading(true)
      setError(null)

      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user ?? null
      setCurrentUserId(user ? user.id : null)

      const { data: s, error: sErr } = await supabase
        .from('scripts')
        .select('id, user_id, title, logline, genre, subgenre, tags, content, is_public, upvotes_count')
        .eq('id', scriptId)
        .single<Script>()

      if (sErr || !s) {
        setError('Script not found.')
        setLoading(false)
        return
      }

      if (!user || user.id !== s.user_id) {
        setError('Only the owner can edit this script.')
        setLoading(false)
        return
      }

      setScript(s)
      setTitleInput(s.title || '')
      setLoglineInput(s.logline || '')

      const initialGenre = (GENRES as readonly string[]).includes(s.genre || '')
        ? (s.genre as Genre)
        : ''
      setGenreInput(initialGenre)
// hydrate subgenre + tags from DB
setSubgenreInput(s.subgenre || '')
setSelectedTags(Array.isArray(s.tags) ? s.tags : [])


      setLoading(false)
    })()
  }, [scriptId])

  // initialize editor HTML when script loads
  useEffect(() => {
    if (!script || !editorRef.current) return
    editorRef.current.innerHTML = script.content || ''
  }, [script])

  // floating toolbar behavior
  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return

    const handleSelection = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) {
        setSelectionActive(false)
        setToolbarPos(null)
        return
      }
      const range = sel.getRangeAt(0)
      if (!ed.contains(range.commonAncestorContainer)) {
        setSelectionActive(false)
        setToolbarPos(null)
        return
      }
      const rect = range.getBoundingClientRect()
      if (rect && rect.width !== 0) {
        setSelectionActive(true)
        const top = window.scrollY + rect.top - 56
        const left = window.scrollX + rect.left + rect.width / 2
        setToolbarPos({ top, left })
      } else {
        setSelectionActive(false)
        setToolbarPos(null)
      }
    }

    document.addEventListener('selectionchange', handleSelection)
    window.addEventListener('scroll', handleSelection, { passive: true })
    return () => {
      document.removeEventListener('selectionchange', handleSelection)
      window.removeEventListener('scroll', handleSelection)
    }
  }, [])

  const isOwner = !!script && currentUserId === script.user_id

  // simple formatting
  const cmd = (command: string) => {
    if (editorRef.current) editorRef.current.focus()
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand(command, false)
  }

  const handleSave = async () => {
    if (!script || !isOwner || !editorRef.current) return
    setSaving(true)
    const html = editorRef.current.innerHTML

    const { error: updErr } = await supabase
      .from('scripts')
      .update({
  title: titleInput.trim() || null,
  logline: loglineInput.trim() || null,
  genre: genreInput || null,          // dropdown value; no .trim()
  subgenre: subgenreInput || null,    // NEW: persist subgenre
  tags: selectedTags.length ? selectedTags : null, // NEW: persist tags array
  content: html,
}
)
      .eq('id', script.id)
      .eq('user_id', currentUserId || '')

    setSaving(false)
    if (updErr) {
      alert('Save failed. Please try again.')
      return
    }

    const btn = document.getElementById('saveStatus')
    if (btn) {
      btn.textContent = 'Saved ✓'
      setTimeout(() => (btn.textContent = 'Save'), 1200)
    }

    setScript((prev) =>
  prev
    ? {
        ...prev,
        title: titleInput.trim() || prev.title,
        logline: loglineInput.trim() || null,
        genre: genreInput || null,
        subgenre: subgenreInput || null,               // NEW
        tags: selectedTags.length ? selectedTags : null, // NEW
        content: html,
      }
    : prev
)

  }

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault(); cmd('bold')
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault(); cmd('italic')
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault(); cmd('underline')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center">
        <p className="text-sm text-zinc-400">Loading editor…</p>
      </main>
    )
  }

  if (error || !script) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center">
        <p className="text-sm text-red-400">{error || 'Something went wrong.'}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white py-8 px-4 flex justify-center">
      <div className="w-full max-w-5xl space-y-6">
<div className="flex items-start justify-between gap-6">
          {/* Header */}
        <div className="flex items-start justify-between gap-6">
          {/* LEFT: edit info, logline + tags + genre */}
          <div className="flex-1">
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-zinc-500">Edit</p>

            {/* Editable Title */}
            <input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Untitled screenplay"
              className="mt-1 w-full bg-transparent text-3xl font-semibold outline-none placeholder:text-zinc-600"
            />
{/* Genre + Subgenre (unchanged, just pushed a bit lower) */}
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              {/* Reader-style pill preview */}
              <span className="text-[0.7rem] tracking-[0.18em] uppercase text-zinc-400 min-w-[6rem]">
                {genreInput || '(No genre)'}
              </span>

              {/* Main Genre dropdown */}
              <div className="relative">
                <select
                  value={genreInput}
                  onChange={(e) => {
                    const g = e.target.value as Genre | ''
                    setGenreInput(g)
                    setSubgenreInput('') // reset subgenre when genre changes
                  }}
                  className="cursor-pointer appearance-none px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800
text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-zinc-500
transition w-[9.5rem] pr-7 hover:border-white"
                >
                  <option value="" disabled>
                    Select genre…
                  </option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {/* Subgenre dropdown (shows only when a genre is selected) */}
              {!!genreInput && (
                <div className="relative">
                  <select
                    value={subgenreInput}
                    onChange={(e) => setSubgenreInput(e.target.value)}
                    className="cursor-pointer appearance-none px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800
text-sm text-zinc-200 outline-none focus:ring-zinc-500
transition w-[9.5rem] pr-7 hover:border-white"
                  >
                    <option value="">Subgenre (optional)…</option>
                    {SUBGENRES[genreInput as Genre].map((sg) => (
                      <option key={sg} value={sg}>
                        {sg}
                      </option>
                    ))}
                  </select>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              )}
            </div>
            {/* LOGLINE + TAGS SIDE BY SIDE */}
            <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-start">
              {/* Logline (fixed-width column) */}
              <div className="flex-[1.6] min-w-[280px]">
                <div className="text-[0.7rem] tracking-[0.18em] uppercase text-zinc-500">
                  Logline
                </div>
                <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950 h-[180px]">
  <textarea
    value={loglineInput}
    onChange={(e) => setLoglineInput(e.target.value)}
    placeholder="A young Black photographer accompanies his white girlfriend to her family's estate for a weekend…"
    className="w-full h-full bg-transparent text-[0.9rem] text-zinc-200 outline-none resize-none placeholder:text-zinc-600 px-3 py-2 leading-relaxed overflow-y-auto"
  />
</div>

              {/* Tags column */}
<div className="mt-4 flex-[1.3] min-w-[260px]">
  <div className="text-[0.7rem] tracking-[0.18em] uppercase text-zinc-500">
    Tags
  </div>

  {/* Outer tag box – fixed height, like logline */}
  <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950 h-[180px] flex flex-col">
    {/* Selected tags + input (top area) */}
    <div className="px-3 py-2 border-b border-zinc-900 flex flex-wrap items-center gap-2">
      {selectedTags.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() =>
            setSelectedTags(selectedTags.filter((x) => x !== t))
          }
          className="cursor-pointer px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 hover:bg-zinc-800"
          title="Remove tag"
        >
          {t}
          <span className="ml-1 text-zinc-500">×</span>
        </button>
      ))}

      <input
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const v = tagsInput.trim()
            if (v && !selectedTags.includes(v)) {
              setSelectedTags([...selectedTags, v])
            }
            setTagsInput('')
          }
        }}
        placeholder="Add tag… (Enter)"
        className="flex-1 min-w-[7rem] bg-transparent text-sm outline-none placeholder:text-zinc-600"
      />
    </div>

    {/* Recommended tags – scrolls independently, never pushes layout */}
    <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-wrap gap-2">
      {RECOMMENDED_TAGS.filter((t) =>
        tagsInput
          ? t.toLowerCase().includes(tagsInput.toLowerCase())
          : true
      ).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => {
            if (!selectedTags.includes(t)) {
              setSelectedTags([...selectedTags, t])
            }
          }}
          className="px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-900"
        >
          {t}
        </button>
      ))}
    </div>
  </div>
</div>

              </div>
            </div>


            
          </div>
    </div>
          {/* RIGHT: buttons (unchanged) */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/scripts/${script.id}`}
              className="cursor-pointer px-3 py-1.5 rounded-full border border-zinc-600 text-[0.7rem]"
              title="Open reader view"
            >
              View as reader
            </Link>

            <button
              id="saveStatus"
              onClick={handleSave}
              disabled={saving}
              className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-black text-[0.8rem] font-semibold disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>


        {/* Editor container */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6">
          {/* persistent top toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ToolbarButton icon={<Bold className="w-5 h-5" />} label="Bold (⌘/Ctrl+B)" onClick={() => cmd('bold')} />
            <ToolbarButton icon={<Italic className="w-5 h-5" />} label="Italic (⌘/Ctrl+I)" onClick={() => cmd('italic')} />
            <ToolbarButton icon={<Underline className="w-5 h-5" />} label="Underline (⌘/Ctrl+U)" onClick={() => cmd('underline')} />
            <div className="ml-3 h-6 w-px bg-zinc-800" />
            <ToolbarButton icon={<AlignLeft className="w-5 h-5" />} label="Align left" onClick={() => cmd('justifyLeft')} />
            <ToolbarButton icon={<AlignCenter className="w-5 h-5" />} label="Align center" onClick={() => cmd('justifyCenter')} />
            <ToolbarButton icon={<AlignRight className="w-5 h-5" />} label="Align right" onClick={() => cmd('justifyRight')} />
          </div>

          {/* contentEditable editor */}
          <div
            ref={editorRef}
            className="min-h-[60vh] outline-none font-mono text-[0.95rem] leading-relaxed text-zinc-100 max-w-3xl mx-auto text-center"
            contentEditable
            role="textbox"
            aria-label="Screenplay editor"
            spellCheck={false}
            onFocus={() => setSelectionActive(false)}
          />

          {/* floating selection toolbar (appears on text selection) */}
          {selectionActive && toolbarPos && (
            <div
              ref={toolbarRef}
              className="fixed z-50 -translate-x-1/2 -translate-y-full bg-zinc-900 border border-zinc-700 rounded-2xl shadow-lg px-3 py-2 flex items-center gap-1"
              style={{ top: toolbarPos.top, left: toolbarPos.left }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <ToolbarButton ghost icon={<Bold className="w-5 h-5" />} label="Bold" onClick={() => cmd('bold')} />
              <ToolbarButton ghost icon={<Italic className="w-5 h-5" />} label="Italic" onClick={() => cmd('italic')} />
              <ToolbarButton ghost icon={<Underline className="w-5 h-5" />} label="Underline" onClick={() => cmd('underline')} />
              <div className="mx-1 h-5 w-px bg-zinc-700" />
              <ToolbarButton ghost icon={<AlignLeft className="w-5 h-5" />} label="Left" onClick={() => cmd('justifyLeft')} />
              <ToolbarButton ghost icon={<AlignCenter className="w-5 h-5" />} label="Center" onClick={() => cmd('justifyCenter')} />
              <ToolbarButton ghost icon={<AlignRight className="w-5 h-5" />} label="Right" onClick={() => cmd('justifyRight')} />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function ToolbarButton({
  icon,
  label,
  onClick,
  ghost = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  ghost?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        ghost
          ? 'inline-flex items-center justify-center p-2 rounded-lg hover:bg-zinc-800 text-zinc-100'
          : 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-700 hover:bg-zinc-800 text-zinc-100 text-[0.8rem]'
      }
    >
      {icon}
      {!ghost && <span>{label.split(' (')[0]}</span>}
    </button>
  )
}
