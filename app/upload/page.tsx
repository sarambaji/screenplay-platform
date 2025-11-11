// app/upload/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Mode = 'paste' | 'file'

export default function UploadPage() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [logline, setLogline] = useState('')
  const [genre, setGenre] = useState('')
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mode, setMode] = useState<Mode>('paste')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [userLoading, setUserLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // NEW: public/private toggle (private by default)
  const [isPublic, setIsPublic] = useState(false)

  // Load current user
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user ?? null)
      setUserLoading(false)
    }
    loadUser()
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setFileName(file.name)
    setSelectedFile(file)

    const lower = file.name.toLowerCase()
    const isTextLike =
      file.type === 'text/plain' ||
      lower.endsWith('.txt') ||
      lower.endsWith('.fountain')

    if (isTextLike) {
      try {
        const text = await file.text()
        setContent(text)
      } catch (err) {
        console.error(err)
        setError('Could not read that file. Try another format.')
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required.')
      return
    }

    if (mode === 'paste' && !content.trim()) {
      setError('Paste your script in the textbox.')
      return
    }

    if (mode === 'file' && !selectedFile) {
      setError('Upload a script file.')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('logline', logline)
      formData.append('genre', genre)
      formData.append('content', content)

      // send visibility preference
      formData.append('is_public', String(isPublic))

      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        formData.append('user_id', userData.user.id)
      }

      if (selectedFile) {
        formData.append('file', selectedFile)
      }

      const res = await fetch('/api/upload-script', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to publish script.')
        setLoading(false)
        return
      }

      router.push(`/scripts/${data.id}`)
    } catch (err) {
      console.error(err)
      setError('Network error. Try again.')
      setLoading(false)
    }
  }

  // Gate: must be logged in
  if (userLoading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Checking your session…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-zinc-300">
            You need an account to upload a screenplay.
          </p>
          <a
            href="/login"
            className="inline-block px-5 py-2.5 rounded-full bg-white text-black text-xs font-semibold tracking-[0.16em] uppercase hover:bg-zinc-100"
          >
            Sign in / Create account
          </a>
        </div>
      </main>
    )
  }

  // Main UI
  return (
    <main className="min-h-screen bg-black text-white py-10 flex justify-center">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <p className="text-[0.65rem] uppercase tracking-[0.25em] text-zinc-500">
            Upload Screenplay
          </p>
          <h1 className="text-3xl font-semibold mt-2">
            Share your story with confidence.
          </h1>
          {/* NEW reassurance line */}
          <p className="text-[0.7rem] text-zinc-500 mt-2 max-w-xl">
            Your screenplay is private by default. Only you can see it unless you choose
            to make it public. Each upload is stored securely with a server timestamp as
            proof of when it was added.{' '}
            <Link
              href="/policies"
              className="underline hover:text-zinc-300"
            >
              Learn more
            </Link>
            .
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/60"
              placeholder="e.g. MIDNIGHT MOTEL"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Logline */}
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Logline
            </label>
            <input
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/60"
              placeholder="One sentence that sells your story."
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
            />
          </div>

          {/* Genre */}
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Genre
            </label>
            <input
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/60"
              placeholder="e.g. Thriller, Drama, Sci-Fi"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            />
          </div>

          {/* Mode toggle */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.18em] text-zinc-500 flex items-center gap-1">
              Script Source
              <span className="text-red-400 text-[0.75rem] font-normal">*</span>
            </label>
            <div className="inline-flex rounded-full bg-zinc-950 border border-zinc-800 p-1 text-[0.7rem]">
              <button
                type="button"
                onClick={() => switchMode('paste')}
                className={`px-3 py-1.5 rounded-full transition ${
                  mode === 'paste'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Paste text
              </button>
              <button
                type="button"
                onClick={() => switchMode('file')}
                className={`px-3 py-1.5 rounded-full transition ${
                  mode === 'file'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Upload file
              </button>
            </div>
            <p className="text-[0.7rem] text-zinc-500">
              Choose one method. You can still edit the text after importing.
            </p>
          </div>

          {/* File mode */}
          {mode === 'file' && (
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Upload screenplay file
              </label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center px-3 py-2 text-xs rounded-full border border-zinc-700 bg-zinc-950 hover:bg-zinc-900 cursor-pointer">
                  <span className="mr-1.5">Choose file</span>
                  <input
                    type="file"
                    accept=".txt,.fountain,.fdx,.pdf,text/plain,application/pdf,application/xml"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {/* CHANGED: privacy-focused helper text */}
                <span className="text-[0.7rem] text-zinc-500">
                  Files are stored securely and remain private unless you make them public.
                </span>
              </div>
              {fileName && (
                <p className="text-[0.7rem] text-zinc-400">
                  Selected:{' '}
                  <span className="text-zinc-200">{fileName}</span>
                </p>
              )}
            </div>
          )}

          {/* Paste mode */}
          {mode === 'paste' && (
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Paste your script
              </label>
              <textarea
                className="w-full h-80 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono whitespace-pre-wrap leading-relaxed focus:outline-none focus:ring-1 focus:ring-white/60"
                placeholder={`FADE IN:\n\nINT. COFFEE SHOP - DAY\n...`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          )}

          {/* NEW: public toggle */}
          <label className="flex items-start gap-2 text-[0.7rem] text-zinc-400">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-[2px] w-3 h-3"
            />
            <span>
              Make this screenplay public and discoverable on the platform. Leave unchecked
              to keep it visible only to you.
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-400/5 border border-red-900/40 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-full bg-white text-black text-xs font-semibold tracking-[0.16em] uppercase hover:bg-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Publishing…' : 'Publish Script'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
