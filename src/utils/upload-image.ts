import { supabase, STORAGE_BUCKET } from '../lib/supabase'

/**
 * Faz upload de um File para o Supabase Storage e retorna a URL pública.
 * O caminho segue o padrão: {orderId}/{contexto}/{nome-unico}.{ext}
 */
export async function uploadImage(
  file: File,
  orderId: string,
  context: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const path = `${orderId}/${context}/${unique}.${ext}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })

  if (error) throw new Error(`Erro ao fazer upload: ${error.message}`)

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Remove um arquivo do Supabase Storage a partir da sua URL pública.
 * Extrai o caminho relativo dentro do bucket.
 */
export async function deleteImage(publicUrl: string): Promise<void> {
  // A URL pública tem o formato:
  // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const marker = `/object/public/${STORAGE_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const path = publicUrl.slice(idx + marker.length)
  await supabase.storage.from(STORAGE_BUCKET).remove([path])
}

/** Verifica se um valor é uma URL do Supabase (não base64) */
export function isSupabaseUrl(value: string | null | undefined): boolean {
  if (!value) return false
  return value.startsWith('https://') && value.includes('supabase.co')
}
