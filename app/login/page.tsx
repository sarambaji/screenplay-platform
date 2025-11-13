'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    setLoading(false)

    // after login, send them to their writer dashboard
    router.push('/scripts')
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-zinc-900 rounded-2xl bg-zinc-950/80 p-6">
        <h1 className="text-xl font-semibold mb-2">Welcome back</h1>
        <p className="text-xs text-zinc-400 mb-5">
          Log in to write, edit, and manage your scripts.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black border border-zinc-800 text-sm outline-none focus:border-zinc-500"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black border border-zinc-800 text-sm outline-none focus:border-zinc-500"
          />

          {error && (
            <p className="text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-3 py-2 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-4 text-[0.75rem] text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-zinc-100 underline">
            Sign up
          </Link>
        </p>

        <p className="mt-2 text-[0.7rem] text-zinc-500">
          Just here to read? You can{' '}
          <Link href="/discover" className="underline text-zinc-300">
            browse scripts without an account
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
