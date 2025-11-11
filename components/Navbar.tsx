'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

type Profile = {
  username: string | null
  avatar_url?: string | null
}

export default function Navbar() {
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
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#user-menu')) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/login')
  }

  const username = profile?.username || null

  return (
    <nav className="w-full border-b border-slate-800 bg-[#050505]/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: brand + nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-lg text-white">
            <span className="font-semibold">screenplay</span>
            <span className="text-slate-400">.beta</span>
          </Link>

          {/* Primary nav */}
          <Link
            href="/scripts"
            className="text-sm text-slate-300 hover:text-white"
          >
            Discover
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm text-slate-300 hover:text-white"
          >
            Leaderboard
          </Link>
          <Link
            href="/worlds"
            className="text-sm text-slate-300 hover:text-white"
          >
            Worlds
          </Link>

          {/* Actions */}
          <Link
            href="/upload"
            className="text-sm text-black bg-slate-100 px-3 py-1.5 rounded-full font-medium hover:bg-white transition"
          >
            Upload
          </Link>
        </div>

        {/* Right: auth / profile */}
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-xs text-slate-400">Loading...</span>
          ) : user ? (
            <div id="user-menu" className="relative">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2"
              >
                {/* Avatar */}
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="User avatar"
                    className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[0.7rem] text-slate-200">
                    {username
                      ? username[0]?.toUpperCase()
                      : user.email?.[0]?.toUpperCase() || '•'}
                  </div>
                )}

                {/* Label */}
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-[0.55rem] uppercase tracking-[0.16em] text-slate-500">
                    Writer
                  </span>
                  <span className="text-[0.7rem] text-slate-200 max-w-[110px] truncate">
                    {username || user.email || 'Profile'}
                  </span>
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#020817] border border-slate-800 shadow-xl py-2 z-50">
                  {username && (
                    <Link
                      href={`/profile/${username}`}
                      className="block px-3 py-2 text-[0.75rem] text-slate-200 hover:bg-slate-900 rounded-t-2xl"
                      onClick={() => setMenuOpen(false)}
                    >
                      View profile
                    </Link>
                  )}
                  {/* 🔹 My Scripts now goes to /dashboard */}
                  <Link
                    href="/my-scripts"
                    className="block px-3 py-2 text-[0.75rem] text-slate-200 hover:bg-slate-900"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Scripts
                  </Link>
                  <Link
                    href="/dashboard"
                    className="block px-3 py-2 text-[0.75rem] text-slate-200 hover:bg-slate-900"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-[0.75rem] text-red-400 hover:bg-slate-900 rounded-b-2xl"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs px-3 py-1 rounded border border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="text-xs px-3 py-1 rounded bg-slate-100 text-black hover:bg-white"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
