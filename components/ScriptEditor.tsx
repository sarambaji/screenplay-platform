'use client'

import { useRef, useState } from 'react'

type ScriptEditorProps = {
  scriptId: string
  initialContent: string // this will be HTML or plain text from server
  canEdit: boolean
}

export function ScriptEditor({ scriptId, initialContent, canEdit }: ScriptEditorProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)

  // Normalize: if it's plain text, show it as preformatted
  const initialHtml =
    initialContent.trim().startsWith('<') || initialContent.includes('<p>')
      ? initialContent
      : initialContent
          .split('\n')
          .map((line) => line || '<br>')
          .join('<br>')

  // apply simple formatting using execCommand (works fine here)
  const applyFormat = (command: string, value?: string) => {
    if (!canEdit) return
    document.execCommand(command, false, value)
  }

  const handleSave = async () => {
    if (!canEdit || !editorRef.current) return
    setSaving(true)
    setError(null)
    try {
      const html = editorRef.current.innerHTML

      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: html }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => applyFormat('underline')}
            className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
          >
            U
          </button>
          <button
            type="button"
            onClick={() => applyFormat('insertParagraph')}
            className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
          >
            ¶
          </button>
          <button
            type="button"
            onClick={() => applyFormat('justifyLeft')}
            className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
          >
            Left
          </button>
          <button
            type="button"
            onClick={() => applyFormat('justifyCenter')}
            className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
          >
            Center
          </button>

          <div className="ml-auto flex items-center gap-2">
            {error && <span className="text-red-400">{error}</span>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 rounded bg-zinc-100 text-black text-xs font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        className={`
          bg-zinc-950 rounded-3xl p-6
          max-w-3xl mx-auto
          text-sm leading-relaxed tracking-tight
          font-mono
          text-zinc-100
          whitespace-pre-wrap
          outline-none
          ${canEdit ? 'min-h-[400px] cursor-text' : ''}
        `}
        contentEditable={canEdit}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      />
    </div>
  )
}
