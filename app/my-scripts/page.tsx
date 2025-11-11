// app/my-scripts/page.tsx
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

export default function MyScriptsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [scripts, setScripts] = useState<Script[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) console.error(userError)

      if (!user) {
        setLoading(false)
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('scripts')
        .select('id, title, is_public, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setError('Failed to load your scripts.')
      } else if (data) {
        setScripts(data as Script[])
      }

      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <p className="text-sm text-zinc-400">Loading your scripts...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <h1 className="text-2xl font-semibold mb-3">My Scripts</h1>
        <p className="text-sm text-red-400">{error}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-2xl font-semibold mb-3">My Scripts</h1>

      {scripts.length === 0 ? (
        <p className="text-sm text-zinc-500">
          You haven&apos;t uploaded anything yet.{' '}
          <Link href="/upload" className="underline">
            Upload your first screenplay.
          </Link>
        </p>
      ) : (
        <div className="space-y-3 mt-4">
          {scripts.map((s) => (
            <Link
              key={s.id}
              href={`/scripts/${s.id}`}
              className="flex items-center justify-between border border-zinc-800 rounded-2xl px-4 py-3 text-xs hover:bg-zinc-900/60 transition"
            >
              <div className="flex flex-col">
                <span className="font-medium text-zinc-100">{s.title}</span>
                <span className="text-[0.6rem] text-zinc-500">
                  {s.is_public ? 'Public' : 'Private'} •{' '}
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
