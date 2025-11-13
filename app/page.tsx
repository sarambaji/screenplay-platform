// app/page.tsx
'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const featuredScripts = [
  {
    id: 'midnight-heist',
    title: 'The Midnight Heist',
    tag: 'Screenplay',
    color: 'from-zinc-900 to-zinc-800',
  },
  {
    id: 'untold-stories',
    title: 'Untold Stories',
    tag: 'Stage Play',
    color: 'from-red-900/80 to-black',
  },
  {
    id: 'parallel-lives',
    title: 'Parallel Lives',
    tag: 'TV Pilot',
    color: 'from-zinc-900 to-slate-900',
  },
  {
    id: 'city-of-glass',
    title: 'City of Glass',
    tag: 'Screenplay',
    color: 'from-slate-900 to-black',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-14">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight tracking-tight"
        >
          write the next
          <span className="block">great story</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-4 text-sm sm:text-base text-zinc-400 max-w-xl"
        >
          The home for visual storytelling. Write, share, and discover scripts across film, TV, games, animation, and more.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-8 flex gap-3 items-center"
        >
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-white text-black text-xs sm:text-sm font-medium px-5 py-2.5 hover:bg-zinc-100 hover:-translate-y-[1px] transition-transform"
          >
            Create a script
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center text-[0.7rem] sm:text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Browse scripts
          </Link>
        </motion.div>

        {/* Soft ambient bar under hero */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.18 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 h-px w-24 bg-gradient-to-r from-red-500/60 via-zinc-500/40 to-transparent"
        />
      </section>

      {/* Featured row (Netflix-ish, but for scripts) */}
      <section className="max-w-6xl mx-auto px-6 pb-14">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-medium text-zinc-200">
            Discover scripts on the verge
          </h2>
          <Link
            href="/scripts"
            className="text-[0.65rem] uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            view all
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {featuredScripts.map((script, index) => (
            <motion.div
              key={script.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 * index }}
              whileHover={{ y: -4, scale: 1.02 }}
              className={`relative min-w-[180px] max-w-[210px] h-60 rounded-2xl bg-gradient-to-br ${script.color} border border-zinc-800/80 flex flex-col justify-end p-3 cursor-pointer group`}
            >
              {/* play icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-black/40 border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="ml-[1px] inline-block w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[9px] border-l-white" />
                </div>
              </div>

              <div className="relative z-10">
                <p className="text-xs text-zinc-400">{script.tag}</p>
                <p className="text-sm font-semibold text-white leading-snug">
                  {script.title}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
<section className="max-w-5xl mx-auto px-6 pb-20">
  <h2 className="text-sm font-semibold text-zinc-200 mb-4">
    How it works
  </h2>
  <div className="grid gap-4 sm:grid-cols-3">
    {/* 01 · Upload */}
    <div className="border border-zinc-800 rounded-2xl p-4">
      <p className="text-[0.7rem] font-semibold text-zinc-300 mb-1">
        01 · Upload
      </p>
      <p className="text-[0.7rem] text-zinc-500">
        Create or upload your script in seconds
      </p>
    </div>

    {/* 02 · Build your world */}
    <div className="border border-zinc-800 rounded-2xl p-4">
      <p className="text-[0.7rem] font-semibold text-zinc-300 mb-1">
        02 · Build your world
      </p>
      <p className="text-[0.7rem] text-zinc-500">
        Create moodboards and playlists so your story feels alive
      </p>
    </div>

    {/* 03 · Be discovered */}
    <div className="border border-zinc-800 rounded-2xl p-4">
      <p className="text-[0.7rem] font-semibold text-zinc-300 mb-1">
        03 · Be discovered
      </p>
      <p className="text-[0.7rem] text-zinc-500">
        You never know who’s reading! Build a profile, track reads, and give your story a real audience
      </p>
    </div>
  </div>
</section>
    </main>
  )
}
