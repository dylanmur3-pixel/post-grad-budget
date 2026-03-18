import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, supabaseAdmin } from '@/lib/supabase'

// GET /api/budget — fetch all budget targets (public)
export async function GET() {
  const { data, error } = await supabase
    .from('budget_targets')
    .select('*')
    .order('category')
    .order('subcategory')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT /api/budget — update a budget target (editor only)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, monthly_target, notes } = body

  if (!id || monthly_target === undefined) {
    return NextResponse.json({ error: 'Missing id or monthly_target' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('budget_targets')
    .update({ monthly_target, notes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
