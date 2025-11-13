// app/leaderboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Script = {
  id: string
  title: string
  logline: string | null
  genre: string | null
  upvotes_count: number | null
  created_at: string
  user_id: string
}

export default function LeaderboardPage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [genre, setGenre] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        let query = supabase
          .from('scripts')
          .select('id, title, logline, genre, upvotes_count, created_at, user_id')
          .eq('is_public', true)

        if (genre) query = query.eq('genre', genre)

        query = query.order('upvotes_count', { ascending: false }).limit(50)

        const { data, error } = await query
        if (error) throw error
        setScripts(data || [])
      } catch (err: any) {
        console.error(err)
        setError('Failed to load leaderboard.')
      } finally {
        setLoading(false)
      }
    })()
  }, [genre])

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              The most voted screenplays from across the community.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[0.65rem] text-zinc-400">
            <button
              onClick={() => setGenre('')}
              className={`px-3 py-1 rounded-full border border-zinc-700 ${
                !genre ? 'bg-white text-black' : ''
              }`}
            >
              All genres
            </button>
            {['Drama', 'Sci-Fi', 'Thriller', 'Romance'].map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`px-3 py-1 rounded-full border border-zinc-800 hover:border-zinc-500 ${
                  genre === g ? 'bg-white text-black' : 'text-zinc-300'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </header>

        {/* Loading / Error States */}
        {loading && <p className="text-[0.8rem] text-zinc-500">Loading leaderboard…</p>}
        {error && <p className="text-[0.8rem] text-red-400">{error}</p>}

        {/* Leaderboard */}
        {!loading && !error && scripts.length > 0 && (
          <section className="border border-zinc-900 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-zinc-400 text-[0.7rem] uppercase tracking-[0.16em] border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Genre</th>
                  <th className="px-4 py-3 hidden md:table-cell">Logline</th>
                  <th className="px-4 py-3 text-right">Votes</th>
                </tr>
              </thead>
              <tbody>
                {scripts.map((s, index) => (
                  <tr
                    key={s.id}
                    className="border-b border-zinc-900 hover:bg-zinc-950/60 transition-colors"
                  >
                    <td className="px-4 py-3 text-zinc-500 text-[0.75rem]">{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/scripts/${s.id}`}
                        className="text-zinc-100 hover:underline text-[0.85rem]"
                      >
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-zinc-400 text-[0.75rem]">
                      {s.genre || '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-zinc-500 text-[0.75rem] line-clamp-1">
                      {s.logline || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[0.75rem] text-zinc-400">
                      {s.upvotes_count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {!loading && !error && scripts.length === 0 && (
          <p className="text-[0.8rem] text-zinc-500">
            No public scripts yet. Once writers start publishing, the leaderboard will appear here.
          </p>
        )}
      </div>
    </main>
  )
}
