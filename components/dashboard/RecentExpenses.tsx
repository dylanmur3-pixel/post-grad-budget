import { Expense } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CATEGORY_COLORS, type Category } from '@/lib/constants'
import Link from 'next/link'

interface RecentExpensesProps {
  expenses: Expense[]
}

export function RecentExpenses({ expenses }: RecentExpensesProps) {
  if (expenses.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[#555]">
        No expenses logged yet.{' '}
        <Link href="/expenses/new" className="text-indigo-400 hover:text-indigo-300">
          Add your first one →
        </Link>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#1f1f1f]">
      {expenses.map((expense) => (
        <div key={expense.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            {/* Category color dot */}
            <div
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  CATEGORY_COLORS[expense.category as Category] ?? '#555',
              }}
            />
            <div>
              <p className="text-sm font-medium text-white">
                {expense.description || expense.subcategory}
              </p>
              <p className="text-xs text-[#555]">
                {expense.subcategory} · {formatDate(expense.date)}
              </p>
            </div>
          </div>
          <span className="tabular-nums text-sm font-medium text-white">
            {formatCurrency(expense.amount, true)}
          </span>
        </div>
      ))}
    </div>
  )
}
