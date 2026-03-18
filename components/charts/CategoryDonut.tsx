'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { CATEGORY_COLORS, type Category } from '@/lib/constants'

interface CategoryDonutProps {
  data: {
    category: string
    amount: number
  }[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3 text-sm shadow-xl">
      <p className="font-medium text-white">{name}</p>
      <p className="text-[#aaa]">{formatCurrency(value)}</p>
    </div>
  )
}

export function CategoryDonut({ data }: CategoryDonutProps) {
  if (!data.length || data.every((d) => d.amount === 0)) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-[#555]">
        No spending data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={CATEGORY_COLORS[entry.category as Category] ?? '#2a2a2a'}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
