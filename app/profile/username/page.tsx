// app/profile/[username]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ScriptCard from '@/components/ScriptCard'

type Profile = {
  id: string
  username: string | null
  bio: string | null
}

type Script = {
  id: string
  title: string
  logline: string | null
  genre: string | null
  created_at: string
  is_public?: boolean
}

export default function ProfilePage() {
  const params = useParams()
  const username = params?.username as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [publicScripts, setPublicScripts] = useState<Script[]>([])
  const [privateScripts, setPrivateScripts] = useState<Script[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!username) return

      // 1) Get profile for this username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, bio')
        .eq('username', username)
        .single()

      if (profileError || !profileData) {
        setLoading(false)
        return
      }

      setProfile(profileData as Profile)

      // 2) Get current auth user
      const { data: userData } = await supabase.auth.getUser()
      const authedUserId = userData?.user?.id ?? null
      const owner = authedUserId === profileData.id
      setIsOwner(!!owner)

      // 3) Public scripts for this profile (visible to everyone)
      const { data: publicData } = await supabase
        .from('scripts')
        .select('id, title, logline, genre, created_at, is_public')
        .eq('user_id', profileData.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      setPublicScripts((publicData as Script[]) || [])

      // 4) If viewer owns this profile, also load *all* scripts and split out private ones
      if (owner) {
        const { data: allData } = await supabase
          .from('scripts')
          .select('id, title, logline, genre, created_at, is_public')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false })

        if (allData) {
          const allScripts = allData as Script[]
          const priv = allScripts.filter((s) => !s.is_public)
          setPrivateScripts(priv)
        }
      }

      setLoading(false)
    }

    load()
  }, [username])

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <p className="text-sm text-slate-400">Loading profile...</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <p className="text-sm text-red-400">Profile not found.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10 space-y-6">
      {/* Header */}
      <div className="border border-slate-800 rounded-xl p-4">
        <h1 className="text-xl font-semibold">
          @{profile.username || 'unnamed'}
        </h1>
        {profile.bio && (
          <p className="mt-1 text-sm text-slate-300">
            {profile.bio}
          </p>
        )}

        {isOwner && (
          <p className="mt-2 text-[0.7rem] text-slate-500">
            This is your public profile. Only you can see your private drafts below.
          </p>
        )}
      </div>

      {/* Public scripts (everyone sees) */}
      <section>
        <h2 className="text-sm font-semibold mb-2">
          Public screenplays
        </h2>
        {publicScripts.length === 0 ? (
          <p className="text-xs text-slate-500">
            No public scripts yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {publicScripts.map((s) => (
              <ScriptCard
                key={s.id}
                id={s.id}
                title={s.title}
                logline={s.logline}
                genre={s.genre}
                created_at={s.created_at}
              />
            ))}
          </div>
        )}
      </section>

      {/* Private drafts (owner-only dashboard section) */}
      {isOwner && (
        <section>
          <h2 className="text-sm font-semibold mb-2">
            Your private drafts
          </h2>
          {privateScripts.length === 0 ? (
            <p className="text-xs text-slate-500">
              You don’t have any private drafts yet. Upload a screenplay and keep it private until you’re ready.
            </p>
          ) : (
            <div className="grid gap-3">
              {privateScripts.map((s) => (
                <ScriptCard
                  key={s.id}
                  id={s.id}
                  title={s.title}
                  logline={s.logline}
                  genre={s.genre}
                  created_at={s.created_at}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
