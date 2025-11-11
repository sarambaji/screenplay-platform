// app/scripts/[id]/versions.ts
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Saves the current version of a script into the `script_versions` table.
 * Keeps a history of title, logline, genre, and content.
 */
export async function saveScriptVersion(
  supabase: SupabaseClient,
  scriptId: string
) {
  // 1. Get the current script
  const { data: script, error: scriptError } = await supabase
    .from('scripts')
    .select('id, title, logline, genre, content')
    .eq('id', scriptId)
    .single()

  if (scriptError || !script) {
    throw new Error('Script not found')
  }

  // 2. Get the latest version number
  const { data: last } = await supabase
    .from('script_versions')
    .select('version_number')
    .eq('script_id', scriptId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const version_number = (last?.version_number ?? 0) + 1

  // 3. Insert a new version snapshot
  const { error: insertError } = await supabase.from('script_versions').insert({
    script_id: scriptId,
    version_number,
    title: script.title,
    logline: script.logline,
    genre: script.genre,
    content: script.content,
  })

  if (insertError) {
    throw new Error('Failed to save script version')
  }

  console.log(`✅ Script ${scriptId} saved as version ${version_number}`)
}
