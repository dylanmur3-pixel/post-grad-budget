import { Card } from '@/components/ui/Card'
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import Link from 'next/link'

// This page is protected by middleware — only editors can reach it
export default function NewExpensePage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link href="/expenses" className="text-sm text-[#555] hover:text-white">
          ← Back to Expenses
        </Link>
      </div>

      <Card>
        <h1 className="mb-6 text-xl font-bold text-white">Add Expense</h1>
        <ExpenseForm />
      </Card>
    </div>
  )
}
