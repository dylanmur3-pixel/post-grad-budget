import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Public client — used for reads (browser-safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client — used for writes in API routes (server-side only, never exposed to browser)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
