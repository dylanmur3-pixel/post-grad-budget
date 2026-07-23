import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { adjustCheckingBalance, PAYCHECK_SOURCES } from '@/lib/checking'

export const dynamic = 'force-dynamic'

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

  let checkingSyncWarning: string | null = null
  if (entry && PAYCHECK_SOURCES.includes(entry.source)) {
    checkingSyncWarning = await adjustCheckingBalance(-Number(entry.amount))
  }

  return NextResponse.json({ success: true, checkingSyncWarning })
}
