import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeMerchantKey } from '@/lib/merchant'
import { toMonthYear } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// POST /api/import-transaction — insert a single card-alert transaction (Workflow 05).
// Auth: a scoped import key (IMPORT_API_KEY), separate from the editor login, sent as
// the x-import-key header. This lets the scheduled Gmail-scan agent write transactions
// without holding the same credential that can edit budget targets or delete data.
//
// Body: { email_message_id, date, amount, merchant_raw, notes? }
// - Deduplicates on email_message_id (also enforced by a DB unique index).
// - Looks up merchant_category_map by normalizeMerchantKey(merchant_raw):
//   match -> status 'confirmed'; no match -> status 'needs_review', category/subcategory null.
export async function POST(req: NextRequest) {
  const importKey = req.headers.get('x-import-key')
  if (!importKey || importKey !== process.env.IMPORT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { email_message_id, date, amount, merchant_raw, notes } = body

  if (!email_message_id || !date || amount === undefined || !merchant_raw) {
    return NextResponse.json(
      { error: 'Missing email_message_id, date, amount, or merchant_raw' },
      { status: 400 }
    )
  }

  const { data: existing } = await supabaseAdmin
    .from('expenses')
    .select('id')
    .eq('email_message_id', email_message_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ duplicate: true, id: existing.id })
  }

  const merchant_key = normalizeMerchantKey(merchant_raw)
  const { data: mapping } = await supabaseAdmin
    .from('merchant_category_map')
    .select('category, subcategory')
    .eq('merchant_key', merchant_key)
    .maybeSingle()

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert({
      date,
      amount,
      month_year: toMonthYear(date),
      description: notes ?? merchant_raw,
      merchant_raw,
      email_message_id,
      source: 'auto',
      status: mapping ? 'confirmed' : 'needs_review',
      category: mapping?.category ?? null,
      subcategory: mapping?.subcategory ?? null,
    })
    .select()
    .single()

  // The DB unique index is the final backstop against a duplicate insert if two
  // requests for the same email race past the select-based check above.
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ duplicate: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
