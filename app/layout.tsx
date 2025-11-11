// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'screenplay.',
  description: 'Read and share original screenplays.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        {/* Global navbar */}
        <Navbar />

        {/* Full-width black background; content centered inside */}
        <main className="min-h-screen bg-black">
          <div className="max-w-6xl mx-auto px-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
