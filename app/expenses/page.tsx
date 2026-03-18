'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ExpenseTable } from '@/components/expenses/ExpenseTable'
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import { currentMonthYear, formatMonth } from '@/lib/utils'
import type { Expense } from '@/lib/types'

// Generate last 12 months as options
function getMonthOptions() {
  const options = []
  for (let i = 0; i < 12; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    options.push({ value, label: formatMonth(value) })
  }
  return options
}

export default function ExpensesPage() {
  const { data: session } = useSession()
  const isEditor = !!session

  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear())
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const fetchExpenses = async () => {
    setLoading(true)
    const res = await fetch(`/api/expenses?month_year=${selectedMonth}`)
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchExpenses()
  }, [selectedMonth])

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) fetchExpenses()
  }

  const handleEditSuccess = () => {
    setEditingExpense(null)
    fetchExpenses()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-[#555]">All logged transactions</p>
        </div>
        {isEditor && (
          <Link href="/expenses/new">
            <Button>+ Add Expense</Button>
          </Link>
        )}
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Select
          options={getMonthOptions()}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-52"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[#555]">Loading expenses...</div>
      ) : (
        <ExpenseTable
          expenses={expenses}
          onDelete={isEditor ? handleDelete : undefined}
          onEdit={isEditor ? setEditingExpense : undefined}
        />
      )}

      {/* Edit modal */}
      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Edit Expense"
      >
        {editingExpense && (
          <ExpenseForm
            initialData={editingExpense}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingExpense(null)}
          />
        )}
      </Modal>
    </div>
  )
}
