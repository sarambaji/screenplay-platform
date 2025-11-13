'use client'

import { useEffect, useState } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

export default function ScrollButtons() {
  const [isVisible, setIsVisible] = useState(false)

  // Show buttons only after scrolling a bit
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Smooth scroll up
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Smooth scroll down (to bottom)
  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-center gap-3 z-50">
      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className="p-3 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 shadow-md"
      >
        <ArrowUp size={18} className="text-zinc-300" />
      </button>

      {/* Scroll to bottom */}
      <button
        onClick={scrollToBottom}
        aria-label="Scroll to bottom"
        className="p-3 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 shadow-md"
      >
        <ArrowDown size={18} className="text-zinc-300" />
      </button>
    </div>
  )
}
