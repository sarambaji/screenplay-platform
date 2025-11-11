'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Script = {
  id: string
  title: string
  created_at: string
}

type ScriptWithViews = Script & {
  view_count: number
}

export default function StatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [scripts, setScripts] = useState<ScriptWithViews[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      // 1. Require auth
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error(userError)
      }

      if (!user) {
        // not logged in → send to login
        router.push('/login')
        return
      }

      // 2. Get ONLY this user's scripts
      const { data: scriptRows, error: scriptError } = await supabase
        .from('scripts')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (scriptError) {
        console.error(scriptError)
        setError('Failed to load stats.')
        setLoading(false)
        return
      }

      if (!scriptRows || scriptRows.length === 0) {
        setScripts([])
        setLoading(false)
        return
      }

      const scriptIds = scriptRows.map((s) => s.id)

      // 3. Get view counts for this user's scripts
      const { data: viewRows, error: viewsError } = await supabase
        .from('script_views')
        .select('script_id')
        .in('script_id', scriptIds)

      if (viewsError) {
        console.error(viewsError)
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

  // While redirecting unauthenticated users, don't flash anything weird
  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <h1 className="text-2xl font-semibold mb-4">Your stats</h1>
        <p className="text-sm text-zinc-400">Loading…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <h1 className="text-2xl font-semibold mb-4">Your stats</h1>
        <p className="text-sm text-red-400">{error}</p>
      </main>
    )
  }

  if (!scripts.length) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <h1 className="text-2xl font-semibold mb-4">Your stats</h1>
        <p className="text-sm text-zinc-400">
          No scripts yet — upload one to start tracking views.
        </p>
      </main>
    )
  }

  const total = scripts.length
  const totalViews = scripts.reduce((sum, s) => sum + s.view_count, 0)

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Your stats</h1>

      <section className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Total scripts</p>
          <p className="text-2xl font-semibold">{total}</p>
        </div>
        <div className="border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Total views</p>
          <p className="text-2xl font-semibold">{totalViews}</p>
        </div>
        <div className="border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Avg views / script</p>
          <p className="text-2xl font-semibold">
            {total ? Math.round(totalViews / total) : 0}
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-300 mb-3">
          Breakdown by script
        </h2>
        <div className="space-y-3">
          {scripts.map((script) => (
            <div
              key={script.id}
              className="flex items-center justify-between border border-zinc-800 rounded-2xl px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{script.title}</p>
                <p className="text-[10px] text-zinc-500">
                  Created {new Date(script.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400">
                  {script.view_count} views
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
