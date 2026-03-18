'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, SUBCATEGORIES, type Category } from '@/lib/constants'
import { toMonthYear } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Expense } from '@/lib/types'

interface ExpenseFormProps {
  initialData?: Partial<Expense>
  onSuccess?: () => void
  onCancel?: () => void
}

export function ExpenseForm({ initialData, onSuccess, onCancel }: ExpenseFormProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(initialData?.date ?? today)
  const [category, setCategory] = useState<Category>(
    (initialData?.category as Category) ?? 'Food & Health'
  )
  const [subcategory, setSubcategory] = useState(initialData?.subcategory ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [amount, setAmount] = useState(initialData?.amount?.toString() ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset subcategory when category changes
  const handleCategoryChange = (value: string) => {
    setCategory(value as Category)
    setSubcategory('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!date || !category || !subcategory || !amount) {
      setError('Date, category, subcategory, and amount are required.')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.')
      return
    }

    setLoading(true)

    const payload = {
      date,
      category,
      subcategory,
      description: description.trim() || undefined,
      amount: parsedAmount,
      month_year: toMonthYear(date),
    }

    try {
      const url = initialData?.id ? `/api/expenses/${initialData.id}` : '/api/expenses'
      const method = initialData?.id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong.')
        return
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/expenses')
        router.refresh()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="date"
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <Select
        id="category"
        label="Category"
        value={category}
        onChange={(e) => handleCategoryChange(e.target.value)}
        options={CATEGORIES.map((c) => ({ value: c, label: c }))}
      />

      <Select
        id="subcategory"
        label="Subcategory"
        value={subcategory}
        onChange={(e) => setSubcategory(e.target.value)}
        placeholder="Select subcategory"
        options={SUBCATEGORIES[category].map((s) => ({ value: s, label: s }))}
      />

      <Input
        id="description"
        label="Description (optional)"
        type="text"
        placeholder="e.g. Trader Joe's weekly shop"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <Input
        id="amount"
        label="Amount ($)"
        type="number"
        placeholder="0.00"
        step="0.01"
        min="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Saving...' : initialData?.id ? 'Update Expense' : 'Add Expense'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
