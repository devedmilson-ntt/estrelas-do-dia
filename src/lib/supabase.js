import { createClient } from '@supabase/supabase-js'

// Valores em .env.local (desenvolvimento) e nas Environment Variables da Vercel.
// A chave é a "publishable" (anon) key — pode ficar no navegador; quem protege
// os dados são as regras de segurança (RLS) em supabase/schema.sql.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

export const supabase = url && key ? createClient(url, key) : null
