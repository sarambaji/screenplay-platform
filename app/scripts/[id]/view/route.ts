import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('script_views').insert({
    script_id: params.id,
    user_id: user?.id ?? null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
