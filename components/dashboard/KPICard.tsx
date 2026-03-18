import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  label: string
  value: string
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  accent?: string
}

export function KPICard({ label, value, subtext, trend, trendValue, accent }: KPICardProps) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wider text-[#555]">{label}</p>
      <p
        className={cn(
          'mt-2 text-3xl font-bold tabular-nums tracking-tight text-white',
          accent
        )}
      >
        {value}
      </p>
      {(subtext || trendValue) && (
        <div className="mt-1 flex items-center gap-2">
          {trendValue && (
            <span
              className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-emerald-400',
                trend === 'down' && 'text-red-400',
                trend === 'neutral' && 'text-[#666]'
              )}
            >
              {trendValue}
            </span>
          )}
          {subtext && <span className="text-xs text-[#555]">{subtext}</span>}
        </div>
      )}
    </Card>
  )
}
