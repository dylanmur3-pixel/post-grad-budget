import { formatCurrency, calcBudgetPct, progressBarColor, budgetStatusColor } from '@/lib/utils'
import { CATEGORY_COLORS, type Category } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface BudgetProgressProps {
  category: Category
  actual: number
  budget: number
}

export function BudgetProgress({ category, actual, budget }: BudgetProgressProps) {
  const pct = calcBudgetPct(actual, budget)
  const barColor = progressBarColor(pct)
  const textColor = budgetStatusColor(pct)
  const barWidth = `${Math.min(pct, 100)}%`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-white">{category}</span>
        <div className="flex items-center gap-2">
          <span className={cn('font-medium tabular-nums', textColor)}>
            {formatCurrency(actual)}
          </span>
          <span className="text-[#555]">/</span>
          <span className="tabular-nums text-[#666]">{formatCurrency(budget)}</span>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#2a2a2a]">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: barWidth }}
        />
      </div>
      <p className={cn('text-right text-xs', textColor)}>
        {pct >= 100 ? `${formatCurrency(actual - budget)} over budget` : `${100 - pct}% remaining`}
      </p>
    </div>
  )
}
