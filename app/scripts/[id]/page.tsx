'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Script = {
  id: string
  user_id: string
  title: string
  logline: string | null
  genre: string | null
  content: string
  is_public: boolean
  upvotes_count: number | null
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

export default function ScriptPage() {
  const params = useParams()
  const router = useRouter()
  const scriptId = params?.id as string

  const [script, setScript] = useState<Script | null>(null)
  const [soundtracks, setSoundtracks] = useState<Soundtrack[]>([])
  const [worldboardId, setWorldboardId] = useState<string | null>(null)
  const [pins, setPins] = useState<WorldPin[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [vote, setVote] = useState<VoteState>({ hasVoted: false, count: 0 })
  const [tab, setTab] = useState<'script' | 'worldboard'>('script')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // For adding pins (only for owner)
  const [newPinTitle, setNewPinTitle] = useState('')
  const [newPinImageUrl, setNewPinImageUrl] = useState('')
  const [newPinType, setNewPinType] = useState<'cast' | 'location' | 'mood' | 'prop' | 'other'>('mood')
  const [addingPin, setAddingPin] = useState(false)

  useEffect(() => {
    if (!scriptId) return

    ;(async () => {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user ?? null
      setCurrentUserId(user ? user.id : null)

      // Fetch script
      const { data: s, error: sErr } = await supabase
        .from('scripts')
        .select('id, user_id, title, logline, genre, content, is_public, upvotes_count')
        .eq('id', scriptId)
        .single()

      if (sErr || !s) {
        setError('Script not found.')
        setLoading(false)
        return
      }

      // If script is private and current user is not owner, block
      if (!s.is_public && user?.id !== s.user_id) {
        setError('This script is private.')
        setLoading(false)
        return
      }

      setScript(s)

      // Initial vote state
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

      setVote({
        hasVoted,
        count: s.upvotes_count ?? 0,
      })

      // Fetch soundtracks
      const { data: stData } = await supabase
        .from('scene_soundtracks')
        .select('id, scene_label, provider, url')
        .eq('script_id', scriptId)
        .order('created_at', { ascending: true })

      setSoundtracks(stData || [])

      // Fetch/create worldboard
      const { data: wb } = await supabase
        .from('worldboards')
        .select('id')
        .eq('script_id', scriptId)
        .maybeSingle()

      let wbId = wb?.id ?? null

      // If none exists and user is owner, quietly create one
      if (!wbId && user && user.id === s.user_id) {
        const { data: newWb, error: createErr } = await supabase
          .from('worldboards')
          .insert({ script_id: scriptId, title: 'Worldboard' })
          .select('id')
          .single()

        if (!createErr && newWb) {
          wbId = newWb.id
        }
      }

      setWorldboardId(wbId)

      if (wbId) {
        const { data: pinsData } = await supabase
          .from('world_pins')
          .select('id, type, title, image_url, description')
          .eq('worldboard_id', wbId)
          .order('created_at', { ascending: false })

        setPins(pinsData || [])
      }

      // 🔹 Log a view (best-effort; does not block UI)
      fetch(`/api/scripts/${scriptId}/view`, {
        method: 'POST',
      }).catch(() => {})

      setLoading(false)
    })()
  }, [scriptId])

  const isOwner = script && currentUserId === script.user_id

  // Toggle vote
  const handleToggleVote = async () => {
    if (!script || !currentUserId) {
      router.push('/login')
      return
    }

    if (vote.hasVoted) {
      const { error: delErr } = await supabase
        .from('script_votes')
        .delete()
        .eq('script_id', script.id)
        .eq('user_id', currentUserId)

      if (!delErr) {
        setVote((v) => ({
          hasVoted: false,
          count: Math.max(0, v.count - 1),
        }))
      }
    } else {
      const { error: insErr } = await supabase
        .from('script_votes')
        .insert({ script_id: script.id, user_id: currentUserId })

      if (!insErr) {
        setVote((v) => ({
          hasVoted: true,
          count: v.count + 1,
        }))
      }
    }
  }

  // Add a simple pin (owner only)
  const handleAddPin = async () => {
    if (!isOwner || !worldboardId || !newPinTitle.trim()) return

    try {
      setAddingPin(true)
      const { data, error } = await supabase
        .from('world_pins')
        .insert({
          worldboard_id: worldboardId,
          type: newPinType,
          title: newPinTitle.trim(),
          image_url: newPinImageUrl.trim() || null,
        })
        .select('id, type, title, image_url, description')
        .single()

      if (!error && data) {
        setPins((prev) => [data, ...prev])
        setNewPinTitle('')
        setNewPinImageUrl('')
      }
    } finally {
      setAddingPin(false)
    }
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
        <p className="text-sm text-red-400">
          {error || 'Something went wrong.'}
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white py-8 px-4 flex justify-center">
      <div className="w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-zinc-500">
              Screenplay
            </p>
            <h1 className="text-3xl font-semibold mt-1">{script.title}</h1>
            {script.logline && (
              <p className="text-[0.8rem] text-zinc-300 mt-2 max-w-2xl">
                {script.logline}
              </p>
            )}
            {script.genre && (
              <p className="text-[0.6rem] uppercase tracking-[0.18em] text-zinc-500 mt-1">
                {script.genre}
              </p>
            )}
            {!script.is_public && (
              <p className="text-[0.6rem] text-amber-400 mt-1">
                Private – only visible to you.
              </p>
            )}
          </div>

          {/* Voting */}
          <button
            onClick={handleToggleVote}
            className={`px-3 py-2 rounded-lg border text-[0.7rem] flex flex-col items-center min-w-[90px] ${
              vote.hasVoted
                ? 'bg-white text-black border-white'
                : 'bg-black text-zinc-200 border-zinc-700 hover:border-zinc-400'
            }`}
          >
            <span className="font-semibold tracking-[0.14em] uppercase">
              {vote.hasVoted ? 'Recommended' : 'Recommend'}
            </span>
            <span className="text-[0.6rem] text-zinc-400 mt-0.5">
              {vote.count} {vote.count === 1 ? 'vote' : 'votes'}
            </span>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-800 flex gap-6 text-[0.75rem]">
          <button
            onClick={() => setTab('script')}
            className={`pb-2 uppercase tracking-[0.16em] ${
              tab === 'script'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            Script
          </button>
          <button
            onClick={() => setTab('worldboard')}
            className={`pb-2 uppercase tracking-[0.16em] ${
              tab === 'worldboard'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            Worldboard
          </button>
        </div>

        {/* Script tab */}
        {tab === 'script' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(220px,0.8fr)]">
            {/* Script content */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4">
              <pre className="whitespace-pre-wrap text-[0.78rem] leading-relaxed font-mono text-zinc-200">
                {script.content}
              </pre>
            </div>

            {/* Soundtrack column */}
            <aside className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[0.7rem] uppercase tracking-[0.16em] text-zinc-500">
                  Soundtrack
                </h2>
                {isOwner && (
                  <Link
                    href={`/scripts/${script.id}/edit-soundtrack`}
                    className="text-[0.6rem] text-zinc-500 underline hover:text-zinc-300"
                  >
                    Manage
                  </Link>
                )}
              </div>

              {soundtracks.length === 0 && (
                <p className="text-[0.7rem] text-zinc-500">
                  No music attached yet.{' '}
                  {isOwner && 'Add tracks to set the tone for key scenes.'}
                </p>
              )}

              {soundtracks.map((st) => (
                <div
                  key={st.id}
                  className="border border-zinc-900 rounded-lg p-2 space-y-1 bg-zinc-950"
                >
                  {st.scene_label && (
                    <p className="text-[0.6rem] uppercase tracking-[0.14em] text-zinc-500">
                      {st.scene_label}
                    </p>
                  )}
                  <MusicEmbed url={st.url} provider={st.provider || 'other'} />
                </div>
              ))}
            </aside>
          </div>
        )}

        {/* Worldboard tab */}
        {tab === 'worldboard' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[0.7rem] uppercase tracking-[0.16em] text-zinc-500">
                Visual Worldboard
              </h2>
              {isOwner && (
                <p className="text-[0.6rem] text-zinc-500">
                  Add cast, locations, props & mood to visualize this project.
                </p>
              )}
            </div>

            {isOwner && worldboardId && (
              <div className="flex flex-wrap items-end gap-2 bg-zinc-950 border border-zinc-900 rounded-lg p-3">
                <div>
                  <label className="block text-[0.6rem] text-zinc-500 mb-1">
                    Type
                  </label>
                  <select
                    value={newPinType}
                    onChange={(e) =>
                      setNewPinType(e.target.value as any)
                    }
                    className="bg-black border border-zinc-800 rounded px-2 py-1 text-[0.65rem]"
                  >
                    <option value="cast">Cast</option>
                    <option value="location">Location</option>
                    <option value="mood">Mood</option>
                    <option value="prop">Prop</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[0.6rem] text-zinc-500 mb-1">
                    Title
                  </label>
                  <input
                    value={newPinTitle}
                    onChange={(e) => setNewPinTitle(e.target.value)}
                    placeholder="e.g. Hana (Protagonist)"
                    className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-[0.65rem]"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[0.6rem] text-zinc-500 mb-1">
                    Image URL (optional)
                  </label>
                  <input
                    value={newPinImageUrl}
                    onChange={(e) => setNewPinImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-[0.65rem]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPin}
                  disabled={addingPin || !newPinTitle.trim()}
                  className="px-3 py-1.5 rounded-full bg-white text-black text-[0.6rem] font-semibold tracking-[0.16em] uppercase disabled:opacity-50"
                >
                  {addingPin ? 'Adding…' : 'Add Pin'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pins.map((pin) => (
                <div
                  key={pin.id}
                  className="bg-zinc-950 border border-zinc-900 rounded-lg p-2 space-y-1"
                >
                  <p className="text-[0.55rem] uppercase tracking-[0.14em] text-zinc-500">
                    {pin.type}
                  </p>
                  <p className="text-[0.7rem] font-semibold text-zinc-100">
                    {pin.title}
                  </p>
                  {pin.image_url && (
                    <img
                      src={pin.image_url}
                      alt={pin.title}
                      className="w-full h-20 object-cover rounded-md"
                    />
                  )}
                  {pin.description && (
                    <p className="text-[0.6rem] text-zinc-400 line-clamp-3">
                      {pin.description}
                    </p>
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
    </main>
  )
}

/** Minimal music embed helper kept inline for now */
function MusicEmbed({ url, provider }: { url: string; provider: string }) {
  if (!url) return null

  if (provider === 'youtube') {
    const id = extractYouTubeId(url)
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
    const embedUrl = url.replace(
      'open.spotify.com/track',
      'open.spotify.com/embed/track'
    )
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
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-[0.6rem] text-zinc-300 underline"
    >
      Open soundtrack
    </a>
  )
}

function extractYouTubeId(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.hostname === 'youtu.be') return url.pathname.slice(1)
    const v = url.searchParams.get('v')
    return v || null
  } catch {
    return null
  }
}
