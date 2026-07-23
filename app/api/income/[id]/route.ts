import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const PAYCHECK_SOURCES = ['Base Salary', 'Bonus']

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { data: entry } = await supabaseAdmin
    .from('income')
    .select('source, amount')
    .eq('id', id)
    .single()

  const { error } = await supabaseAdmin.from('income').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (entry && PAYCHECK_SOURCES.includes(entry.source)) {
    const { data: checking } = await supabaseAdmin
      .from('assets')
      .select('id, current_value')
      .eq('asset_name', 'BofA Checking')
      .single()

    if (checking) {
      await supabaseAdmin
        .from('assets')
        .update({
          current_value: Number(checking.current_value) - Number(entry.amount),
          as_of_date: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        })
        .eq('id', checking.id)
    }
  }

  return NextResponse.json({ success: true })
}
