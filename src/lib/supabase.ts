import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tafgcmuvbhcqeizpcmou.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZmdjbXV2YmhjcWVpenBjbW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTYzODYsImV4cCI6MjA5Nzk5MjM4Nn0.xr3sU-lKQT3tgMcZ2uye_JCx_4363z-cCX7a0yoYXAA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const STORAGE_BUCKET = 'PEDIDOS'

/** Retorna a URL pública de um arquivo no bucket */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
