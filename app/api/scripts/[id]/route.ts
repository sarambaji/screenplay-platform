import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { content } = await req.json()

    if (!id || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const { error } = await supabaseServer
      .from('scripts')
      .update({ content })
      .eq('id', id)

    if (error) {
      console.error(error)
      return NextResponse.json(
        { error: 'Failed to update script.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Unexpected error.' },
      { status: 500 }
    )
  }
}
