'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function UsernameOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setUserId(user.id)

      // If profile already exists with a username, skip onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.username && profile.username.trim().length > 0) {
        router.replace('/settings')
        return
      }

      setLoading(false)
    }
    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)

    const clean = username.trim()
    if (!clean) {
      setError('Please choose a username.')
      setSaving(false)
      return
    }

    // Try to create/update the profile with this username
    // NOTE: unique index on lower(username) will protect against dupes
    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert({ id: userId, username: clean, bio: null }, { onConflict: 'id' })

    if (upsertErr) {
      // 23505 is "unique_violation"
      if ((upsertErr as any).code === '23505') {
        setError('That username is taken. Try another.')
      } else {
        setError(upsertErr.message)
      }
      setSaving(false)
      return
    }

    router.replace('/settings')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold">Choose a username</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Pick a unique handle for your writer profile.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500 mb-1">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
            />
            <p className="mt-1 text-[0.65rem] text-zinc-500">
              Your public URL will be <code>/profile/{username || 'yourname'}</code>
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold tracking-[0.16em] uppercase hover:bg-zinc-100 transition disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  )
}
