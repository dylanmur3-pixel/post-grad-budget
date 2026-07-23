import { supabaseAdmin } from '@/lib/supabase'

export const PAYCHECK_SOURCES = ['Base Salary', 'Bonus']

// Nudge the BofA Checking balance by `delta` (positive to add, negative to reverse).
// Returns an error message on failure instead of failing silently.
export async function adjustCheckingBalance(delta: number): Promise<string | null> {
  const { data: checking, error: selectError } = await supabaseAdmin
    .from('assets')
    .select('id, current_value')
    .eq('asset_name', 'BofA Checking')
    .single()

  if (selectError || !checking) {
    const msg = `Checking balance sync failed: could not find BofA Checking asset (${selectError?.message ?? 'not found'})`
    console.error(msg)
    return msg
  }

  const { error: updateError } = await supabaseAdmin
    .from('assets')
    .update({
      current_value: Number(checking.current_value) + delta,
      as_of_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq('id', checking.id)

  if (updateError) {
    const msg = `Checking balance sync failed: ${updateError.message}`
    console.error(msg)
    return msg
  }

  return null
}
