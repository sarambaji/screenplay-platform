// app/discover/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type ScriptRow = {
  id: string
  title: string
  logline: string | null
  genre: string | null
  subgenre: string | null
  upvotes_count: number | null
  created_at: string
}

type ScriptWithViews = ScriptRow & {
  views_count: number
  comment_count: number
}

export default function DiscoverPage() {
  const [scripts, setScripts] = useState<ScriptWithViews[]>([])
  const [topScripts, setTopScripts] = useState<ScriptWithViews[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)

      // 1) Get all public scripts (basic info)
      const { data, error } = await supabase
        .from('scripts')
        .select(
          'id, title, logline, genre, subgenre, upvotes_count, created_at'
        )
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setError('Failed to load scripts.')
        setLoading(false)
        return
      }

      const baseScripts = (data || []) as ScriptRow[]

      if (baseScripts.length === 0) {
        setScripts([])
        setTopScripts([])
        setLoading(false)
        return
      }

      const scriptIds = baseScripts.map((s) => s.id)

      // 2) Get all view rows + comment rows for these scripts
      const [{ data: viewRows, error: viewError }, { data: commentRows, error: commentError }] =
        await Promise.all([
          supabase
            .from('script_views')
            .select('script_id')
            .in('script_id', scriptIds),
          supabase
            .from('script_comments')
            .select('script_id')
            .in('script_id', scriptIds),
        ])

      if (viewError) console.error('viewError', viewError)
      if (commentError) console.error('commentError', commentError)

      // 3) Build count maps
      const viewCountMap: Record<string, number> = {}
      const commentCountMap: Record<string, number> = {}

      ;(viewRows || []).forEach((row: any) => {
        const id = row.script_id as string
        viewCountMap[id] = (viewCountMap[id] || 0) + 1
      })

      ;(commentRows || []).forEach((row: any) => {
        const id = row.script_id as string
        commentCountMap[id] = (commentCountMap[id] || 0) + 1
      })

      // 4) Attach counts to each script
      const withViews: ScriptWithViews[] = baseScripts.map((s) => ({
        ...s,
        views_count: viewCountMap[s.id] || 0,
        comment_count: commentCountMap[s.id] || 0,
      }))

      setScripts(withViews)

      // 5) Build "top scripts" by votes (then views as tie-breaker)
      const ranked = [...withViews]
        .sort((a, b) => {
          const voteDiff = (b.upvotes_count ?? 0) - (a.upvotes_count ?? 0)
          if (voteDiff !== 0) return voteDiff
          return b.views_count - a.views_count
        })
        .slice(0, 5)

      setTopScripts(ranked)
      setLoading(false)
    })()
  }, [])

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto flex gap-8">
        {/* Left: main discover feed */}
        <section className="flex-1 space-y-4">
          <header>
            <h1 className="text-3xl font-semibold tracking-tight">Discover</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Curated & trending screenplays from the community.
            </p>
          </header>

          {loading && (
            <p className="text-[0.8rem] text-zinc-500">Loading scripts…</p>
          )}

          {error && <p className="text-[0.8rem] text-red-400">{error}</p>}

          {!loading && !error && scripts.length === 0 && (
            <p className="text-[0.8rem] text-zinc-500">
              No public scripts yet. Be the first to{' '}
              <Link href="/upload" className="underline text-zinc-200">
                create one
              </Link>
              .
            </p>
          )}

          {!loading && !error && scripts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scripts.map((s) => (
                <Link
                  key={s.id}
                  href={`/scripts/${s.id}`}
                  className="group border border-zinc-900 bg-zinc-950/70 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-600 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500">
                      Screenplay
                    </p>
                    <h2 className="text-sm font-semibold text-zinc-50">
                      {s.title}
                    </h2>

                    {s.logline && (
                      <p className="text-[0.75rem] text-zinc-400 line-clamp-3">
                        {s.logline}
                      </p>
                    )}

                    {(s.genre || s.subgenre) && (
                      <p className="text-[0.6rem] uppercase tracking-[0.16em] text-zinc-500 mt-1">
                        {s.genre}
                        {s.subgenre ? (
                          <span className="text-zinc-600">
                            {' '}
                            — {s.subgenre}
                          </span>
                        ) : null}
                      </p>
                    )}
                  </div>

                  {/* stats row: votes + comments + views */}
                  <div className="mt-3 flex items-center justify-between text-[0.6rem] text-zinc-500">
                    <span className="flex items-center gap-2">
                      <span title="Votes">
                        {(s.upvotes_count ?? 0).toLocaleString()}{' '}
                        {(s.upvotes_count ?? 0) === 1 ? 'vote' : 'votes'}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span title="Comments">
                        {s.comment_count.toLocaleString()}{' '}
                        {s.comment_count === 1 ? 'comment' : 'comments'}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span title="Views">
                        {s.views_count.toLocaleString()} views
                      </span>
                    </span>

                    <span className="text-zinc-600 group-hover:text-zinc-300">
                      Read →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Right: mini leaderboard + CTA */}
        <aside className="hidden lg:flex w-[260px] flex-col gap-4">
          <div className="border border-zinc-900 rounded-2xl p-4 bg-zinc-950/40">
            <h2 className="text-[0.7rem] uppercase tracking-[0.16em] text-zinc-500 mb-2">
              Top scripts
            </h2>
            {topScripts.length === 0 ? (
              <p className="text-[0.7rem] text-zinc-500">
                Once writers start publishing, the most recommended projects
                will appear here.
              </p>
            ) : (
              <ol className="space-y-2 text-[0.7rem]">
                {topScripts.map((s, i) => (
                  <li key={s.id} className="flex gap-2">
                    <span className="text-zinc-600">{i + 1}.</span>
                    <div className="flex-1">
                      <Link
                        href={`/scripts/${s.id}`}
                        className="text-zinc-100 hover:underline"
                      >
                        {s.title}
                      </Link>
                      <p className="text-[0.6rem] text-zinc-500">
                        {(s.upvotes_count ?? 0).toLocaleString()}{' '}
                        {(s.upvotes_count ?? 0) === 1 ? 'vote' : 'votes'} •{' '}
                        {s.comment_count.toLocaleString()}{' '}
                        {s.comment_count === 1 ? 'comment' : 'comments'} •{' '}
                        {s.views_count.toLocaleString()} views
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="border border-zinc-900 rounded-2xl p-4 bg-zinc-950/20">
            <p className="text-[0.7rem] text-zinc-400 mb-2">
              Are you a writer?
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-white text-black text-[0.7rem] font-semibold"
            >
              Create a script
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
