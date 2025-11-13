// components/ScriptCard.tsx
import Link from 'next/link'

type ScriptCardProps = {
  id: string
  title: string
  logline: string | null
  genre: string | null
  authorUsername?: string | null
  created_at?: string
}

export default function ScriptCard({
  id,
  title,
  logline,
  genre,
  authorUsername,
  created_at,
}: ScriptCardProps) {
  return (
    <Link
      href={`/scripts/${id}`}
      className="block border border-slate-800 rounded-xl p-4 hover:border-slate-500 transition"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-lg">{title}</h3>
        {genre && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-slate-800 text-slate-200">
            {genre}
          </span>
        )}
      </div>
      {logline && (
        <p className="mt-1 text-sm text-slate-300 line-clamp-2">{logline}</p>
      )}
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
        {authorUsername && <span>by @{authorUsername}</span>}
        {created_at && (
          <span>{new Date(created_at).toLocaleDateString()}</span>
        )}
      </div>
    </Link>
  )
}
