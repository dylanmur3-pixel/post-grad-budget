import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/assets — fetch all assets (public)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('assets')
    .select('*')
    .order('asset_type')
    .order('asset_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/assets — add new asset (editor only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { asset_name, asset_type, current_value, as_of_date, notes } = body

  if (!asset_name || !asset_type || current_value === undefined || !as_of_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('assets')
    .insert({ asset_name, asset_type, current_value, as_of_date, notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
