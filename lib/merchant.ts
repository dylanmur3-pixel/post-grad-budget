// Normalizes a raw merchant string (from a card alert email or manual entry) into the
// merchant_key used to look up / store rows in merchant_category_map.
// Keep this rule in sync with workflows/05_auto_import_card_transactions.md.
export function normalizeMerchantKey(merchantRaw: string): string {
  return merchantRaw.trim().toUpperCase()
}
