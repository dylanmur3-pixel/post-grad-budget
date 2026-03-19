'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate, currentMonthYear, formatMonth } from '@/lib/utils'
import { INCOME_SOURCES } from '@/lib/constants'
import type { Income } from '@/lib/types'

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

const SOURCE_OPTIONS = INCOME_SOURCES.map((s) => ({ value: s, label: s }))

export default function IncomePage() {
  const { data: session } = useSession()
  const isEditor = !!session

  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear())
  const [income, setIncome] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // Form state
  const [formDate, setFormDate] = useState('')
  const [formSource, setFormSource] = useState(INCOME_SOURCES[0])
  const [formAmount, setFormAmount] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formError, setFormError] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  const fetchIncome = async () => {
    setLoading(true)
    const res = await fetch(`/api/income?month_year=${selectedMonth}`, { cache: 'no-store' })
    const data = await res.json()
    setIncome(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchIncome()
  }, [selectedMonth])

  const totalIncome = income.reduce((s, i) => s + i.amount, 0)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormError('')

    const res = await fetch('/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: formDate,
        source: formSource,
        amount: parseFloat(formAmount),
        month_year: selectedMonth,
        notes: formNotes || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setFormError(data.error ?? 'Something went wrong.')
      setFormSubmitting(false)
      return
    }
    setIncome((prev) => [data, ...prev])
    setShowAddModal(false)
    setFormDate('')
    setFormSource(INCOME_SOURCES[0])
    setFormAmount('')
    setFormNotes('')
    setFormSubmitting(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this income entry?')) return
    await fetch(`/api/income/${id}`, { method: 'DELETE' })
    setIncome((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Income</h1>
          <p className="text-sm text-[#555]">Track what you actually bring in each month</p>
        </div>
        {isEditor && (
          <Button onClick={() => setShowAddModal(true)}>+ Add Income</Button>
        )}
      </div>

      {/* Month selector */}
      <Select
        options={getMonthOptions()}
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="w-52"
      />

      {/* Summary */}
      <Card>
        <p className="text-xs uppercase tracking-wider text-[#555]">Total Income — {formatMonth(selectedMonth)}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-400">
          {formatCurrency(totalIncome)}
        </p>
        {income.length > 0 && (
          <p className="mt-1 text-xs text-[#555]">{income.length} {income.length === 1 ? 'entry' : 'entries'}</p>
        )}
      </Card>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[#555]">Loading...</div>
      ) : income.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-[#555]">No income logged for {formatMonth(selectedMonth)}.</p>
            {isEditor && (
              <p className="mt-1 text-sm text-[#444]">Click "+ Add Income" to log an entry.</p>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Entries</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-left">
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-[#555]">Date</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-[#555]">Source</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-[#555]">Amount</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-[#555]">Notes</th>
                  {isEditor && <th className="pb-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {income.map((entry) => (
                  <tr key={entry.id} className="group hover:bg-[#1a1a1a]">
                    <td className="py-3 text-[#aaa]">{formatDate(entry.date)}</td>
                    <td className="py-3 font-medium text-white">{entry.source}</td>
                    <td className="py-3 text-right tabular-nums text-emerald-400 font-medium">
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="py-3 text-[#555]">{entry.notes ?? '—'}</td>
                    {isEditor && (
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-xs text-[#444] hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Income Modal */}
      <Modal isOpen={showAddModal} title="Add Income" onClose={() => { setShowAddModal(false); setFormError('') }}>
        <form onSubmit={handleAdd} className="space-y-4">
          {formError && (
            <p className="rounded bg-red-900/30 px-3 py-2 text-sm text-red-400">{formError}</p>
          )}
          <Input
            label="Date"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            required
          />
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#555]">Source</label>
            <Select
              options={SOURCE_OPTIONS}
              value={formSource}
              onChange={(e) => setFormSource(e.target.value as typeof formSource)}
            />
          </div>
          <Input
            label="Amount ($)"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            required
          />
          <Input
            label="Notes (optional)"
            type="text"
            placeholder="e.g. March paycheck"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
