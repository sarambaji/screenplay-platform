'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Script = {
  id: string
  title: string
  logline: string | null
  genre: string | null
  is_public: boolean
  created_at: string
}

export default function ScriptsDashboard() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [logline, setLogline] = useState('')
  const [genre, setGenre] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) {
        setUserId(null)
        setScripts([])
        setLoading(false)
        return
      }
      setUserId(user.id)

      const { data: scriptsData, error: sErr } = await supabase
        .from('scripts')
        .select(
          'id, title, logline, genre, is_public, created_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (sErr) setError('Failed to load your scripts.')
      setScripts(scriptsData || [])
      setLoading(false)
    })()
  }, [])

  const handleCreate = async () => {
    if (!userId || !title.trim()) return
    setCreating(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('scripts')
        .insert({
          user_id: userId,
          title: title.trim(),
          logline: logline.trim() || null,
          genre: genre.trim() || null,
          is_public: isPublic,
          content: '',
        })
        .select('id')
        .single()

      if (error || !data) throw error || new Error('Failed to create script.')

      // go straight into editor view
      router.push(`/scripts/${data.id}/edit`)
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Failed to create script.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto flex gap-8">
        {/* Left: Create / Upload */}
        <section className="flex-1 space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">
              New Script
            </h1>
            <Link
              href="/scripts"
              className="text-[0.65rem] text-zinc-500 uppercase tracking-[0.16em]"
            >
              My Scripts
            </Link>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Create in-app card */}
            <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-950/70">
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-zinc-500 mb-2">
                Create
              </p>
              <p className="text-sm text-zinc-300 mb-4">
                Start writing a screenplay directly in screenplay.beta
              </p>

              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                />
                <input
                  value={logline}
                  onChange={(e) => setLogline(e.target.value)}
                  placeholder="Logline (optional)"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                />
                <input
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Genre (optional)"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                />
                <label className="flex items-center gap-2 text-[0.65rem] text-zinc-400">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="accent-white"
                  />
                  Public (discoverable after you publish)
                </label>

                {error && (
                  <p className="text-[0.65rem] text-red-400">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleCreate}
                  disabled={creating || !title.trim()}
                  className="w-full mt-1 py-2 rounded-xl bg-white text-black text-[0.75rem] font-semibold tracking-[0.16em] uppercase disabled:opacity-40"
                >
                  {creating ? 'Creating…' : 'Create & Open Editor'}
                </button>
              </div>
            </div>

            {/* Upload existing script card */}
            <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-950/40 flex flex-col justify-between">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-zinc-500 mb-2">
                  Upload
                </p>
                <p className="text-sm text-zinc-300 mb-4">
                  Import a PDF / text file and keep editing here.
                </p>
              </div>
              <button
                onClick={() => router.push('/upload')}
                className="mt-auto py-2 rounded-xl border border-zinc-600 text-[0.75rem] font-semibold tracking-[0.16em] uppercase hover:bg-zinc-900"
              >
                Go to Upload
              </button>
            </div>
          </div>

          {/* My Scripts list */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[0.75rem] uppercase tracking-[0.16em] text-zinc-500">
                My Scripts
              </h2>
            </div>
            {loading ? (
              <p className="text-[0.7rem] text-zinc-500">Loading…</p>
            ) : scripts.length === 0 ? (
              <p className="text-[0.7rem] text-zinc-500">
                No scripts yet. Start by creating or uploading one.
              </p>
            ) : (
              <div className="border border-zinc-900 rounded-2xl overflow-hidden">
                {scripts.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-3 text-[0.7rem] border-b border-zinc-900 last:border-b-0 hover:bg-zinc-950/80"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-zinc-100">
                        {s.title}
                      </p>
                      {s.logline && (
                        <p className="text-zinc-500 line-clamp-1">
                          {s.logline}
                        </p>
                      )}
                    </div>
                    <span className="text-zinc-600 uppercase tracking-[0.14em]">
                      {s.is_public ? 'Public' : 'Private'}
                    </span>
                    <Link
                      href={`/scripts/${s.id}/edit`}
                      className="px-3 py-1 rounded-full bg-zinc-100 text-black"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/scripts/${s.id}`}
                      className="px-3 py-1 rounded-full border border-zinc-600 text-zinc-200"
                    >
                      View as reader
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: subtle preview / branding (optional) */}
        <aside className="hidden lg:flex w-[260px] flex-col justify-between">
          <div className="border border-zinc-900 rounded-2xl p-4 bg-zinc-950/40">
            <p className="text-[0.7rem] text-zinc-500 mb-2">
              View as reader
            </p>
            <p className="text-[0.75rem] text-zinc-300">
              Open any script in a clean reader that shows soundtrack,
              worldboard, and line comments without editor clutter.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
