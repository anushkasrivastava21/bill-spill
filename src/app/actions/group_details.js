'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addGroupExpense(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const groupId = formData.get('group_id')
  const amount = parseFloat(formData.get('amount'))
  const description = formData.get('description')

  if (!amount || amount <= 0) return { error: 'Invalid amount' }

  const { error } = await supabase.from('group_expenses').insert({
    group_id: groupId,
    paid_by_user: user.id,
    amount,
    description
  })

  if (error) return { error: 'Failed to add expense' }

  revalidatePath(`/dashboard/groups/${groupId}`)
  return { success: true }
}

export async function addGroupMember(formData) {
  const supabase = await createClient()
  
  const groupId = formData.get('group_id')
  const email = formData.get('email')

  // Find user by email
  const { data: targetUser } = await supabase.from('users').select('id, email, name').eq('email', email).single()

  if (!targetUser) return { error: 'User not found. They need to sign up first.' }

  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: targetUser.id
  })

  if (error) return { error: 'Failed to add member or already in group' }

  revalidatePath(`/dashboard/groups/${groupId}`)
  return { success: true }
}
