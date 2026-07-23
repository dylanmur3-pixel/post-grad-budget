'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { ReviewTable } from '@/components/expenses/ReviewTable'
import type { PendingExpense } from '@/lib/types'

export default function ReviewPage() {
  const { data: session, status } = useSession()
  const [expenses, setExpenses] = useState<PendingExpense[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPending = async () => {
    setLoading(true)
    const res = await fetch('/api/review')
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    if (session) fetchPending()
  }, [session])

  const handleConfirm = async (id: number, category: string, subcategory: string) => {
    const res = await fetch('/api/review', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, category, subcategory }),
    })
    if (res.ok) {
      setExpenses((prev) => prev.filter((e) => e.id !== id))
    }
  }

  if (status === 'loading') {
    return <div className="py-12 text-center text-sm text-[#555]">Loading...</div>
  }

  if (!session) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-sm text-[#555]">Log in as editor to review imported transactions.</p>
        <Link href="/login">
          <Button>Editor Login</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Review</h1>
        <p className="text-sm text-[#555]">
          Auto-imported card charges waiting for a category. Confirm one and you won&apos;t
          need to review that merchant again.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[#555]">Loading...</div>
      ) : (
        <ReviewTable expenses={expenses} onConfirm={handleConfirm} />
      )}
    </div>
  )
}
