'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PortfolioSnapshot } from '@/lib/types'

interface PortfolioValueLineProps {
  data: PortfolioSnapshot[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3 text-sm shadow-xl">
      <p className="mb-1 font-medium text-white">{formatDate(label)}</p>
      <p style={{ color: '#6366f1' }}>
        Portfolio: {formatCurrency(payload[0].value, true)}
      </p>
    </div>
  )
}

function formatDateShort(dateStr: string): string {
  try {
    const [, month, day] = dateStr.split('-')
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`
  } catch {
    return dateStr
  }
}

export function PortfolioValueLine({ data }: PortfolioValueLineProps) {
  if (data.length === 0) return null

  const values = data.map((d) => d.total_value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const padding = Math.max((maxVal - minVal) * 0.2, 200)
  const yMin = Math.floor((minVal - padding) / 100) * 100
  const yMax = Math.ceil((maxVal + padding) / 100) * 100

  const chartData = data.map((d) => ({ date: d.date, value: d.total_value }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatDateShort}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
          domain={[yMin, yMax]}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          name="Portfolio Value"
          stroke="#6366f1"
          strokeWidth={2}
          dot={data.length <= 7}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
