// app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Script = {
  id: string
  title: string
  is_public: boolean
  created_at: string
}

type ScriptWithViews = Script & {
  view_count: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [scripts, setScripts] = useState<ScriptWithViews[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      // 1. Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error(userError)
      }

      if (!user) {
        setLoading(false)
        router.push('/login')
        return
      }

      setUserId(user.id)

      // 2. Get this user's scripts
      const { data: scriptRows, error: scriptError } = await supabase
        .from('scripts')
        .select('id, title, is_public, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (scriptError) {
        console.error(scriptError)
        setError('Failed to load your scripts.')
        setLoading(false)
        return
      }

      if (!scriptRows || scriptRows.length === 0) {
        setScripts([])
        setLoading(false)
        return
      }

      // 3. Get view counts for these scripts
      const scriptIds = scriptRows.map((s) => s.id)

      const { data: viewRows, error: viewsError } = await supabase
        .from('script_views')
        .select('script_id')
        .in('script_id', scriptIds)

      if (viewsError) {
        console.error(viewsError)
        // we don't hard fail here; just default to 0 views
      }

      const viewCountMap: Record<string, number> = {}

      if (viewRows) {
        for (const row of viewRows) {
          const id = row.script_id as string
          viewCountMap[id] = (viewCountMap[id] || 0) + 1
        }
      }

      const withViews: ScriptWithViews[] = scriptRows.map((s) => ({
        ...s,
        view_count: viewCountMap[s.id] || 0,
      }))

      setScripts(withViews)
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white py-10 px-6">
        <p className="text-sm text-zinc-400">Loading your stats...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white py-10 px-6">
        <h1 className="text-2xl font-semibold mb-2">Your stats</h1>
        <p className="text-sm text-red-400">{error}</p>
      </main>
    )
  }

  if (!userId) {
    // already redirected if no user; nothing to show
    return null
  }

  const total = scripts.length
  const publicCount = scripts.filter((s) => s.is_public).length
  const privateCount = total - publicCount
  const totalViews = scripts.reduce((sum, s) => sum + s.view_count, 0)
  const avgViews = total ? Math.round(totalViews / total) : 0
  const latest = scripts[0]

  return (
    <main className="min-h-screen bg-black text-white py-10 px-6">
      <h1 className="text-2xl font-semibold mb-2">Your stats</h1>
      <p className="text-sm text-zinc-500 mb-6">
        A quick snapshot of your work on screenplay.beta.
      </p>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="border border-zinc-800 rounded-2xl p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500">
            Total screenplays
          </p>
          <p className="mt-2 text-2xl font-semibold">{total}</p>
        </div>

        <div className="border border-zinc-800 rounded-2xl p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500">
            Public
          </p>
          <p className="mt-2 text-2xl font-semibold">{publicCount}</p>
        </div>

        <div className="border border-zinc-800 rounded-2xl p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500">
            Private drafts
          </p>
          <p className="mt-2 text-2xl font-semibold">{privateCount}</p>
        </div>

        <div className="border border-zinc-800 rounded-2xl p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500">
            Total views
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {totalViews} <span className="text-xs text-zinc-500">({avgViews} avg)</span>
          </p>
        </div>
      </div>

      {/* Recent uploads */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold mb-1">Recent uploads</h2>
        {scripts.length === 0 ? (
          <p className="text-xs text-zinc-500">
            You haven&apos;t uploaded anything yet.{' '}
            <Link href="/upload" className="underline">
              Upload your first screenplay.
            </Link>
          </p>
        ) : (
          <>
            {latest && (
              <p className="text-[0.65rem] text-zinc-500 mb-1">
                Latest: <span className="text-zinc-100">{latest.title}</span>{' '}
                • {latest.is_public ? 'Public' : 'Private'} •{' '}
                {new Date(latest.created_at).toLocaleDateString()}
              </p>
            )}
            <div className="space-y-2">
              {scripts.slice(0, 5).map((s) => (
                <Link
                  key={s.id}
                  href={`/scripts/${s.id}`}
                  className="flex items-center justify-between border border-zinc-800 rounded-xl px-4 py-2 text-xs hover:bg-zinc-950 transition"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-zinc-100">
                      {s.title}
                    </span>
                    <span className="text-[0.6rem] text-zinc-500">
                      {s.is_public ? 'Public' : 'Private'} •{' '}
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[0.6rem] text-zinc-500">
                      {s.view_count} views
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
