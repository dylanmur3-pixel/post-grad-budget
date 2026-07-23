'use client'

import { useState } from 'react'
import { CATEGORIES, SUBCATEGORIES, type Category } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import type { PendingExpense } from '@/lib/types'

interface ReviewTableProps {
  expenses: PendingExpense[]
  onConfirm: (id: number, category: string, subcategory: string) => Promise<void>
}

export function ReviewTable({ expenses, onConfirm }: ReviewTableProps) {
  const [picks, setPicks] = useState<Record<number, { category: Category; subcategory: string }>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  const getPick = (id: number) => picks[id] ?? { category: 'Food & Health' as Category, subcategory: '' }

  const setCategory = (id: number, category: Category) => {
    setPicks((p) => ({ ...p, [id]: { category, subcategory: '' } }))
  }

  const setSubcategory = (id: number, subcategory: string) => {
    setPicks((p) => ({ ...p, [id]: { ...getPick(id), subcategory } }))
  }

  const handleConfirm = async (id: number) => {
    const pick = getPick(id)
    if (!pick.subcategory) return
    setSavingId(id)
    await onConfirm(id, pick.category, pick.subcategory)
    setSavingId(null)
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-[#2a2a2a] py-12 text-center text-sm text-[#555]">
        Nothing to review — every imported charge is categorized.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2a2a2a] text-left">
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#555]">Date</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#555]">Merchant</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#555]">Amount</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#555]">Category</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#555]">Subcategory</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#555]" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a1a1a]">
          {expenses.map((expense) => {
            const pick = getPick(expense.id)
            return (
              <tr key={expense.id} className="hover:bg-[#1a1a1a]">
                <td className="px-4 py-3 text-[#888]">{formatDate(expense.date)}</td>
                <td className="px-4 py-3 text-white">
                  {expense.merchant_raw || expense.description || <span className="text-[#555]">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-white">
                  {formatCurrency(expense.amount, true)}
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={pick.category}
                    onChange={(e) => setCategory(expense.id, e.target.value as Category)}
                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                    className="w-44"
                  />
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={pick.subcategory}
                    onChange={(e) => setSubcategory(expense.id, e.target.value)}
                    placeholder="Select..."
                    options={SUBCATEGORIES[pick.category].map((s) => ({ value: s, label: s }))}
                    className="w-44"
                  />
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    disabled={!pick.subcategory || savingId === expense.id}
                    onClick={() => handleConfirm(expense.id)}
                  >
                    {savingId === expense.id ? 'Saving...' : 'Confirm'}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
