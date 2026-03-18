'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { formatMonthShort } from '@/lib/utils'

interface SavingsRateLineProps {
  data: {
    month_year: string
    savings_rate: number
  }[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3 text-sm shadow-xl">
      <p className="mb-1 font-medium text-white">{formatMonthShort(label)}</p>
      <p className="text-emerald-400">Savings Rate: {payload[0].value.toFixed(1)}%</p>
    </div>
  )
}

export function SavingsRateLine({ data }: SavingsRateLineProps) {
  const chartData = data.map((d) => ({ ...d, label: d.month_year }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatMonthShort(v)}
        />
        <YAxis
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        {/* Target savings rate reference line */}
        <ReferenceLine y={25} stroke="#2a2a2a" strokeDasharray="4 4" label="" />
        <Line
          type="monotone"
          dataKey="savings_rate"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
