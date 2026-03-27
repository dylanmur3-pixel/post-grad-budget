'use client'

import { useEffect, useState, useMemo } from 'react'
import { KPICard } from '@/components/dashboard/KPICard'
import { PortfolioValueLine } from '@/components/charts/PortfolioValueLine'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PortfolioSummary, Holding, PortfolioSnapshot } from '@/lib/types'
import { cn } from '@/lib/utils'

type Range = '1W' | '1M' | '3M' | '6M' | 'YTD' | 'All'

const RANGES: Range[] = ['1W', '1M', '3M', '6M', 'YTD', 'All']

function filterHistory(history: PortfolioSnapshot[], range: Range): PortfolioSnapshot[] {
  if (range === 'All' || history.length === 0) return history
  const now = new Date()
  let cutoff: Date
  if (range === '1W') {
    cutoff = new Date(now); cutoff.setDate(now.getDate() - 7)
  } else if (range === '1M') {
    cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 1)
  } else if (range === '3M') {
    cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 3)
  } else if (range === '6M') {
    cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 6)
  } else {
    // YTD — Jan 1 of current year
    cutoff = new Date(now.getFullYear(), 0, 1)
  }
  const cutoffStr = cutoff.toISOString().split('T')[0]
  return history.filter((s) => s.date >= cutoffStr)
}

export default function InvestmentsPage() {
  const [data, setData] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<Range>('All')

  useEffect(() => {
    fetch('/api/investments')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load portfolio data')
        setLoading(false)
      })
  }, [])

  const filteredHistory = useMemo(
    () => (data ? filterHistory(data.history, range) : []),
    [data, range]
  )

  const today = new Date().toISOString().split('T')[0]
  const isPositive = data ? data.gainLoss >= 0 : true

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Investments</h1>
          <p className="text-sm text-[#555]">All-ETF portfolio · as of {formatDate(today)}</p>
        </div>
      </div>

      {loading && <div className="text-sm text-[#555]">Loading portfolio data...</div>}

      {error && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPICard
              label="Total Value"
              value={formatCurrency(data.currentValue, true)}
              subtext="current market value"
            />
            <KPICard
              label="Total Gain / Loss"
              value={`${isPositive ? '+' : ''}${formatCurrency(data.gainLoss, true)}`}
              trend={isPositive ? 'up' : 'down'}
              trendValue={`${isPositive ? '+' : ''}${data.returnPct.toFixed(2)}% since inception`}
              accent={isPositive ? 'text-emerald-400' : 'text-red-400'}
            />
            <KPICard
              label="Cost Basis"
              value={formatCurrency(data.costBasis, true)}
              subtext="total amount invested"
            />
          </div>

          {/* Portfolio Value Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Value Over Time</CardTitle>
              {/* Range filter buttons */}
              <div className="flex items-center gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      range === r
                        ? 'bg-indigo-600 text-white'
                        : 'text-[#666] hover:text-white hover:bg-[#2a2a2a]'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </CardHeader>
            {filteredHistory.length > 0 ? (
              <PortfolioValueLine data={filteredHistory} />
            ) : (
              <p className="py-12 text-center text-sm text-[#555]">
                No data for this range yet — history builds daily
              </p>
            )}
          </Card>

          {/* Holdings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Holdings</CardTitle>
              <span className="text-xs text-[#555]">Since inception · 15-min delayed prices</span>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    {['Ticker', 'Name', 'Shares', 'Buy Price', 'Current Price', 'Value', 'Gain/Loss $', 'Gain/Loss %'].map((h) => (
                      <th key={h} className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-wider text-[#555] last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.holdings.map((h: Holding) => {
                    const isUp = h.gainLoss >= 0
                    return (
                      <tr key={h.ticker} className="border-b border-[#1f1f1f] last:border-0">
                        <td className="py-3 pr-4 font-bold text-white">{h.ticker}</td>
                        <td className="py-3 pr-4 text-[#888]">{h.name}</td>
                        <td className="py-3 pr-4 tabular-nums text-white">{h.shares}</td>
                        <td className="py-3 pr-4 tabular-nums text-[#888]">{formatCurrency(h.buyPrice, true)}</td>
                        <td className="py-3 pr-4 tabular-nums text-white">{formatCurrency(h.currentPrice, true)}</td>
                        <td className="py-3 pr-4 tabular-nums text-white">{formatCurrency(h.currentValue, true)}</td>
                        <td className={cn('py-3 pr-4 tabular-nums font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
                          {isUp ? '+' : ''}{formatCurrency(h.gainLoss, true)}
                        </td>
                        <td className={cn('py-3 tabular-nums font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
                          {isUp ? '+' : ''}{h.gainLossPct.toFixed(2)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
