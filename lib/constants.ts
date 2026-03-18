// All static data: categories, subcategories, colors, and LA defaults.

export const CATEGORIES = [
  'Housing & Utilities',
  'Food & Health',
  'Transport',
  'Investing & Savings',
] as const

export type Category = typeof CATEGORIES[number]

// Maps each category to its subcategories.
// This drives the dropdowns in the expense form.
export const SUBCATEGORIES: Record<Category, string[]> = {
  'Housing & Utilities': [
    'Rent',
    'Electric + Gas',
    'Internet',
    "Renter's Insurance",
  ],
  'Food & Health': [
    'Groceries',
    'Dining Out',
    'Food Delivery',
    'Gym',
    'Healthcare',
  ],
  'Transport': [
    'Car Insurance',
    'Gas',
    'Parking',
    'Uber/Lyft',
    'Car Maintenance',
  ],
  'Investing & Savings': [
    'ETF Contributions',
    'Roth IRA',
    'Emergency Fund',
  ],
}

// Chart and UI colors for each category
export const CATEGORY_COLORS: Record<Category, string> = {
  'Housing & Utilities': '#6366f1',   // indigo
  'Food & Health': '#22d3ee',          // cyan
  'Transport': '#f59e0b',              // amber
  'Investing & Savings': '#22c55e',    // green
}

// Hex values for Recharts (must be plain hex)
export const CATEGORY_COLORS_HEX: Record<string, string> = {
  housing: '#6366f1',
  food_health: '#22d3ee',
  transport: '#f59e0b',
  investing: '#22c55e',
}

// Maps category names to the summary table column prefix
export const CATEGORY_TO_KEY: Record<Category, string> = {
  'Housing & Utilities': 'housing',
  'Food & Health': 'food_health',
  'Transport': 'transport',
  'Investing & Savings': 'investing',
}

export const INCOME_SOURCES = ['Base Salary', 'Bonus', 'Other'] as const

export const ASSET_TYPES = ['Cash', 'Investment', 'Retirement'] as const

// Month format used throughout the app
export const MONTH_FORMAT = 'yyyy-MM'

// Dollar formatting helper (used with Intl.NumberFormat)
export const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export const USD_CENTS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
