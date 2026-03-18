'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { SpendingTrendLine } from '@/components/charts/SpendingTrendLine'
import { SavingsRateLine } from '@/components/charts/SavingsRateLine'
import { formatCurrency } from '@/lib/utils'
type TrendSummary = {
  month_year: string
  total_income: number
  total_expenses: number
  net_cashflow: number
  savings_rate: number
  housing_actual: number
  food_health_actual: number
  transport_actual: number
  investing_actual: number
}

const RANGE_OPTIONS = [
  { value: '3', label: 'Last 3 months' },
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
]

export default function TrendsPage() {
  const [summaries, setSummaries] = useState<TrendSummary[]>([])
  const [months, setMonths] = useState('6')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/trends?months=${months}`)
      .then((r) => r.json())
      .then((data) => {
        setSummaries(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [months])

  const avgSavingsRate =
    summaries.length > 0
      ? summaries.reduce((s, m) => s + m.savings_rate, 0) / summaries.length
      : 0

  const avgExpenses =
    summaries.length > 0
      ? summaries.reduce((s, m) => s + m.total_expenses, 0) / summaries.length
      : 0

  const totalSaved = summaries.reduce((s, m) => s + Math.max(m.net_cashflow, 0), 0)

  const hasData = summaries.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trends</h1>
          <p className="text-sm text-[#555]">Your financial progress over time</p>
        </div>
        <Select
          options={RANGE_OPTIONS}
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="w-44"
        />
      </div>

      {!hasData && !loading ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-[#555]">No trend data yet.</p>
            <p className="mt-1 text-sm text-[#444]">
              Add expenses to start seeing your trends here.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <p className="text-xs uppercase tracking-wider text-[#555]">Avg Savings Rate</p>
              <p className={`mt-1 text-3xl font-bold tabular-nums ${avgSavingsRate >= 25 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {avgSavingsRate.toFixed(1)}%
              </p>
              <p className="mt-0.5 text-xs text-[#555]">Target: 25%+</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wider text-[#555]">Avg Monthly Spend</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{formatCurrency(avgExpenses)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wider text-[#555]">Total Saved</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-400">
                {formatCurrency(totalSaved)}
              </p>
              <p className="mt-0.5 text-xs text-[#555]">net positive cashflow</p>
            </Card>
          </div>

          {/* Income vs Expenses line chart */}
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expenses</CardTitle>
            </CardHeader>
            {loading ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-[#555]">
                Loading...
              </div>
            ) : (
              <SpendingTrendLine data={summaries} />
            )}
          </Card>

          {/* Savings rate chart */}
          <Card>
            <CardHeader>
              <CardTitle>Savings Rate</CardTitle>
              <span className="text-xs text-[#555]">Dashed line = 25% target</span>
            </CardHeader>
            {loading ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-[#555]">
                Loading...
              </div>
            ) : (
              <SavingsRateLine data={summaries} />
            )}
          </Card>

          {/* Monthly breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle>Month-by-Month Breakdown</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2a] text-left">
                    <th className="pb-3 text-xs font-medium uppercase tracking-wider text-[#555]">Month</th>
                    <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-[#555]">Income</th>
                    <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-[#555]">Expenses</th>
                    <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-[#555]">Saved</th>
                    <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-[#555]">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {summaries.map((s) => (
                    <tr key={s.month_year} className="hover:bg-[#1a1a1a]">
                      <td className="py-3 font-medium text-white">{s.month_year}</td>
                      <td className="py-3 text-right tabular-nums text-[#aaa]">
                        {formatCurrency(s.total_income)}
                      </td>
                      <td className="py-3 text-right tabular-nums text-[#aaa]">
                        {formatCurrency(s.total_expenses)}
                      </td>
                      <td className={`py-3 text-right tabular-nums font-medium ${s.net_cashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {s.net_cashflow >= 0 ? '+' : ''}{formatCurrency(s.net_cashflow)}
                      </td>
                      <td className={`py-3 text-right tabular-nums font-medium ${s.savings_rate >= 25 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {s.savings_rate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
