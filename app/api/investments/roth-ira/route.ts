import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Fetch 1 year of daily closing prices for a ticker from Yahoo Finance.
// Returns raw adjclose history, the previous close, and the live market price.
// Split correction is intentionally NOT done here — it is applied later in the
// enrichedHoldings loop using the sheet's current price as the authoritative reference,
// since Yahoo's own regularMarketPrice can itself be stale on the day of a split.
async function fetchYahooData(ticker: string): Promise<{
  history: Array<{ ts: number; close: number }>
  previousClose: number | null
  marketPrice: number | null
}> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1y&interval=1d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    })
    if (!res.ok) return { history: [], previousClose: null, marketPrice: null }
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return { history: [], previousClose: null, marketPrice: null }

    const timestamps: number[] = result.timestamp ?? []
    const adjCloses: number[] = result.indicators?.adjclose?.[0]?.adjclose ?? []
    const rawCloses: number[] = result.indicators?.quote?.[0]?.close ?? []
    const closesToUse = adjCloses.length > 0 ? adjCloses : rawCloses

    const history = timestamps
      .map((t: number, i: number) => ({ ts: t, close: closesToUse[i] }))
      .filter((d) => d.close != null && !isNaN(d.close))

    const marketPrice: number | null = (result.meta?.regularMarketPrice ?? 0) > 0
      ? result.meta.regularMarketPrice
      : null

    const rawPrevClose: number | null = result.meta?.regularMarketPreviousClose ?? null
    const previousClose: number | null = rawPrevClose !== null
      ? rawPrevClose
      : history.length >= 2 ? history[history.length - 2].close : null

    return { history, previousClose, marketPrice }
  } catch {
    return { history: [], previousClose: null, marketPrice: null }
  }
}

// Return the most recent closing price at or before a target date.
function priceAtDate(history: Array<{ ts: number; close: number }>, target: Date): number | null {
  const targetTs = Math.floor(target.getTime() / 1000)
  const filtered = history.filter((d) => d.ts <= targetTs)
  if (filtered.length === 0) return null
  return filtered[filtered.length - 1].close
}

// Calculate gain/loss for a holding over a period given a historical reference price.
function calcPeriodReturn(
  shares: number,
  currentPrice: number,
  historicalPrice: number | null
): { gainLoss: number | null; gainLossPct: number | null } {
  if (historicalPrice === null || historicalPrice === 0) return { gainLoss: null, gainLossPct: null }
  const gl = (currentPrice - historicalPrice) * shares
  const glPct = ((currentPrice - historicalPrice) / historicalPrice) * 100
  return { gainLoss: Math.round(gl * 100) / 100, gainLossPct: Math.round(glPct * 100) / 100 }
}

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

// GET /api/investments/roth-ira — fetch live Roth IRA data from Google Sheet + historical snapshots
export async function GET() {
  const csvUrl = process.env.ROTH_IRA_SHEET_CSV_URL
  if (!csvUrl) {
    return NextResponse.json({ error: 'ROTH_IRA_SHEET_CSV_URL is not set' }, { status: 500 })
  }

  // 1. Fetch the published Google Sheet CSV
  let csvText: string
  try {
    const res = await fetch(csvUrl, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Sheet returned ${res.status}`)
    csvText = await res.text()
  } catch (err) {
    return NextResponse.json({ error: 'Could not fetch Roth IRA sheet' }, { status: 502 })
  }

  // 2. Parse CSV — row 0 is the header, skip it and any totals/empty rows.
  // Only keep rows where column A looks like a ticker (short, no spaces, not a label).
  const rows = parseCSV(csvText)
  const dataRows = rows
    .slice(1)
    .filter((r) => r[0] && /^[A-Z]{1,5}$/.test(r[0].trim()))

  // Columns: Ticker(0) | Name(1) | Shares(2) | Buy Price(3) | Current Price(4)
  //          Current Value(5) | Gain/Loss $(6) | Gain/Loss %(7) | Cost Basis(8)
  // NOTE: We compute gainLoss and costBasis from raw primitives (shares × buyPrice)
  // rather than reading the sheet's formula columns, which can be stale after a stock split.
  // We also use Yahoo Finance price as a fallback if the sheet's GOOGLEFINANCE formula returns 0.
  const holdingsRaw = dataRows.map((row) => {
    const shares = parseFloat(row[2])
    const buyPrice = parseMoney(row[3])
    const currentPriceFromSheet = parseMoney(row[4])
    const currentValueFromSheet = parseMoney(row[5])
    const costBasis = !isNaN(shares) && !isNaN(buyPrice) ? shares * buyPrice : 0
    return {
      ticker: row[0].trim(),
      name: row[1].trim(),
      shares: isNaN(shares) ? 0 : shares,
      buyPrice: isNaN(buyPrice) ? 0 : buyPrice,
      currentPriceFromSheet: isNaN(currentPriceFromSheet) ? 0 : currentPriceFromSheet,
      currentValueFromSheet: isNaN(currentValueFromSheet) ? 0 : currentValueFromSheet,
      costBasis,
      dateBought: (row[9] ?? '').trim(),
    }
  })

  // 3. Fetch Yahoo Finance price history for each holding in parallel.
  //    Done early so Yahoo prices can serve as fallback if the sheet's GOOGLEFINANCE returns 0.
  const yahooData = await Promise.all(
    holdingsRaw.map(async (h) => ({ ticker: h.ticker, ...(await fetchYahooData(h.ticker)) }))
  )
  const histMap = new Map(yahooData.map((r) => [r.ticker, r.history]))
  const prevCloseMap = new Map(yahooData.map((r) => [r.ticker, r.previousClose]))
  const marketPriceMap = new Map(yahooData.map((r) => [r.ticker, r.marketPrice]))

  // 4. Build final holdings. Use Yahoo's live price as fallback when sheet price is 0
  //    (happens when GOOGLEFINANCE formula is temporarily unavailable in the published CSV).
  let currentValue = 0
  let costBasis = 0
  const holdings = holdingsRaw.map((h) => {
    let currentPrice = h.currentPriceFromSheet
    if ((currentPrice === 0 || isNaN(currentPrice)) && marketPriceMap.get(h.ticker)) {
      currentPrice = marketPriceMap.get(h.ticker)!
    }
    const currentValueFinal = h.shares > 0 && currentPrice > 0
      ? Math.round(currentPrice * h.shares * 100) / 100
      : h.currentValueFromSheet
    const gainLoss = currentPrice > 0 && h.buyPrice > 0
      ? Math.round((currentPrice - h.buyPrice) * h.shares * 100) / 100
      : 0
    const gainLossPct = currentPrice > 0 && h.buyPrice > 0
      ? Math.round(((currentPrice - h.buyPrice) / h.buyPrice) * 100 * 100) / 100
      : 0
    currentValue += currentValueFinal
    if (h.costBasis > 0) costBasis += h.costBasis
    return {
      ticker: h.ticker,
      name: h.name,
      shares: h.shares,
      buyPrice: h.buyPrice,
      currentPrice,
      currentValue: currentValueFinal,
      gainLoss,
      gainLossPct,
      costBasis: h.costBasis,
      dateBought: h.dateBought,
    }
  })

  const gainLoss = currentValue - costBasis
  const returnPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

  // 5. Upsert today's snapshot — always update so a bad value saved earlier gets corrected.
  const today = new Date().toISOString().split('T')[0]

  if (currentValue > 0) {
    await supabaseAdmin
      .from('roth_ira_snapshots')
      .upsert({ date: today, total_value: Math.round(currentValue * 100) / 100 }, { onConflict: 'date' })
  }

  // 6. Backfill historical snapshots on first load (only 1 snapshot = table is new).
  //    Uses Yahoo Finance price history to reconstruct daily portfolio value going back
  //    to the earliest purchase date, so the chart shows accurate history immediately.
  const { count: snapshotCount } = await supabaseAdmin
    .from('roth_ira_snapshots')
    .select('id', { count: 'exact', head: true })

  if (snapshotCount !== null && snapshotCount <= 1) {
    const dateValueMap = new Map<string, number>()

    for (const { ticker, history: hist } of yahooData) {
      const holding = holdings.find((h) => h.ticker === ticker)
      if (!holding) continue
      const purchaseDate = holding.dateBought ? new Date(holding.dateBought + 'T00:00:00') : null

      for (const { ts, close } of hist) {
        const date = new Date(ts * 1000)
        // Skip dates before this holding was purchased
        if (purchaseDate && date < purchaseDate) continue
        const dateStr = date.toISOString().split('T')[0]
        dateValueMap.set(dateStr, (dateValueMap.get(dateStr) ?? 0) + holding.shares * close)
      }
    }

    const backfillRows = Array.from(dateValueMap.entries())
      .filter(([date]) => date !== today)
      .map(([date, total_value]) => ({ date, total_value: Math.round(total_value * 100) / 100 }))

    if (backfillRows.length > 0) {
      await supabaseAdmin
        .from('roth_ira_snapshots')
        .upsert(backfillRows, { onConflict: 'date' })
    }
  }

  // 7. Fetch all historical snapshots for the chart (after potential backfill)
  const { data: history, error: histError } = await supabaseAdmin
    .from('roth_ira_snapshots')
    .select('date, total_value')
    .order('date', { ascending: true })

  if (histError) {
    return NextResponse.json({ error: histError.message }, { status: 500 })
  }

  const now = new Date()
  // Reference date for each period: end-of-day on the target calendar date.
  const periodDates: Record<string, Date> = {
    '1W': (() => { const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(23, 59, 59); return d })(),
    '1M': (() => { const d = new Date(now); d.setMonth(d.getMonth() - 1); d.setHours(23, 59, 59); return d })(),
    '6M': (() => { const d = new Date(now); d.setMonth(d.getMonth() - 6); d.setHours(23, 59, 59); return d })(),
    'YTD': new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59), // Dec 31 of prior year
  }

  const enrichedHoldings = holdings.map((h) => {
    const hist = histMap.get(h.ticker) ?? []
    const previousClose = prevCloseMap.get(h.ticker) ?? null
    const purchaseDate = h.dateBought ? new Date(h.dateBought + 'T00:00:00') : null

    // Correct pre-split prices using the sheet's current price as the authoritative reference.
    // Yahoo's adjclose and previousClose can be partially or fully unadjusted on the day of
    // a split. We use h.currentPrice (from the sheet, always correct) to detect any price
    // that is clearly pre-split (>1.5x current) and divide by the implied integer ratio.
    const fixPrice = (price: number | null): number | null => {
      if (price === null || h.currentPrice <= 0) return price
      if (price > h.currentPrice * 1.5) {
        const ratio = Math.round(price / h.currentPrice)
        if (ratio >= 2 && ratio <= 20) return Math.round((price / ratio) * 10000) / 10000
      }
      return price
    }
    const correctedPreviousClose = fixPrice(previousClose)
    const correctedHist = hist.map((d) => {
      const fixed = fixPrice(d.close)
      return fixed !== null && fixed !== d.close ? { ...d, close: fixed } : d
    })

    const periodReturns: Record<string, { gainLoss: number | null; gainLossPct: number | null }> = {
      All: { gainLoss: h.gainLoss, gainLossPct: h.gainLossPct },
    }

    const yesterday = (() => { const d = new Date(now); d.setDate(d.getDate() - 1); return d })()
    if (purchaseDate && yesterday < purchaseDate) {
      periodReturns['1D'] = calcPeriodReturn(h.shares, h.currentPrice, h.buyPrice)
    } else {
      periodReturns['1D'] = calcPeriodReturn(h.shares, h.currentPrice, correctedPreviousClose)
    }

    for (const [range, date] of Object.entries(periodDates)) {
      if (purchaseDate && date < purchaseDate) {
        periodReturns[range] = calcPeriodReturn(h.shares, h.currentPrice, h.buyPrice)
      } else {
        const price = priceAtDate(correctedHist, date)
        periodReturns[range] = calcPeriodReturn(h.shares, h.currentPrice, price)
      }
    }
    return { ...h, periodReturns }
  })

  return NextResponse.json(
    {
      currentValue: Math.round(currentValue * 100) / 100,
      costBasis: Math.round(costBasis * 100) / 100,
      gainLoss: Math.round(gainLoss * 100) / 100,
      returnPct: Math.round(returnPct * 100) / 100,
      history: history ?? [],
      holdings: enrichedHoldings,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
