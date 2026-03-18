import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

// GET /api/trends — compute monthly summaries live from expenses + app_settings
// Query params: months=6
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const months = parseInt(searchParams.get('months') ?? '6')

  // Generate the last N month_year strings (e.g. ["2026-01", "2026-02", ...])
  const monthKeys: string[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthKeys.push(key)
  }

  const [expensesRes, settingsRes] = await Promise.all([
    supabase.from('expenses').select('*').in('month_year', monthKeys),
    supabase.from('app_settings').select('monthly_take_home').limit(1).single(),
  ])

  if (expensesRes.error) return NextResponse.json({ error: expensesRes.error.message }, { status: 500 })

  const expenses = expensesRes.data ?? []
  const monthly_take_home = settingsRes.data?.monthly_take_home ?? 4805

  const summaries = monthKeys.map((month_year) => {
    const monthExpenses = expenses.filter((e) => e.month_year === month_year)

    const total_expenses = monthExpenses.reduce((s, e) => s + e.amount, 0)
    const total_income = monthly_take_home
    const net_cashflow = total_income - total_expenses
    const savings_rate = total_income > 0 ? (net_cashflow / total_income) * 100 : 0

    const housing_actual = monthExpenses
      .filter((e) => e.category === 'Housing & Utilities')
      .reduce((s, e) => s + e.amount, 0)
    const food_health_actual = monthExpenses
      .filter((e) => e.category === 'Food & Health')
      .reduce((s, e) => s + e.amount, 0)
    const transport_actual = monthExpenses
      .filter((e) => e.category === 'Transport')
      .reduce((s, e) => s + e.amount, 0)
    const investing_actual = monthExpenses
      .filter((e) => e.category === 'Investing & Savings')
      .reduce((s, e) => s + e.amount, 0)

    return {
      month_year,
      total_income,
      total_expenses,
      net_cashflow,
      savings_rate,
      housing_actual,
      food_health_actual,
      transport_actual,
      investing_actual,
    }
  })

  // Only return months that have any expenses
  const withData = summaries.filter((s) => s.total_expenses > 0)

  return NextResponse.json(withData)
}
