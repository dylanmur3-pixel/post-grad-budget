import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Parse a CSV string into rows of string arrays.
// Handles quoted fields that contain commas.
function parseCSV(text: string): string[][] {
  return text
    .trim()
    .split('\n')
    .map((line) => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    })
}

// Strip dollar signs, commas, and spaces before parsing a number.
function parseMoney(str: string): number {
  return parseFloat(str.replace(/[$,\s]/g, ''))
}

// GET /api/investments — fetch live portfolio data from Google Sheet + historical snapshots
export async function GET() {
  const csvUrl = process.env.PORTFOLIO_SHEET_CSV_URL
  if (!csvUrl) {
    return NextResponse.json({ error: 'PORTFOLIO_SHEET_CSV_URL is not set' }, { status: 500 })
  }

  // 1. Fetch the published Google Sheet CSV
  let csvText: string
  try {
    const res = await fetch(csvUrl, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Sheet returned ${res.status}`)
    csvText = await res.text()
  } catch (err) {
    return NextResponse.json({ error: 'Could not fetch portfolio sheet' }, { status: 502 })
  }

  // 2. Parse CSV — row 0 is the header, skip it and any totals/empty rows.
  // Only keep rows where column A looks like a ticker (short, no spaces, not a label).
  const rows = parseCSV(csvText)
  const dataRows = rows
    .slice(1)
    .filter((r) => r[0] && /^[A-Z]{1,5}$/.test(r[0].trim()))

  // Columns: Ticker(0) | Name(1) | Shares(2) | Buy Price(3) | Current Price(4)
  //          Current Value(5) | Gain/Loss $(6) | Gain/Loss %(7) | Cost Basis(8)
  let currentValue = 0
  let costBasis = 0
  const holdings = []

  for (const row of dataRows) {
    const val = parseMoney(row[5])
    const cost = parseMoney(row[8])
    if (!isNaN(val)) currentValue += val
    if (!isNaN(cost)) costBasis += cost
    holdings.push({
      ticker: row[0].trim(),
      name: row[1].trim(),
      shares: parseFloat(row[2]),
      buyPrice: parseMoney(row[3]),
      currentPrice: parseMoney(row[4]),
      currentValue: isNaN(val) ? 0 : val,
      gainLoss: parseMoney(row[6]),
      gainLossPct: Math.round(parseFloat(row[7]) * 10000) / 100,
      costBasis: isNaN(cost) ? 0 : cost,
    })
  }

  const gainLoss = currentValue - costBasis
  const returnPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

  // 3. Store today's snapshot in Supabase if not already saved
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabaseAdmin
    .from('portfolio_snapshots')
    .select('id')
    .eq('date', today)
    .maybeSingle()

  if (!existing && currentValue > 0) {
    await supabaseAdmin
      .from('portfolio_snapshots')
      .insert({ date: today, total_value: Math.round(currentValue * 100) / 100 })
  }

  // 4. Fetch all historical snapshots for the chart
  const { data: history, error: histError } = await supabaseAdmin
    .from('portfolio_snapshots')
    .select('date, total_value')
    .order('date', { ascending: true })

  if (histError) {
    return NextResponse.json({ error: histError.message }, { status: 500 })
  }

  return NextResponse.json(
    {
      currentValue: Math.round(currentValue * 100) / 100,
      costBasis: Math.round(costBasis * 100) / 100,
      gainLoss: Math.round(gainLoss * 100) / 100,
      returnPct: Math.round(returnPct * 100) / 100,
      history: history ?? [],
      holdings,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
