'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface BudgetVsActualBarProps {
  data: {
    category: string
    actual: number
    budget: number
  }[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3 text-sm shadow-xl">
      <p className="mb-2 font-medium text-white">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
      {payload.length === 2 && (
        <p className={`mt-1 text-xs ${payload[0].value > payload[1].value ? 'text-red-400' : 'text-emerald-400'}`}>
          {payload[0].value > payload[1].value
            ? `${formatCurrency(payload[0].value - payload[1].value)} over budget`
            : `${formatCurrency(payload[1].value - payload[0].value)} under budget`}
        </p>
      )}
    </div>
  )
}

export function BudgetVsActualBar({ data }: BudgetVsActualBarProps) {
  // Shorten category labels for the chart
  const chartData = data.map((d) => ({
    ...d,
    category: d.category.split(' ')[0], // "Housing", "Food", "Transport", "Investing"
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fill: '#666', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1f1f1f' }} />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: '#888' }}
          iconType="square"
          iconSize={8}
        />
        <Bar dataKey="actual" name="Actual" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="budget" name="Budget" fill="#2a2a2a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
