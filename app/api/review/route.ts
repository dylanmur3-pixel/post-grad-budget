import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeMerchantKey } from '@/lib/merchant'

export const dynamic = 'force-dynamic'

// GET /api/review — fetch expenses awaiting categorization (editor only)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('status', 'needs_review')
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

// PUT /api/review — confirm a pending expense's category (editor only)
// Body: { id, category, subcategory }
// Sets the expense to confirmed, and remembers the merchant -> category mapping
// so future auto-imports from the same merchant confirm automatically.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, category, subcategory } = body

  if (!id || !category || !subcategory) {
    return NextResponse.json({ error: 'Missing id, category, or subcategory' }, { status: 400 })
  }

  const { data: expense, error: updateError } = await supabaseAdmin
    .from('expenses')
    .update({ category, subcategory, status: 'confirmed' })
    .eq('id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  if (expense.merchant_raw) {
    const merchant_key = normalizeMerchantKey(expense.merchant_raw)
    const { error: mapError } = await supabaseAdmin
      .from('merchant_category_map')
      .upsert(
        {
          merchant_key,
          merchant_label: expense.merchant_raw,
          category,
          subcategory,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'merchant_key' }
      )

    if (mapError) {
      // The expense itself is already confirmed — don't fail the request over the
      // mapping upsert, but surface it so it's visible something needs a second look.
      return NextResponse.json({ ...expense, mapping_warning: mapError.message })
    }
  }

  return NextResponse.json(expense)
}
