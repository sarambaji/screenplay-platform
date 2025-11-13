// app/worlds/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type WorldPin = {
  id: string
  title: string
  type: string
  image_url: string | null
}

type WorldCard = {
  id: string
  title: string
  script_id: string
  script_title: string
  script_genre: string | null
  script_subgenre: string | null
  upvotes_count: number
  pins: WorldPin[]
}

export default function WorldsPage() {
  const [worlds, setWorlds] = useState<WorldCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [genreFilter, setGenreFilter] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        // 1) Get public scripts (with subgenre + votes)
        const { data: scriptsData, error: scriptsErr } = await supabase
          .from('scripts')
          .select('id, title, genre, subgenre, upvotes_count')
          .eq('is_public', true)

        if (scriptsErr) throw scriptsErr
        if (!scriptsData) {
          setWorlds([])
          setLoading(false)
          return
        }

        const scriptById = new Map(
          scriptsData.map((s) => [
            s.id,
            {
              id: s.id,
              title: s.title,
              genre: s.genre as string | null,
              subgenre: s.subgenre as string | null,
              upvotes_count: s.upvotes_count ?? 0,
            },
          ])
        )

        // 2) Fetch worldboards for those scripts
        const { data: worldboardsData, error: wbErr } = await supabase
          .from('worldboards')
          .select('id, script_id, title')
          .in('script_id', scriptsData.map((s) => s.id))

        if (wbErr) throw wbErr
        if (!worldboardsData || worldboardsData.length === 0) {
          setWorlds([])
          setLoading(false)
          return
        }

        // 3) Fetch pins
        const { data: pinsData, error: pinsErr } = await supabase
          .from('world_pins')
          .select('id, worldboard_id, title, type, image_url')
          .in(
            'worldboard_id',
            worldboardsData.map((w) => w.id)
          )

        if (pinsErr) throw pinsErr

        const pinsByWorld: Record<string, WorldPin[]> = {}
        ;(pinsData || []).forEach((p) => {
          if (!pinsByWorld[p.worldboard_id]) {
            pinsByWorld[p.worldboard_id] = []
          }
          // cap at ~6 to keep the collage tight
          if (pinsByWorld[p.worldboard_id].length < 6) {
            pinsByWorld[p.worldboard_id].push({
              id: p.id,
              title: p.title,
              type: p.type,
              image_url: p.image_url,
            })
          }
        })

        const assembled: WorldCard[] = worldboardsData
          .map((wb) => {
            const s = scriptById.get(wb.script_id)
            if (!s) return null
            if (genreFilter && s.genre !== genreFilter) return null

            return {
              id: wb.id,
              title: wb.title || s.title,
              script_id: s.id,
              script_title: s.title,
              script_genre: s.genre,
              script_subgenre: s.subgenre,
              upvotes_count: s.upvotes_count,
              pins: pinsByWorld[wb.id] || [],
            }
          })
          .filter(Boolean) as WorldCard[]

        // sort by votes
        assembled.sort(
          (a, b) =>
            (b.upvotes_count ?? 0) -
            (a.upvotes_count ?? 0)
        )

        setWorlds(assembled)
      } catch (e: any) {
        console.error(e)
        setError('Failed to load worlds.')
      } finally {
        setLoading(false)
      }
    })()
  }, [genreFilter])

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Worlds
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              A gallery of cinematic universes built on screenplay.beta —
              characters, locations, moods, and props pinned into living
              moodboards.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[0.65rem] text-zinc-400">
            <button
              onClick={() => setGenreFilter('')}
              className={`px-3 py-1 rounded-full border border-zinc-700 ${
                !genreFilter ? 'bg-white text-black' : ''
              }`}
            >
              All genres
            </button>
            {['Drama', 'Sci-Fi', 'Thriller', 'Romance'].map((g) => (
              <button
                key={g}
                onClick={() => setGenreFilter(g)}
                className={`px-3 py-1 rounded-full border border-zinc-800 hover:border-zinc-500 ${
                  genreFilter === g
                    ? 'bg-white text-black'
                    : 'text-zinc-300'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </header>

        {loading && (
          <p className="text-[0.8rem] text-zinc-500">
            Loading worlds…
          </p>
        )}

        {error && (
          <p className="text-[0.8rem] text-red-400">
            {error}
          </p>
        )}

        {!loading && !error && worlds.length === 0 && (
          <p className="text-[0.8rem] text-zinc-500">
            No worlds yet. Create a script, start a worldboard, and
            it’ll appear here.
          </p>
        )}

        {/* Masonry-ish grid */}
        {!loading && !error && worlds.length > 0 && (
          <section
            className="
              grid gap-4
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {worlds.map((world) => (
              <Link
                key={world.id}
                // ✅ open the worldboard tab on the script page
                href={`/scripts/${world.script_id}?tab=worldboard`}
                className="
                  group
                  relative
                  rounded-3xl
                  border border-zinc-900
                  bg-zinc-950/70
                  overflow-hidden
                  flex flex-col
                  hover:border-zinc-500
                  hover:bg-zinc-950
                  transition-colors
                "
              >
                {/* collage */}
                <div className="grid grid-cols-3 gap-1 p-2 h-40">
                  {renderPinsCollage(world.pins)}
                </div>

                {/* overlay gradient for mood */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80" />

                {/* text content */}
                <div className="relative z-10 px-4 pb-4 pt-10 mt-auto">
                  <p className="text-[0.6rem] uppercase tracking-[0.18em] text-zinc-400">
                    {world.script_genre ? (
                      <>
                        {world.script_genre}
                        {world.script_subgenre && (
                          <span className="text-zinc-500">
                            {' '}
                            — {world.script_subgenre}
                          </span>
                        )}
                      </>
                    ) : (
                      'Original world'
                    )}
                  </p>
                  <h2 className="text-sm font-semibold text-zinc-50 mt-1 line-clamp-1">
                    {world.title}
                  </h2>
                  <p className="text-[0.7rem] text-zinc-400 line-clamp-1">
                    from <span className="text-zinc-100">{world.script_title}</span>
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[0.6rem] text-zinc-500">
                    <span>
                      {world.upvotes_count}{' '}
                      {world.upvotes_count === 1 ? 'vote' : 'votes'}
                    </span>
                    <span className="text-zinc-400 group-hover:text-zinc-100">
                      View world →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

function renderPinsCollage(pins: WorldPin[]) {
  if (!pins || pins.length === 0) {
    // fallback abstract blocks
    return (
      <>
        <div className="col-span-2 rounded-2xl bg-zinc-800/60" />
        <div className="rounded-2xl bg-zinc-900/80" />
      </>
    )
  }

  const primary = pins[0]
  const secondary = pins.slice(1, 4)

  return (
    <>
      {/* big primary */}
      <div className="col-span-2 row-span-2 overflow-hidden rounded-2xl">
        {primary.image_url ? (
          <img
            src={primary.image_url}
            alt={primary.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800/70 flex items-end p-2 text-[0.55rem] text-zinc-300">
            {primary.title}
          </div>
        )}
      </div>

      {/* small tiles */}
      {secondary.map((pin) => (
        <div
          key={pin.id}
          className="overflow-hidden rounded-2xl"
        >
          {pin.image_url ? (
            <img
              src={pin.image_url}
              alt={pin.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900/80 flex items-center justify-center text-[0.5rem] text-zinc-400 text-center px-1">
              {pin.title}
            </div>
          )}
        </div>
      ))}
    </>
  )
}
