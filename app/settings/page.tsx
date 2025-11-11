// app/settings/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        router.push('/login')
        return
      }

      setUserId(user.id)

      // Try to get existing profile (0 or 1 row)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, bio')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error(profileError)
        setError('Failed to load your profile.')
        setLoading(false)
        return
      }

      // If no profile row yet, create one with a default username
      if (!profileData) {
        const fallbackUsername =
          user.email?.split('@')[0] ?? null

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: fallbackUsername,
            bio: null,
          })
          .select('username, bio')
          .single()

        if (insertError) {
          console.error(insertError)
          setError('Failed to load your profile.')
          setLoading(false)
          return
        }

        setUsername(newProfile.username || '')
        setBio(newProfile.bio || '')
        setLoading(false)
        return
      }

      // Existing profile: populate fields
      setUsername(profileData.username || '')
      setBio(profileData.bio || '')
      setLoading(false)
    }

    load()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    if (!username.trim()) {
      setError('Username cannot be empty.')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        username: username.trim(),
        bio: bio.trim() || null,
      })
      .eq('id', userId)

    if (error) {
      console.error(error)
      setError('Could not save changes. That username may already be taken.')
    } else {
      setSuccess('Profile updated.')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white py-10">
        <div className="max-w-xl mx-auto px-6">
          <p className="text-sm text-zinc-400">Loading settings...</p>
        </div>
      </main>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <main className="min-h-screen bg-black text-white py-10">
      <div className="max-w-xl mx-auto px-6">
        <h1 className="text-2xl font-semibold mb-2">Profile settings</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Update how your writer profile appears on{' '}
          <span className="text-zinc-200">screenplay.beta</span>.
        </p>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              placeholder="yourname"
            />
            <p className="mt-1 text-[0.6rem] text-zinc-500">
              This is used in your public profile URL:{' '}
              <code className="text-zinc-300">
                /profile/{username || 'yourname'}
              </code>
            </p>
          </div>

          <div>
            <label className="block text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500 mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white h-24 resize-none focus:outline-none focus:border-zinc-500"
              placeholder="Short bio about you as a writer."
            />
          </div>

          {error && (
            <p className="text-[0.7rem] text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p className="text-[0.7rem] text-emerald-400">
              {success}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold tracking-[0.16em] uppercase hover:bg-zinc-100 transition disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <Link
              href={username ? `/profile/${username}` : '/'}
              className="text-[0.7rem] text-zinc-400 hover:text-zinc-200"
            >
              View public profile
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
