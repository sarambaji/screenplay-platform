'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { GENRES } from '@/lib/scriptMeta'
import Link from 'next/link'

type ScriptCard = {
  id: string
  title: string
  logline: string | null
  genre: string | null
  upvotes_count: number | null
}

export default function ExplorePage() {
  const [genre, setGenre] = useState<string>('')
  const [scripts, setScripts] = useState<ScriptCard[]>([])

  useEffect(() => {
    ;(async () => {
      let query = supabase
        .from('scripts')
        .select('id, title, logline, genre, upvotes_count')
        .eq('is_public', true)

      if (genre) query = query.eq('genre', genre)

      query = query.order('upvotes_count', { ascending: false }).limit(30)

      const { data } = await query
      setScripts(data || [])
    })()
  }, [genre])

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Discover Scripts</h1>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setGenre('')}
          className={`px-3 py-1 rounded-full text-xs border ${
            !genre ? 'bg-black text-white' : ''
          }`}
        >
          All
        </button>
        {GENRES.map(g => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`px-3 py-1 rounded-full text-xs border ${
              genre === g ? 'bg-black text-white' : ''
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {scripts.map(s => (
          <Link
            key={s.id}
            href={`/scripts/${s.id}`}
            className="border rounded-lg p-3 flex justify-between items-start hover:bg-gray-50"
          >
            <div>
              <div className="text-sm font-semibold">{s.title}</div>
              {s.logline && (
                <div className="text-xs text-gray-700 mt-1 line-clamp-2">
                  {s.logline}
                </div>
              )}
              {s.genre && (
                <div className="text-[9px] uppercase text-gray-500 mt-1">
                  {s.genre}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">
                {s.upvotes_count || 0} votes
              </div>
            </div>
          </Link>
        ))}

        {scripts.length === 0 && (
          <div className="text-xs text-gray-500">
            No scripts yet. Once people start publishing, top stories will
            appear here.
          </div>
        )}
      </div>
    </div>
  )
}
