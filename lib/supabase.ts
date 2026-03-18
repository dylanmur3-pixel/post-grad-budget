import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Custom fetch that prevents Next.js from caching Supabase's internal requests
const noStoreFetch = (url: RequestInfo | URL, options: RequestInit = {}) =>
  fetch(url, { ...options, cache: 'no-store' })

// Public client — used for reads (browser-safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: noStoreFetch },
})

// Admin client — used for writes in API routes (server-side only, never exposed to browser)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  global: { fetch: noStoreFetch },
})
