'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addPersonalExpense(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const amount = parseFloat(formData.get('amount'))
  const description = formData.get('description')
  const category = formData.get('category')

  if (!amount || amount <= 0) return { error: 'Please enter an amount greater than 0.' }
  if (!description) return { error: 'Please enter a description.' }
  if (!category) return { error: 'Please select a category.' }

  const { error } = await supabase.from('personal_expenses').insert({
    user_id: user.id,
    description,
    amount,
    category
  })

  if (error) return { error: 'Failed to add expense' }

  revalidatePath('/dashboard/expenses')
  return { success: true }
}

export async function deletePersonalExpense(id) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('personal_expenses').delete().eq('id', id).eq('user_id', user.id)

  if (error) return { error: 'Failed to delete expense' }

  revalidatePath('/dashboard/expenses')
  return { success: true }
}
