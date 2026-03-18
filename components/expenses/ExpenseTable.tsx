'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Expense } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CATEGORIES, CATEGORY_COLORS, type Category } from '@/lib/constants'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

interface ExpenseTableProps {
  expenses: Expense[]
  onDelete?: (id: number) => void
  onEdit?: (expense: Expense) => void
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return {
    value,
    label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  }
})

export function ExpenseTable({ expenses, onDelete, onEdit }: ExpenseTableProps) {
  const { data: session } = useSession()
  const isEditor = !!session

  const [filterCategory, setFilterCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const filtered = expenses
    .filter((e) => filterCategory === 'all' || e.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortDir === 'desc'
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date)
      }
      return sortDir === 'desc' ? b.amount - a.amount : a.amount - b.amount
    })

  const toggleSort = (col: 'date' | 'amount') => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          options={[
            { value: 'all', label: 'All Categories' },
            ...CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-52"
        />
        <span className="ml-auto text-sm text-[#555]">
          {filtered.length} expenses · {formatCurrency(total, true)} total
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-left">
              <th
                className="cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#555] hover:text-white"
                onClick={() => toggleSort('date')}
              >
                Date {sortBy === 'date' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#555]">
                Category
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#555]">
                Description
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#555] hover:text-white"
                onClick={() => toggleSort('amount')}
              >
                Amount {sortBy === 'amount' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              {isEditor && (
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#555]" />
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isEditor ? 5 : 4} className="px-4 py-10 text-center text-[#555]">
                  No expenses found.
                </td>
              </tr>
            ) : (
              filtered.map((expense) => (
                <tr key={expense.id} className="group hover:bg-[#1a1a1a]">
                  <td className="px-4 py-3 text-[#888]">{formatDate(expense.date)}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[expense.category as Category] ?? '#555',
                        }}
                      />
                      <span className="text-[#aaa]">{expense.subcategory}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white">
                    {expense.description || <span className="text-[#555]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-white">
                    {formatCurrency(expense.amount, true)}
                  </td>
                  {isEditor && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(expense)}
                          >
                            Edit
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this expense?')) onDelete(expense.id)
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
