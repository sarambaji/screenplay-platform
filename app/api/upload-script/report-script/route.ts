// app/api/report-script/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { scriptId, reason } = await req.json()

    if (!scriptId) {
      return NextResponse.json(
        { error: 'Missing scriptId' },
        { status: 400 }
      )
    }

    const { error } = await supabaseServer
      .from('script_reports')
      .insert({
        script_id: scriptId,
        reason: reason?.slice(0, 500) || null,
      })

    if (error) {
      console.error(error)
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    )
  }
}
