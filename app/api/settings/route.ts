import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/settings — fetch app settings (public)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

// PUT /api/settings — update app settings (editor only)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { monthly_take_home } = body

  if (monthly_take_home === undefined) {
    return NextResponse.json({ error: 'Missing monthly_take_home' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin.from('app_settings').select('id').limit(1).single()
  if (!existing) return NextResponse.json({ error: 'No settings row found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .update({ monthly_take_home, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
