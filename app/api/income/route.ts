import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/income — fetch income (public)
// Query params: month_year=2026-06
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const monthYear = searchParams.get('month_year')

  let query = supabaseAdmin.from('income').select('*').order('date', { ascending: false })
  if (monthYear) query = query.eq('month_year', monthYear)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

// Paycheck income sources that should also land in the checking account.
const PAYCHECK_SOURCES = ['Base Salary', 'Bonus']

// Nudge the BofA Checking balance by `delta` (positive to add, negative to reverse).
async function adjustCheckingBalance(delta: number) {
  const { data: checking } = await supabaseAdmin
    .from('assets')
    .select('id, current_value')
    .eq('asset_name', 'BofA Checking')
    .single()

  if (!checking) return

  await supabaseAdmin
    .from('assets')
    .update({
      current_value: Number(checking.current_value) + delta,
      as_of_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq('id', checking.id)
}

// POST /api/income — add income entry (editor only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, source, amount, month_year, notes } = body

  if (!date || !source || !amount || !month_year) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('income')
    .insert({ date, source, amount, month_year, notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (PAYCHECK_SOURCES.includes(source)) {
    await adjustCheckingBalance(amount)
  }

  return NextResponse.json(data, { status: 201 })
}
