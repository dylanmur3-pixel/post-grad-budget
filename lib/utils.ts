import { format, parseISO } from 'date-fns'
import { USD, USD_CENTS } from './constants'

// Format a number as currency: $1,234 or $1,234.56
export function formatCurrency(amount: number, showCents = false): string {
  return showCents ? USD_CENTS.format(amount) : USD.format(amount)
}

// Format a date string (YYYY-MM-DD) to a readable format: "Jul 3, 2026"
export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

// Format a month_year string (YYYY-MM) to "July 2026"
export function formatMonth(monthYear: string): string {
  try {
    return format(parseISO(monthYear + '-01'), 'MMMM yyyy')
  } catch {
    return monthYear
  }
}

// Format a month_year string to short form: "Jul 2026"
export function formatMonthShort(monthYear: string): string {
  try {
    return format(parseISO(monthYear + '-01'), 'MMM yyyy')
  } catch {
    return monthYear
  }
}

// Get the current month in YYYY-MM format
export function currentMonthYear(): string {
  return format(new Date(), 'yyyy-MM')
}

// Calculate savings rate as a percentage
export function calcSavingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0
  return Math.round(((income - expenses) / income) * 100 * 10) / 10
}

// Calculate budget percentage used (for progress bars)
export function calcBudgetPct(actual: number, budget: number): number {
  if (budget <= 0) return 0
  return Math.min(Math.floor((actual / budget) * 100), 999)
}

// Return a color class based on budget percentage
export function budgetStatusColor(pct: number): string {
  if (pct > 100) return 'text-red-400'
  if (pct >= 85) return 'text-yellow-400'
  return 'text-emerald-400'
}

// Return a progress bar color class based on percentage
export function progressBarColor(pct: number): string {
  if (pct > 100) return 'bg-red-500'
  if (pct >= 85) return 'bg-yellow-500'
  return 'bg-indigo-500'
}

// Clamp a number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Convert a date string to month_year format
export function toMonthYear(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'yyyy-MM')
  } catch {
    return format(new Date(), 'yyyy-MM')
  }
}

// Generate an array of the last N months as YYYY-MM strings
export function lastNMonths(n: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(format(d, 'yyyy-MM'))
  }
  return months
}

// Merge class names (simple version — no clsx needed)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
