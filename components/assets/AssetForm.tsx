'use client'

import { useState } from 'react'
import { ASSET_TYPES } from '@/lib/constants'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Asset } from '@/lib/types'

interface AssetFormProps {
  initialData?: Partial<Asset>
  onSuccess?: () => void
  onCancel?: () => void
}

export function AssetForm({ initialData, onSuccess, onCancel }: AssetFormProps) {
  const today = new Date().toISOString().split('T')[0]

  const [assetName, setAssetName] = useState(initialData?.asset_name ?? '')
  const [assetType, setAssetType] = useState(initialData?.asset_type ?? 'Cash')
  const [currentValue, setCurrentValue] = useState(initialData?.current_value?.toString() ?? '')
  const [asOfDate, setAsOfDate] = useState(initialData?.as_of_date ?? today)
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!assetName || !currentValue || !asOfDate) {
      setError('Name, value, and date are required.')
      return
    }

    const parsedValue = parseFloat(currentValue)
    if (isNaN(parsedValue) || parsedValue < 0) {
      setError('Value must be a non-negative number.')
      return
    }

    setLoading(true)

    const payload = {
      asset_name: assetName.trim(),
      asset_type: assetType,
      current_value: parsedValue,
      as_of_date: asOfDate,
      notes: notes.trim() || undefined,
    }

    try {
      const url = initialData?.id ? `/api/assets/${initialData.id}` : '/api/assets'
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

      if (onSuccess) onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="asset_name"
        label="Account / Asset Name"
        placeholder="e.g. Chase Checking, Fidelity Roth IRA"
        value={assetName}
        onChange={(e) => setAssetName(e.target.value)}
        required
      />

      <Select
        id="asset_type"
        label="Type"
        value={assetType}
        onChange={(e) => setAssetType(e.target.value as Asset['asset_type'])}
        options={ASSET_TYPES.map((t) => ({ value: t, label: t }))}
      />

      <Input
        id="current_value"
        label="Current Value ($)"
        type="number"
        placeholder="0.00"
        step="0.01"
        min="0"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        required
      />

      <Input
        id="as_of_date"
        label="As of Date"
        type="date"
        value={asOfDate}
        onChange={(e) => setAsOfDate(e.target.value)}
        required
      />

      <Input
        id="notes"
        label="Notes (optional)"
        placeholder="e.g. High-yield savings at 4.5% APY"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Saving...' : initialData?.id ? 'Update Asset' : 'Add Asset'}
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
