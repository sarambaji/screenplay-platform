import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { randomBytes } from 'crypto'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: scriptId } = params

  // ensure user owns the script
  const { data: script, error: scriptError } = await supabase
    .from('scripts')
    .select('id, user_id')
    .eq('id', scriptId)
    .single()

  if (scriptError || script.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const token = randomBytes(24).toString('hex')

  const { data, error } = await supabase
    .from('script_share_links')
    .insert({
      script_id: scriptId,
      token,
      created_by: user.id,
    })
    .select('token')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL
  return NextResponse.json({
    url: `${origin}/share/${data.token}`,
  })
}
