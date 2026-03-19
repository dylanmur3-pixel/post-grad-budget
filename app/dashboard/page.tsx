'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { KPICard } from '@/components/dashboard/KPICard'
import { BudgetProgress } from '@/components/dashboard/BudgetProgress'
import { RecentExpenses } from '@/components/dashboard/RecentExpenses'
import { BudgetVsActualBar } from '@/components/charts/BudgetVsActualBar'
import { CategoryDonut } from '@/components/charts/CategoryDonut'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { formatCurrency, currentMonthYear, formatMonth, calcSavingsRate } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'
import type { Expense, BudgetTarget, Asset, AppSettings } from '@/lib/types'

export default function DashboardPage() {
  const { data: session } = useSession()
  const isEditor = !!session

  const monthYear = currentMonthYear()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<BudgetTarget[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [incomeEntries, setIncomeEntries] = useState<{ amount: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [showTakeHomeModal, setShowTakeHomeModal] = useState(false)
  const [takeHomeInput, setTakeHomeInput] = useState('')
  const [takeHomeSubmitting, setTakeHomeSubmitting] = useState(false)
  const [takeHomeError, setTakeHomeError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/expenses?month_year=${monthYear}`).then((r) => r.json()),
      fetch('/api/budget').then((r) => r.json()),
      fetch('/api/assets').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
      fetch(`/api/income?month_year=${monthYear}`).then((r) => r.json()),
    ]).then(([exp, bud, ass, set, inc]) => {
      setExpenses(Array.isArray(exp) ? exp : [])
      setBudgets(Array.isArray(bud) ? bud : [])
      setAssets(Array.isArray(ass) ? ass : [])
      if (set && !set.error) setSettings(set)
      setIncomeEntries(Array.isArray(inc) ? inc : [])
      setLoading(false)
    })
  }, [monthYear])

  const expenseByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0)
    return acc
  }, {} as Record<string, number>)

  const budgetByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = budgets
      .filter((b) => b.category === cat)
      .reduce((sum, b) => sum + b.monthly_target, 0)
    return acc
  }, {} as Record<string, number>)

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const loggedIncome = incomeEntries.reduce((s, i) => s + i.amount, 0)
  const takeHome = settings?.monthly_take_home ?? 4805
  const effectiveIncome = loggedIncome > 0 ? loggedIncome : takeHome
  const remaining = effectiveIncome - totalExpenses
  const savingsRate = calcSavingsRate(effectiveIncome, totalExpenses)
  const netWorth = assets.reduce((s, a) => s + a.current_value, 0)

  const barData = CATEGORIES.map((cat) => ({
    category: cat,
    actual: expenseByCategory[cat] ?? 0,
    budget: budgetByCategory[cat] ?? 0,
  }))

  const donutData = CATEGORIES.map((cat) => ({
    category: cat,
    amount: expenseByCategory[cat] ?? 0,
  })).filter((d) => d.amount > 0)

  const recentExpenses = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  async function handleSaveTakeHome(e: React.FormEvent) {
    e.preventDefault()
    setTakeHomeSubmitting(true)
    setTakeHomeError('')
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthly_take_home: parseFloat(takeHomeInput) }),
    })
    const updated = await res.json()
    if (updated.error) {
      setTakeHomeError(`Error: ${updated.error}`)
      setTakeHomeSubmitting(false)
      return
    }
    setSettings(updated)
    setShowTakeHomeModal(false)
    setTakeHomeSubmitting(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-[#555]">{formatMonth(monthYear)}</p>
        </div>
        {isEditor && (
          <Link href="/expenses/new">
            <Button size="md">+ Add Expense</Button>
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="relative">
          <KPICard
            label="Monthly Income"
            value={formatCurrency(effectiveIncome)}
            subtext={loggedIncome > 0 ? 'from logged income' : 'estimated take-home'}
          />
          {isEditor && (
            <button
              onClick={() => { setTakeHomeInput(String(takeHome)); setShowTakeHomeModal(true) }}
              className="absolute right-3 top-3 rounded px-1.5 py-0.5 text-xs text-[#555] hover:bg-[#2a2a2a] hover:text-white"
            >
              Edit
            </button>
          )}
        </div>
        <KPICard
          label="Total Spent"
          value={formatCurrency(totalExpenses)}
          subtext={`of ${formatCurrency(budgets.reduce((s, b) => s + b.monthly_target, 0))} budgeted`}
        />
        <KPICard
          label="Remaining"
          value={formatCurrency(remaining)}
          accent={remaining < 0 ? 'text-red-400' : 'text-emerald-400'}
        />
        <KPICard
          label="Savings Rate"
          value={`${savingsRate}%`}
          subtext="this month"
          accent={savingsRate >= 25 ? 'text-emerald-400' : 'text-yellow-400'}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Budget vs Actual</CardTitle>
          </CardHeader>
          {loading ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-[#555]">
              Loading...
            </div>
          ) : (
            <BudgetVsActualBar data={barData} />
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending Mix</CardTitle>
          </CardHeader>
          {loading ? (
            <div className="flex h-[180px] items-center justify-center text-sm text-[#555]">
              Loading...
            </div>
          ) : (
            <CategoryDonut data={donutData} />
          )}
          <div className="mt-3 space-y-1">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center justify-between text-xs">
                <span className="text-[#888]">{cat.split(' ')[0]}</span>
                <span className="tabular-nums text-white">
                  {formatCurrency(expenseByCategory[cat] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Budget progress + Recent expenses */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category Progress</CardTitle>
            <Link href="/budget" className="text-xs text-indigo-400 hover:text-indigo-300">
              Manage →
            </Link>
          </CardHeader>
          <div className="space-y-5">
            {CATEGORIES.map((cat) => (
              <BudgetProgress
                key={cat}
                category={cat}
                actual={expenseByCategory[cat] ?? 0}
                budget={budgetByCategory[cat] ?? 0}
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <Link href="/expenses" className="text-xs text-indigo-400 hover:text-indigo-300">
              View all →
            </Link>
          </CardHeader>
          {loading ? (
            <div className="py-8 text-center text-sm text-[#555]">Loading...</div>
          ) : (
            <RecentExpenses expenses={recentExpenses} />
          )}
        </Card>
      </div>

      {/* Net Worth snapshot */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth</CardTitle>
          <Link href="/assets" className="text-xs text-indigo-400 hover:text-indigo-300">
            Manage assets →
          </Link>
        </CardHeader>
        <div className="flex items-end gap-4">
          <p className="text-4xl font-bold tabular-nums text-white">
            {formatCurrency(netWorth)}
          </p>
          <p className="mb-1 text-sm text-[#555]">total across all accounts</p>
        </div>
        {assets.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {assets.map((asset) => (
              <div key={asset.id} className="rounded-lg bg-[#111] p-3">
                <p className="text-xs text-[#555]">{asset.asset_type}</p>
                <p className="text-sm font-medium text-white">{asset.asset_name}</p>
                <p className="mt-1 tabular-nums text-lg font-semibold text-white">
                  {formatCurrency(asset.current_value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Take-Home Modal */}
      <Modal isOpen={showTakeHomeModal} title="Edit Monthly Take-Home" onClose={() => { setShowTakeHomeModal(false); setTakeHomeError('') }}>
        <form onSubmit={handleSaveTakeHome} className="space-y-4">
          {takeHomeError && (
            <p className="rounded bg-red-900/30 px-3 py-2 text-sm text-red-400">{takeHomeError}</p>
          )}
          <Input
            label="Monthly Take-Home ($)"
            type="text"
            inputMode="decimal"
            placeholder="4805.00"
            value={takeHomeInput}
            onChange={(e) => setTakeHomeInput(e.target.value)}
            required
          />
          <p className="text-xs text-[#555]">Your estimated net pay after taxes each month.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowTakeHomeModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={takeHomeSubmitting}>
              {takeHomeSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
