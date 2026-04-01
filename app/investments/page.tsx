'use client'

import { useEffect, useState, useMemo } from 'react'
import { KPICard } from '@/components/dashboard/KPICard'
import { PortfolioValueLine } from '@/components/charts/PortfolioValueLine'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PortfolioSummary, Holding, PortfolioSnapshot } from '@/lib/types'
import { cn } from '@/lib/utils'

type Tab = 'overview' | 'etf' | 'roth'
type Range = '1W' | '1M' | '3M' | '6M' | 'YTD' | 'All'
type HoldingRange = '1D' | '1W' | '1M' | '6M' | 'YTD' | 'All'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'etf', label: 'ETF Portfolio' },
  { id: 'roth', label: 'Roth IRA' },
]

const RANGES: Range[] = ['1W', '1M', '3M', '6M', 'YTD', 'All']
const HOLDING_RANGES: HoldingRange[] = ['1D', '1W', '1M', '6M', 'YTD', 'All']

const HOLDING_RANGE_LABEL: Record<HoldingRange, string> = {
  '1D': '1 Day',
  '1W': '1 Week',
  '1M': '1 Month',
  '6M': '6 Months',
  'YTD': 'YTD',
  'All': 'All Time',
}

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

// Merge two history arrays by date, summing total_value on matching dates.
function mergeHistories(a: PortfolioSnapshot[], b: PortfolioSnapshot[]): PortfolioSnapshot[] {
  const map = new Map<string, number>()
  for (const s of a) map.set(s.date, (map.get(s.date) ?? 0) + s.total_value)
  for (const s of b) map.set(s.date, (map.get(s.date) ?? 0) + s.total_value)
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total_value]) => ({ date, total_value }))
}

function RangeButtons({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex items-center gap-1">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
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
  )
}

function HoldingRangeButtons({ range, onChange }: { range: HoldingRange; onChange: (r: HoldingRange) => void }) {
  return (
    <div className="flex items-center gap-1">
      {HOLDING_RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
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
  )
}

function HoldingsTable({ data }: { data: PortfolioSummary }) {
  const [holdingRange, setHoldingRange] = useState<HoldingRange>('All')
  return (
    <Card>
      <CardHeader>
        <CardTitle>Individual Holdings</CardTitle>
        <HoldingRangeButtons range={holdingRange} onChange={setHoldingRange} />
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {['Ticker', 'Name', 'Shares', 'Buy Price', 'Current Price', 'Value', `${HOLDING_RANGE_LABEL[holdingRange]} Gain $`, `${HOLDING_RANGE_LABEL[holdingRange]} Gain %`].map((h) => (
                <th key={h} className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-wider text-[#555] last:pr-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.holdings.map((h: Holding) => {
              const period = h.periodReturns?.[holdingRange]
              const gl = period?.gainLoss ?? null
              const glPct = period?.gainLossPct ?? null
              const isUp = gl !== null ? gl >= 0 : true
              return (
                <tr key={h.ticker} className="border-b border-[#1f1f1f] last:border-0">
                  <td className="py-3 pr-4 font-bold text-white">{h.ticker}</td>
                  <td className="py-3 pr-4 text-[#888]">{h.name}</td>
                  <td className="py-3 pr-4 tabular-nums text-white">{h.shares}</td>
                  <td className="py-3 pr-4 tabular-nums text-[#888]">{formatCurrency(h.buyPrice, true)}</td>
                  <td className="py-3 pr-4 tabular-nums text-white">{formatCurrency(h.currentPrice, true)}</td>
                  <td className="py-3 pr-4 tabular-nums text-white">{formatCurrency(h.currentValue, true)}</td>
                  <td className={cn('py-3 pr-4 tabular-nums font-medium', gl === null ? 'text-[#555]' : isUp ? 'text-emerald-400' : 'text-red-400')}>
                    {gl === null ? 'N/A' : `${isUp ? '+' : ''}${formatCurrency(gl, true)}`}
                  </td>
                  <td className={cn('py-3 tabular-nums font-medium', glPct === null ? 'text-[#555]' : isUp ? 'text-emerald-400' : 'text-red-400')}>
                    {glPct === null ? 'N/A' : `${isUp ? '+' : ''}${glPct.toFixed(2)}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            {(() => {
              const validHoldings = data.holdings.filter((h: Holding) => h.periodReturns?.[holdingRange]?.gainLoss != null)
              const totalGl = validHoldings.reduce((sum: number, h: Holding) => sum + (h.periodReturns[holdingRange].gainLoss ?? 0), 0)
              const totalStartValue = validHoldings.reduce((sum: number, h: Holding) => sum + (h.currentValue - (h.periodReturns[holdingRange].gainLoss ?? 0)), 0)
              const totalGlPct = totalStartValue > 0 ? (totalGl / totalStartValue) * 100 : 0
              const isUp = totalGl >= 0
              return (
                <tr className="border-t-2 border-[#2a2a2a]">
                  <td className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-[#555]">Total</td>
                  <td colSpan={4} />
                  <td className="py-3 pr-4 tabular-nums font-semibold text-white">{formatCurrency(data.currentValue, true)}</td>
                  <td className={cn('py-3 pr-4 tabular-nums font-semibold', isUp ? 'text-emerald-400' : 'text-red-400')}>
                    {isUp ? '+' : ''}{formatCurrency(totalGl, true)}
                  </td>
                  <td className={cn('py-3 tabular-nums font-semibold', isUp ? 'text-emerald-400' : 'text-red-400')}>
                    {isUp ? '+' : ''}{totalGlPct.toFixed(2)}%
                  </td>
                </tr>
              )
            })()}
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

function PortfolioView({
  data,
  loading,
  error,
  chartTitle,
}: {
  data: PortfolioSummary | null
  loading: boolean
  error: string | null
  chartTitle: string
}) {
  const [range, setRange] = useState<Range>('All')

  const filteredHistory = useMemo(
    () => (data ? filterHistory(data.history, range) : []),
    [data, range]
  )

  const isPositive = data ? data.gainLoss >= 0 : true

  return (
    <div className="space-y-6">
      {loading && <div className="text-sm text-[#555]">Loading portfolio data...</div>}
      {error && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}
      {data && (
        <>
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

          <Card>
            <CardHeader>
              <CardTitle>{chartTitle}</CardTitle>
              <RangeButtons range={range} onChange={setRange} />
            </CardHeader>
            {filteredHistory.length > 0 ? (
              <PortfolioValueLine data={filteredHistory} />
            ) : (
              <p className="py-12 text-center text-sm text-[#555]">
                No data for this range yet — history builds daily
              </p>
            )}
          </Card>

          <HoldingsTable data={data} />
        </>
      )}
    </div>
  )
}

export default function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const [etfData, setEtfData] = useState<PortfolioSummary | null>(null)
  const [etfLoading, setEtfLoading] = useState(true)
  const [etfError, setEtfError] = useState<string | null>(null)

  const [rothData, setRothData] = useState<PortfolioSummary | null>(null)
  const [rothLoading, setRothLoading] = useState(true)
  const [rothError, setRothError] = useState<string | null>(null)

  const [overviewRange, setOverviewRange] = useState<Range>('All')

  useEffect(() => {
    Promise.all([
      fetch('/api/investments').then((r) => r.json()),
      fetch('/api/investments/roth-ira').then((r) => r.json()),
    ]).then(([etf, roth]) => {
      if (etf.error) setEtfError(etf.error)
      else setEtfData(etf)
      setEtfLoading(false)

      if (roth.error) setRothError(roth.error)
      else setRothData(roth)
      setRothLoading(false)
    }).catch(() => {
      setEtfError('Failed to load ETF portfolio data')
      setEtfLoading(false)
      setRothError('Failed to load Roth IRA data')
      setRothLoading(false)
    })
  }, [])

  const combinedHistory = useMemo(() => {
    if (!etfData && !rothData) return []
    return mergeHistories(etfData?.history ?? [], rothData?.history ?? [])
  }, [etfData, rothData])

  const filteredCombinedHistory = useMemo(
    () => filterHistory(combinedHistory, overviewRange),
    [combinedHistory, overviewRange]
  )

  const combinedValue = (etfData?.currentValue ?? 0) + (rothData?.currentValue ?? 0)
  const combinedCostBasis = (etfData?.costBasis ?? 0) + (rothData?.costBasis ?? 0)
  const combinedGainLoss = (etfData?.gainLoss ?? 0) + (rothData?.gainLoss ?? 0)
  const combinedReturnPct = combinedCostBasis > 0 ? (combinedGainLoss / combinedCostBasis) * 100 : 0
  const combinedIsPositive = combinedGainLoss >= 0

  const today = new Date().toISOString().split('T')[0]
  const overviewLoading = etfLoading || rothLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Investments</h1>
          <p className="text-sm text-[#555]">as of {formatDate(today)}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[#2a2a2a] pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-[#666] hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {overviewLoading && <div className="text-sm text-[#555]">Loading portfolio data...</div>}
          {!overviewLoading && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KPICard
                  label="Total Value"
                  value={formatCurrency(combinedValue, true)}
                  subtext="across all accounts"
                />
                <KPICard
                  label="Total Gain / Loss"
                  value={`${combinedIsPositive ? '+' : ''}${formatCurrency(combinedGainLoss, true)}`}
                  trend={combinedIsPositive ? 'up' : 'down'}
                  trendValue={`${combinedIsPositive ? '+' : ''}${combinedReturnPct.toFixed(2)}% since inception`}
                  accent={combinedIsPositive ? 'text-emerald-400' : 'text-red-400'}
                />
                <KPICard
                  label="Cost Basis"
                  value={formatCurrency(combinedCostBasis, true)}
                  subtext="total amount invested"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Combined Portfolio Value</CardTitle>
                  <RangeButtons range={overviewRange} onChange={setOverviewRange} />
                </CardHeader>
                {filteredCombinedHistory.length > 0 ? (
                  <PortfolioValueLine data={filteredCombinedHistory} />
                ) : (
                  <p className="py-12 text-center text-sm text-[#555]">
                    No data for this range yet — history builds daily
                  </p>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* ETF Portfolio tab */}
      {activeTab === 'etf' && (
        <PortfolioView
          data={etfData}
          loading={etfLoading}
          error={etfError}
          chartTitle="ETF Portfolio Value"
        />
      )}

      {/* Roth IRA tab */}
      {activeTab === 'roth' && (
        <PortfolioView
          data={rothData}
          loading={rothLoading}
          error={rothError}
          chartTitle="Roth IRA Value"
        />
      )}
    </div>
  )
}
