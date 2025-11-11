import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabaseServer'

export default async function SharePage({
  params,
}: {
  params: { token: string }
}) {
  // 1. Look up share link by token
  const { data: link, error: linkError } = await supabaseServer
    .from('script_share_links')
    .select('script_id, expires_at, can_comment')
    .eq('token', params.token)
    .single()

  if (linkError || !link) {
    notFound()
  }

  // Check expiration
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    notFound()
  }

  // 2. Fetch the linked script
  const { data: script, error: scriptError } = await supabaseServer
    .from('scripts')
    .select('title, content')
    .eq('id', link.script_id)
    .single()

  if (scriptError || !script) {
    notFound()
  }

  // 3. Render
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">{script.title}</h1>
      <p className="text-xs text-zinc-500 mb-4">
        Private share link{' '}
        {link.can_comment ? '・ Comments enabled' : '・ Read-only'}
      </p>
      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
        {script.content}
      </pre>
    </main>
  )
}
