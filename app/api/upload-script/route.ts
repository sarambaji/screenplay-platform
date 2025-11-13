import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { createRequire } from 'module'

export const runtime = 'nodejs'

const require = createRequire(import.meta.url)

function parseFdxToText(xml: string): string {
  return xml
    .replace(/<\/?Paragraph[^>]*>/g, '\n')
    .replace(/<Text[^>]*>/g, '')
    .replace(/<\/Text>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const title = (formData.get('title') as string | null)?.trim()
    const logline = (formData.get('logline') as string | null)?.trim() || null
    const genre = (formData.get('genre') as string | null)?.trim() || null
    const bodyContent = (formData.get('content') as string | null) || ''
    const file = formData.get('file') as File | null
    const userId = (formData.get('user_id') as string | null) || null

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    }

    if (!file && !bodyContent.trim()) {
      return NextResponse.json(
        { error: 'Either paste your script or upload a file.' },
        { status: 400 }
      )
    }

    let content = bodyContent.trim()
    let filePath: string | null = null
    let originalFilename: string | null = null

    if (file) {
      const name = file.name
      const lower = name.toLowerCase()
      originalFilename = name

      const arrayBuffer = await file.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuffer)

      // Upload original file to Supabase
      const uploadPath = `scripts/${crypto.randomUUID()}-${name}`
      const { error: uploadError } = await supabaseServer.storage
        .from('scripts-files')
        .upload(uploadPath, fileBuffer, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error(uploadError)
        return NextResponse.json(
          { error: 'Failed to upload file.' },
          { status: 500 }
        )
      }

      filePath = uploadPath

      // Extract text by type
      if (lower.endsWith('.pdf')) {
        const mod = require('pdf-parse')
        const pdfParse =
          typeof mod === 'function'
            ? (mod as (b: Buffer) => Promise<{ text: string }>)
            : typeof mod.default === 'function'
            ? (mod.default as (b: Buffer) => Promise<{ text: string }>)
            : null

        if (!pdfParse) {
          console.error('Unexpected pdf-parse export shape:', mod)
          return NextResponse.json(
            {
              error:
                'PDF uploaded, but text extraction is temporarily unavailable.',
            },
            { status: 500 }
          )
        }

        const pdfData = await pdfParse(fileBuffer)
        content = (pdfData.text || '').trim()
      } else if (lower.endsWith('.fdx')) {
        content = parseFdxToText(fileBuffer.toString('utf-8'))
      } else if (
        lower.endsWith('.fountain') ||
        lower.endsWith('.txt') ||
        file.type === 'text/plain'
      ) {
        content = fileBuffer.toString('utf-8')
      } else {
        return NextResponse.json(
          {
            error:
              'Unsupported file type. Use .pdf, .txt, .fountain, or .fdx.',
          },
          { status: 400 }
        )
      }

      if (!content.trim()) {
        return NextResponse.json(
          {
            error:
              'We could not extract text from that file. Please paste your script or try another format.',
          },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabaseServer
      .from('scripts')
      .insert({
        title,
        logline,
        genre,
        content,
        user_id: userId,
        original_filename: originalFilename,
        file_path: filePath,
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error(error)
      return NextResponse.json(
        { error: 'Failed to save script.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ id: data.id }, { status: 200 })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Unexpected error processing upload.' },
      { status: 500 }
    )
  }
}
