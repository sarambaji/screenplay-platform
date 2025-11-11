'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Script = {
  id: string
  user_id: string
  title: string
  logline: string | null
  genre: string | null
  created_at: string
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      const { data, error } = await supabase.auth.getUser()
      if (error) console.error(error)
      else if (data?.user) setUserId(data.user.id)
    }
    fetchUser()
  }, [])

  // Fetch all scripts (public ones)
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('scripts')
        .select('id, user_id, title, logline, genre, created_at')
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setError('Failed to load scripts.')
      } else if (data) {
        setScripts(data as Script[])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleDelete(id: string, title: string) {
    const confirmed = window.confirm(
      `Delete "${title}"? This action cannot be undone.`
    )
    if (!confirmed) return

    setDeletingId(id)
    setError(null)

    // Server-side security check
    const { error } = await supabase
      .from('scripts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId) // restrict deletion to their own uploads

    if (error) {
      console.error(error)
      setError('Failed to delete screenplay. Please try again.')
      setDeletingId(null)
      return
    }

    // Remove it from the UI
    setScripts((prev) => prev.filter((s) => s.id !== id))
    setDeletingId(null)
  }

  return (
    <main className="min-h-screen bg-black text-white py-10">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.25em] text-zinc-500">
            Discover
          </p>
          <h1 className="text-3xl font-semibold">
            Screenplays from the community
          </h1>
        </div>
        <Link
          href="/upload"
          className="px-4 py-2 rounded-full border border-zinc-700 text-xs uppercase tracking-[0.16em] hover:bg-white hover:text-black transition"
        >
          Upload yours
        </Link>
      </div>

      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      {loading && <p className="text-sm text-zinc-500">Loading scripts…</p>}

      {!loading && scripts.length === 0 && (
        <p className="text-sm text-zinc-500">
          No scripts yet. Be the first to{' '}
          <Link href="/upload" className="underline">
            upload one
          </Link>
          .
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {scripts.map((s) => (
          <div
            key={s.id}
            className="group border border-zinc-800 rounded-2xl p-4 bg-zinc-950/60 hover:bg-zinc-900 transition flex flex-col justify-between"
          >
            <Link href={`/scripts/${s.id}`} className="flex-1">
              <div>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h2 className="text-sm font-semibold group-hover:text-white">
                    {s.title}
                  </h2>
                  {s.genre && (
                    <span className="px-2 py-0.5 rounded-full text-[0.6rem] uppercase tracking-[0.16em] bg-zinc-900 text-zinc-400">
                      {s.genre}
                    </span>
                  )}
                </div>
                {s.logline && (
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {s.logline}
                  </p>
                )}
              </div>
              <p className="mt-3 text-[0.6rem] text-zinc-500">
                Added {new Date(s.created_at).toLocaleDateString()}
              </p>
            </Link>

            {/* Delete button only for the owner's scripts */}
            {userId === s.user_id && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDelete(s.id, s.title)
                  }}
                  disabled={deletingId === s.id}
                  className={`text-[0.6rem] ${
                    deletingId === s.id
                      ? 'text-red-500 cursor-wait'
                      : 'text-red-400 hover:text-red-500'
                  }`}
                >
                  {deletingId === s.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
