import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/summaries — fetch monthly summaries for trends (public)
// Query params: months=6 (how many recent months)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const months = parseInt(searchParams.get('months') ?? '12')

  const { data, error } = await supabase
    .from('monthly_summaries')
    .select('*')
    .order('month_year', { ascending: false })
    .limit(months)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return in ascending order (oldest first) for charts
  return NextResponse.json((data ?? []).reverse())
}
