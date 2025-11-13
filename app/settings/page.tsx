// app/settings/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function SettingsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [emailMsg, setEmailMsg] = useState<string | null>(null)
  const [emailErr, setEmailErr] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr) {
        setError('Failed to load user.')
        setLoading(false)
        return
      }
      if (!user) {
        setLoading(false)
        router.replace('/login')
        return
      }

      setUserId(user.id)
      setEmail(user.email || '')
      setEmailVerifiedAt((user as any).email_confirmed_at || null)

      // Load (or create) profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('username, bio')
        .eq('id', user.id)
        .maybeSingle()

      if (profileErr) {
        console.error(profileErr)
        setError('Failed to load your profile.')
        setLoading(false)
        return
      }

      if (!profile) {
        const { error: createErr } = await supabase
          .from('profiles')
          .insert({ id: user.id, username: '', bio: '' })
        if (createErr) {
          console.error(createErr)
          setError('Could not initialize your profile.')
          setLoading(false)
          return
        }
        setUsername('')
        setBio('')
      } else {
        setUsername(profile.username || '')
        setBio(profile.bio || '')
      }

      setLoading(false)
    }
    load()
  }, [router])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSavingProfile(true)
    setError(null)
    setSuccess(null)

    const clean = username.trim()
    if (!clean) {
      setError('Username cannot be empty.')
      setSavingProfile(false)
      return
    }
    const ok = /^[a-zA-Z0-9._-]{2,32}$/.test(clean)
    if (!ok) {
      setError('Usernames must be 2–32 chars: letters, numbers, ., _, -')
      setSavingProfile(false)
      return
    }

    // ensure availability (case-insensitive)
    const { data: existing, error: checkErr } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', clean)
      .neq('id', userId)
      .maybeSingle()

    if (checkErr) {
      console.error(checkErr)
      setError('Could not verify username availability.')
      setSavingProfile(false)
      return
    }
    if (existing) {
      setError('That username is taken. Try another.')
      setSavingProfile(false)
      return
    }

    const { error: updErr } = await supabase
      .from('profiles')
      .update({ username: clean, bio: bio.trim() || null })
      .eq('id', userId)

    if (updErr) {
      console.error(updErr)
      if ((updErr as any).code === '23505') {
        setError('That username is taken. Try another.')
      } else {
        setError('Could not save changes.')
      }
    } else {
      setSuccess('Profile updated.')
    }
    setSavingProfile(false)
  }

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSavingEmail(true)
    setEmailErr(null)
    setEmailMsg(null)

    const clean = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(clean)) {
      setEmailErr('Enter a valid email.')
      setSavingEmail(false)
      return
    }

    const { data, error: updErr } = await supabase.auth.updateUser({ email: clean })
    if (updErr) {
      console.error(updErr)
      setEmailErr(updErr.message || 'Could not update email.')
      setSavingEmail(false)
      return
    }

    // If email didn’t actually change, just show success.
    if (data?.user?.email === clean) {
      setEmailMsg('Email saved.')
    } else {
      // Supabase usually sends a confirmation link when changing emails.
      setEmailMsg('Check your inbox to confirm your new email.')
    }
    // reflect verified timestamp if provided
    setEmailVerifiedAt((data?.user as any)?.email_confirmed_at || null)
    setSavingEmail(false)
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

  if (!userId) return null

  const isVerified = !!emailVerifiedAt

  return (
    <main className="min-h-screen bg-black text-white py-10">
      <div className="max-w-xl mx-auto px-6">
        <h1 className="text-2xl font-semibold mb-2">Profile settings</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Update how your writer profile appears on{' '}
          <span className="text-zinc-200">screenplay.beta</span>.
        </p>

        {/* EMAIL */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-2">Account email</h2>
          <form onSubmit={handleSaveEmail} className="space-y-3">
            <div>
              <label className="block text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                placeholder="you@example.com"
                autoComplete="email"
              />
              <p className="mt-1 text-[0.6rem]">
                {isVerified ? (
                  <span className="text-emerald-400">Verified</span>
                ) : (
                  <span className="text-amber-400">Not verified</span>
                )}
              </p>
            </div>

            {emailErr && <p className="text-[0.7rem] text-red-400">{emailErr}</p>}
            {emailMsg && <p className="text-[0.7rem] text-emerald-400">{emailMsg}</p>}

            <button
              type="submit"
              disabled={savingEmail}
              className="cursor-pointer px-4 py-2 rounded-full bg-white text-black text-xs font-semibold tracking-[0.16em] uppercase hover:bg-zinc-100 transition disabled:opacity-60"
            >
              {savingEmail ? 'Saving…' : 'Save email'}
            </button>
          </form>
        </section>

        {/* PROFILE (username/bio) */}
        <form onSubmit={handleSaveProfile} className="space-y-5">
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
              Public profile URL:{' '}
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

          {error && <p className="text-[0.7rem] text-red-400">{error}</p>}
          {success && <p className="text-[0.7rem] text-emerald-400">{success}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingProfile}
              className="cursor-pointer px-4 py-2 rounded-full bg-white text-black text-xs font-semibold tracking-[0.16em] uppercase hover:bg-zinc-100 transition disabled:opacity-60"
            >
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
            <Link
              href={username ? `/profile/${username}` : '/'}
              className="text-[0.7rem] text-zinc-400 hover:text-zinc-200"
            >
              View public profile
            </Link>
          </div>
        </form>

        {/* Danger zone */}
        <div className="mt-10 rounded-2xl border border-red-900/40 bg-red-950/20 p-4">
          <h2 className="font-medium text-red-400">Danger zone</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Permanently deletes your account, profile, scripts, comments, votes, and saves.
          </p>
          <DeleteAccount />
        </div>
      </div>
    </main>
  )
}

function DeleteAccount() {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onDelete = async () => {
    setErr(null)
    if (confirm !== 'DELETE') {
      setErr('Type DELETE to confirm.')
      return
    }
    setBusy(true)
    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      setErr(error.message)
      setBusy(false)
      return
    }
    await supabase.auth.signOut()
    router.replace('/goodbye?deleted=1')
  }

  return (
    <div className="mt-4 flex items-center gap-3">
      <input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Type DELETE to confirm"
        className="w-56 rounded-md bg-black/40 border border-zinc-800 px-3 py-2 text-sm outline-none"
      />
      <button
        onClick={onDelete}
        disabled={busy}
        className="cursor-pointer rounded-md px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50"
      >
        {busy ? 'Deleting…' : 'Delete my account'}
      </button>
      {err && <div className="text-sm text-red-400 ml-3">{err}</div>}
    </div>
  )
}
