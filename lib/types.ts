// TypeScript types matching the Supabase database schema.
// Every table has a corresponding type here.

export interface BudgetTarget {
  id: number
  category: string
  subcategory: string
  monthly_target: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Expense {
  id: number
  date: string
  category: string
  subcategory: string
  description?: string
  amount: number
  month_year: string
  created_at: string
}

export interface Income {
  id: number
  date: string
  source: string
  amount: number
  month_year: string
  notes?: string
  created_at: string
}

export interface Asset {
  id: number
  asset_name: string
  asset_type: 'Cash' | 'Investment' | 'Retirement'
  current_value: number
  as_of_date: string
  notes?: string
  updated_at: string
}

export interface MonthlySummary {
  id: number
  month_year: string
  total_income: number
  total_expenses: number
  housing_actual: number
  food_health_actual: number
  transport_actual: number
  investing_actual: number
  housing_budget: number
  food_health_budget: number
  transport_budget: number
  investing_budget: number
  savings_rate: number
  net_cashflow: number
  created_at: string
  updated_at: string
}

export interface AppSettings {
  id: number
  annual_salary: number
  expected_bonus_pct: number
  monthly_take_home: number
  city: string
  start_date: string
  updated_at: string
}

// For forms — omit auto-generated fields
export type NewExpense = Omit<Expense, 'id' | 'created_at'>
export type NewIncome = Omit<Income, 'id' | 'created_at'>
export type NewAsset = Omit<Asset, 'id' | 'updated_at'>

export interface PeriodReturn {
  gainLoss: number | null
  gainLossPct: number | null
}

export interface Holding {
  ticker: string
  name: string
  shares: number
  buyPrice: number
  currentPrice: number
  currentValue: number
  gainLoss: number
  gainLossPct: number
  costBasis: number
  dateBought: string
  periodReturns: Record<string, PeriodReturn>
}

export interface PortfolioSnapshot {
  date: string
  total_value: number
}

export interface PortfolioSummary {
  currentValue: number
  costBasis: number
  gainLoss: number
  returnPct: number
  history: PortfolioSnapshot[]
  holdings: Holding[]
}
