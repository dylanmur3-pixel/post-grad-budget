'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { BudgetVsActualBar } from '@/components/charts/BudgetVsActualBar'
import { formatCurrency, currentMonthYear, calcBudgetPct } from '@/lib/utils'
import { CATEGORIES, CATEGORY_COLORS, type Category } from '@/lib/constants'
import type { BudgetTarget, Expense } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function BudgetPage() {
  const { data: session } = useSession()
  const isEditor = !!session
  const monthYear = currentMonthYear()

  const [budgets, setBudgets] = useState<BudgetTarget[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const fetchData = async () => {
    const [budRes, expRes] = await Promise.all([
      fetch('/api/budget', { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/expenses?month_year=${monthYear}`, { cache: 'no-store' }).then((r) => r.json()),
    ])
    setBudgets(Array.isArray(budRes) ? budRes : [])
    setExpenses(Array.isArray(expRes) ? expRes : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const actualBySubcategory = expenses.reduce((acc, e) => {
    const key = `${e.category}::${e.subcategory}`
    acc[key] = (acc[key] ?? 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  const actualByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0)
    return acc
  }, {} as Record<string, number>)

  const budgetByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = budgets.filter((b) => b.category === cat).reduce((s, b) => s + b.monthly_target, 0)
    return acc
  }, {} as Record<string, number>)

  const handleSave = async (id: number) => {
    const value = parseFloat(editValue)
    if (isNaN(value) || value < 0) return

    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, monthly_target: value }),
      })
      const text = await res.text()
      const json = text ? JSON.parse(text) : {}
      if (!res.ok) {
        setSaveError(`Save failed (${res.status}): ${json.error ?? text ?? 'unknown error'}`)
      } else {
        setBudgets((prev) =>
          prev.map((b) => (b.id === id ? { ...b, monthly_target: value } : b))
        )
        setEditingId(null)
      }
    } catch (err: any) {
      setSaveError(`Network error: ${err.message}`)
    }
    setSaving(false)
  }

  const totalBudget = budgets.reduce((s, b) => s + b.monthly_target, 0)
  const totalActual = expenses.reduce((s, e) => s + e.amount, 0)

  const barData = CATEGORIES.map((cat) => ({
    category: cat,
    actual: actualByCategory[cat] ?? 0,
    budget: budgetByCategory[cat] ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Budget</h1>
        <p className="text-sm text-[#555]">Planned vs actual — click any target to edit</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs uppercase tracking-wider text-[#555]">Total Budget</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(totalBudget)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-[#555]">Spent This Month</p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', totalActual > totalBudget ? 'text-red-400' : 'text-white')}>
            {formatCurrency(totalActual)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-[#555]">Variance</p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', totalActual > totalBudget ? 'text-red-400' : 'text-emerald-400')}>
            {totalActual > totalBudget ? '-' : '+'}{formatCurrency(Math.abs(totalBudget - totalActual))}
          </p>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Category Overview</CardTitle>
        </CardHeader>
        <BudgetVsActualBar data={barData} />
      </Card>

      {saveError && (
        <div className="rounded bg-red-900/30 px-4 py-3 text-sm text-red-400">{saveError}</div>
      )}

      {/* Detailed table by category */}
      {loading ? (
        <div className="py-8 text-center text-[#555]">Loading...</div>
      ) : (
        CATEGORIES.map((cat) => {
          const catBudgets = budgets.filter((b) => b.category === cat)
          const catActual = actualByCategory[cat] ?? 0
          const catBudget = budgetByCategory[cat] ?? 0

          return (
            <Card key={cat}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                  />
                  <CardTitle>{cat}</CardTitle>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="tabular-nums text-white">{formatCurrency(catActual)}</span>
                  <span className="text-[#555]">/</span>
                  <span className="tabular-nums text-[#666]">{formatCurrency(catBudget)}</span>
                </div>
              </CardHeader>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2a2a] text-left">
                      <th className="pb-2 text-xs font-medium uppercase tracking-wider text-[#555]">
                        Subcategory
                      </th>
                      <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-[#555]">
                        Budget
                      </th>
                      <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-[#555]">
                        Actual
                      </th>
                      <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-[#555]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {catBudgets.map((b) => {
                      const actual = actualBySubcategory[`${cat}::${b.subcategory}`] ?? 0
                      const pct = calcBudgetPct(actual, b.monthly_target)
                      const isEditing = editingId === b.id

                      return (
                        <tr key={b.id} className="group">
                          <td className="py-3 font-medium text-white">{b.subcategory}</td>
                          <td className="py-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-28 text-right"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSave(b.id)}
                                  disabled={saving}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <button
                                className={cn(
                                  'tabular-nums text-white',
                                  isEditor && 'cursor-pointer hover:text-indigo-400'
                                )}
                                onClick={() => {
                                  if (!isEditor) return
                                  setEditingId(b.id)
                                  setEditValue(b.monthly_target.toString())
                                }}
                                title={isEditor ? 'Click to edit' : undefined}
                              >
                                {formatCurrency(b.monthly_target)}
                              </button>
                            )}
                          </td>
                          <td className="py-3 text-right tabular-nums text-white">
                            {formatCurrency(actual)}
                          </td>
                          <td className="py-3 text-right">
                            {pct === 0 ? (
                              <Badge variant="neutral">No spend</Badge>
                            ) : pct > 100 ? (
                              <Badge variant="red">Over 100%</Badge>
                            ) : pct === 100 ? (
                              <Badge variant="green">On budget</Badge>
                            ) : pct >= 85 ? (
                              <Badge variant="yellow">{pct}%</Badge>
                            ) : (
                              <Badge variant="green">{pct}%</Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
