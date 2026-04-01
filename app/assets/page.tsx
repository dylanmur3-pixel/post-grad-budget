'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { AssetForm } from '@/components/assets/AssetForm'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ASSET_TYPES } from '@/lib/constants'
import type { Asset } from '@/lib/types'

const assetTypeBadge: Record<string, 'indigo' | 'green' | 'yellow'> = {
  Cash: 'indigo',
  Investment: 'green',
  Retirement: 'yellow',
}

// Auto-tracked investment accounts pulled live from the investments APIs.
// These are read-only and never stored in the assets table.
const AUTO_TRACKED = [
  { name: 'ETF Portfolio', type: 'Investment' as const, apiPath: '/api/investments' },
  { name: 'Roth IRA', type: 'Retirement' as const, apiPath: '/api/investments/roth-ira' },
]

export default function AssetsPage() {
  const { data: session } = useSession()
  const isEditor = !!session

  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)

  // Live values for auto-tracked investment accounts
  const [autoValues, setAutoValues] = useState<Record<string, number | null>>({
    'ETF Portfolio': null,
    'Roth IRA': null,
  })

  const fetchAll = async () => {
    const [assetsRes, etfRes, rothRes] = await Promise.all([
      fetch('/api/assets').then((r) => r.json()),
      fetch('/api/investments').then((r) => r.json()).catch(() => null),
      fetch('/api/investments/roth-ira').then((r) => r.json()).catch(() => null),
    ])

    setAssets(Array.isArray(assetsRes) ? assetsRes : [])
    setAutoValues({
      'ETF Portfolio': typeof etfRes?.currentValue === 'number' ? etfRes.currentValue : null,
      'Roth IRA': typeof rothRes?.currentValue === 'number' ? rothRes.currentValue : null,
    })
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this asset?')) return
    await fetch(`/api/assets/${id}`, { method: 'DELETE' })
    setAssets((prev) => prev.filter((a) => a.id !== id))
  }

  // Sum manual assets + auto-tracked investment accounts
  const autoTotal = Object.values(autoValues).reduce<number>((s, v) => s + (v ?? 0), 0)
  const totalNetWorth = assets.reduce((s, a) => s + a.current_value, 0) + autoTotal

  const byType = ASSET_TYPES.reduce((acc, type) => {
    acc[type] = assets.filter((a) => a.asset_type === type)
    return acc
  }, {} as Record<string, Asset[]>)

  const totalByType = ASSET_TYPES.reduce((acc, type) => {
    const manualTotal = byType[type].reduce((s, a) => s + a.current_value, 0)
    const autoForType = AUTO_TRACKED.filter((a) => a.type === type)
      .reduce((s, a) => s + (autoValues[a.name] ?? 0), 0)
    acc[type] = manualTotal + autoForType
    return acc
  }, {} as Record<string, number>)

  // Show a section if it has manual assets OR a live auto-tracked value
  const today = new Date().toISOString().split('T')[0]
  const typesToShow = ASSET_TYPES.filter(
    (type) =>
      byType[type].length > 0 ||
      AUTO_TRACKED.some((a) => a.type === type && autoValues[a.name] !== null)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Assets & Net Worth</h1>
          <p className="text-sm text-[#555]">Track your savings and investments</p>
        </div>
        {isEditor && (
          <Button onClick={() => setShowAddModal(true)}>+ Add Asset</Button>
        )}
      </div>

      {/* Net Worth card */}
      <Card>
        <p className="text-xs uppercase tracking-wider text-[#555]">Total Net Worth</p>
        <p className="mt-2 text-5xl font-bold tabular-nums text-white">
          {formatCurrency(totalNetWorth)}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {ASSET_TYPES.map((type) => (
            <div key={type}>
              <p className="text-xs text-[#555]">{type}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-white">
                {formatCurrency(totalByType[type] ?? 0)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Assets by type */}
      {loading ? (
        <div className="py-8 text-center text-[#555]">Loading...</div>
      ) : typesToShow.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-[#555]">
            No assets yet.{' '}
            {isEditor && (
              <button
                className="text-indigo-400 hover:text-indigo-300"
                onClick={() => setShowAddModal(true)}
              >
                Add your first account →
              </button>
            )}
          </p>
        </Card>
      ) : (
        typesToShow.map((type) => {
          const autoEntries = AUTO_TRACKED.filter(
            (a) => a.type === type && autoValues[a.name] !== null
          )
          return (
            <Card key={type}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant={assetTypeBadge[type] ?? 'neutral'}>{type}</Badge>
                  <CardTitle>{type} Accounts</CardTitle>
                </div>
                <span className="tabular-nums text-sm text-white">
                  {formatCurrency(totalByType[type])}
                </span>
              </CardHeader>

              <div className="space-y-3">
                {/* Auto-tracked investment accounts (read-only) */}
                {autoEntries.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between rounded-lg bg-[#111] px-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{entry.name}</p>
                        <span className="rounded-full bg-indigo-900/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-indigo-400">
                          Auto
                        </span>
                      </div>
                      <p className="text-xs text-[#555]">Updated daily · as of {today}</p>
                    </div>
                    <p className="tabular-nums text-xl font-semibold text-white">
                      {formatCurrency(autoValues[entry.name] ?? 0)}
                    </p>
                  </div>
                ))}

                {/* Manually-entered assets */}
                {byType[type].map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-lg bg-[#111] px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{asset.asset_name}</p>
                      <p className="text-xs text-[#555]">
                        Updated {formatDate(asset.as_of_date)}
                        {asset.notes && ` · ${asset.notes}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="tabular-nums text-xl font-semibold text-white">
                        {formatCurrency(asset.current_value)}
                      </p>
                      {isEditor && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingAsset(asset)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(asset.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Asset"
      >
        <AssetForm
          onSuccess={(asset) => {
            setAssets((prev) => [...prev, asset])
            setShowAddModal(false)
          }}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingAsset}
        onClose={() => setEditingAsset(null)}
        title="Edit Asset"
      >
        {editingAsset && (
          <AssetForm
            initialData={editingAsset}
            onSuccess={(asset) => {
              setAssets((prev) => prev.map((a) => (a.id === asset.id ? asset : a)))
              setEditingAsset(null)
            }}
            onCancel={() => setEditingAsset(null)}
          />
        )}
      </Modal>
    </div>
  )
}
