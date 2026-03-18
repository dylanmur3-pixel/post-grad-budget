import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/expenses — fetch all expenses (public)
// Query params: month_year=2026-06
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const monthYear = searchParams.get('month_year')

  let query = supabaseAdmin.from('expenses').select('*').order('date', { ascending: false })

  if (monthYear) {
    query = query.eq('month_year', monthYear)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

// POST /api/expenses — add new expense (editor only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { date, category, subcategory, description, amount, month_year } = body

  if (!date || !category || !subcategory || !amount || !month_year) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert({ date, category, subcategory, description, amount, month_year })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
