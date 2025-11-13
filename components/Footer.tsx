import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-zinc-900 mt-16 py-6 text-[0.75rem] text-zinc-500">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between px-6 gap-3">
        <p>© {new Date().getFullYear()} screenplay.beta</p>

        <div className="flex items-center gap-4">
          <Link href="/policies" className="hover:text-zinc-300">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
