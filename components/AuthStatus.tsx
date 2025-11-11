'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  username: string | null
  avatar_url?: string | null
}

export function AuthStatus() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      setUser(user || null)

      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()

      setProfile(
        profileData
          ? {
              username: profileData.username,
              avatar_url: profileData.avatar_url,
            }
          : { username: null }
      )

      setLoading(false)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#auth-menu')) setMenuOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/login')
  }

  if (loading) {
    return (
      <span className="text-[0.65rem] text-zinc-400">
        Loading...
      </span>
    )
  }

  // Not logged in: same simple buttons
  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-[0.65rem] px-3 py-1 rounded border border-zinc-700 text-zinc-200 hover:bg-zinc-900"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="text-[0.65rem] px-3 py-1 rounded bg-zinc-100 text-black hover:bg-white"
        >
          Sign up
        </Link>
      </div>
    )
  }

  const username = profile?.username
  const label = username || user.email || 'Profile'

  return (
    <div id="auth-menu" className="relative">
      <button
        onClick={() => setMenuOpen((open) => !open)}
        className="flex items-center gap-2"
      >
        {/* Avatar / initial */}
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt="User avatar"
            className="w-7 h-7 rounded-full border border-zinc-700 object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[0.6rem] text-zinc-200">
            {label[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        <span className="hidden sm:inline text-[0.65rem] text-zinc-300 max-w-[90px] truncate">
          {label}
        </span>
      </button>

      {menuOpen && (
  <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-black border border-zinc-800 shadow-xl py-2 z-50">
    {username && (
      <Link
        href={`/profile/${username}`}
        className="block px-3 py-2 text-[0.7rem] text-zinc-200 hover:bg-zinc-900 rounded-t-2xl"
        onClick={() => setMenuOpen(false)}
      >
        View profile
      </Link>
    )}

    <Link
      href="/dashboard"
      className="block px-3 py-2 text-[0.7rem] text-zinc-200 hover:bg-zinc-900"
      onClick={() => setMenuOpen(false)}
    >
      Your stats
    </Link>

    <Link
      href="/settings"
      className="block px-3 py-2 text-[0.7rem] text-zinc-200 hover:bg-zinc-900"
      onClick={() => setMenuOpen(false)}
    >
      Profile settings
    </Link>

    <Link
      href="/upload"
      className="block px-3 py-2 text-[0.7rem] text-zinc-200 hover:bg-zinc-900"
      onClick={() => setMenuOpen(false)}
    >
      Upload screenplay
    </Link>

    <button
      onClick={handleLogout}
      className="w-full text-left px-3 py-2 text-[0.7rem] text-red-400 hover:bg-zinc-900 rounded-b-2xl"
    >
      Logout
    </button>
  </div>
)}
    </div>
  )
}
