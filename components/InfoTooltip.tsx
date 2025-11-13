'use client'

import { Info } from 'lucide-react'

export default function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-block group">
      <Info className="w-3.5 h-3.5 text-zinc-500 ml-1 cursor-pointer group-hover:text-zinc-300" />

      <span className="
        absolute left-1/2 -translate-x-1/2 mt-1 
        hidden group-hover:block 
        whitespace-normal text-[0.65rem] leading-tight 
        bg-zinc-900 text-zinc-200 
        border border-zinc-800 
        rounded-md px-2 py-1 
        w-48 z-50 shadow-lg
      ">
        {text}
      </span>
    </span>
  )
}
