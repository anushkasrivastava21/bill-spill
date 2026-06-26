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
  const category = formData.get('category') || 'Other'
  const splitType = formData.get('split_type') || 'equal'
  const splitsJson = formData.get('splits_json')

  if (!amount || amount <= 0) return { error: 'Invalid amount' }

  const receiptFile = formData.get('receipt')
  let receipt_url = null

  if (receiptFile && receiptFile.size > 0) {
    if (receiptFile.size > 5 * 1024 * 1024) return { error: 'Receipt must be under 5 MB.' }
    if (!receiptFile.type.startsWith('image/')) return { error: 'Please upload an image file.' }

    const ext = receiptFile.name.split('.').pop()
    const fileName = `${user.id}/group_${Date.now()}.${ext}`

    const { data, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, receiptFile)

    if (uploadError) {
      console.error(uploadError)
      return { error: 'Failed to upload receipt.' }
    }

    const { data: publicUrlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName)
      
    receipt_url = publicUrlData.publicUrl
  }

  const { data: expense, error } = await supabase.from('group_expenses').insert({
    group_id: groupId,
    paid_by_user: user.id,
    amount,
    description,
    category,
    split_type: splitType,
    receipt_url
  }).select('id').single()

  if (error) return { error: 'Failed to add expense' }

  // Save custom splits if not equal
  if (splitType !== 'equal' && splitsJson) {
    try {
      const splits = JSON.parse(splitsJson)
      const splitRows = splits.filter(s => s.amount > 0).map(s => ({
        expense_id: expense.id,
        user_id: s.user_id,
        amount: s.amount
      }))
      if (splitRows.length > 0) {
        await supabase.from('expense_splits').insert(splitRows)
      }
    } catch (e) {
      // splits parsing failed, ignore — will default to equal
    }
  }

  revalidatePath(`/dashboard/groups/${groupId}`)
  return { success: true }
}

export async function addGroupMember(formData) {
  const supabase = await createClient()

  const groupId = formData.get('group_id')
  const email = formData.get('email')

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

export async function recordSettlement(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const groupId = formData.get('group_id')
  const paidTo = formData.get('paid_to')
  const amount = parseFloat(formData.get('amount'))
  const note = formData.get('note') || null

  if (!paidTo) return { error: 'Please select who you paid.' }
  if (!amount || amount <= 0) return { error: 'Please enter a valid amount.' }

  const { error } = await supabase.from('settlements').insert({
    group_id: groupId,
    paid_by: user.id,
    paid_to: paidTo,
    amount,
    note,
  })

  if (error) return { error: 'Failed to record payment.' }

  revalidatePath(`/dashboard/groups/${groupId}`)
  return { success: true }
}

export async function deleteSettlement(id, groupId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('settlements').delete().eq('id', id).eq('paid_by', user.id)
  if (error) return { error: 'Failed to undo settlement.' }

  revalidatePath(`/dashboard/groups/${groupId}`)
  return { success: true }
}

// Feature 7: Comments
export async function addComment(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const expenseId = formData.get('expense_id')
  const groupId = formData.get('group_id')
  const content = formData.get('content')

  if (!content || content.trim().length === 0) return { error: 'Comment cannot be empty.' }
  if (content.length > 500) return { error: 'Comment too long (max 500 chars).' }

  const { error } = await supabase.from('expense_comments').insert({
    expense_id: expenseId,
    user_id: user.id,
    content: content.trim()
  })

  if (error) return { error: 'Failed to add comment.' }

  revalidatePath(`/dashboard/groups/${groupId}`)
  return { success: true }
}

// Feature 6: Recurring Expenses
export async function addRecurringExpense(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const groupId = formData.get('group_id')
  const description = formData.get('description')
  const amount = parseFloat(formData.get('amount'))
  const category = formData.get('category') || 'Bills'
  const frequency = formData.get('frequency')
  const nextDue = formData.get('next_due')

  if (!amount || amount <= 0) return { error: 'Invalid amount' }
  if (!description) return { error: 'Description required' }
  if (!frequency) return { error: 'Frequency required' }
  if (!nextDue) return { error: 'Next due date required' }

  const { error } = await supabase.from('recurring_expenses').insert({
    group_id: groupId,
    description,
    amount,
    category,
    paid_by_user: user.id,
    frequency,
    next_due: nextDue,
    created_by: user.id
  })

  if (error) return { error: 'Failed to add recurring expense.' }

  revalidatePath(`/dashboard/groups/${groupId}`)
  return { success: true }
}

export async function toggleRecurringExpense(id, isActive, groupId) {
  const supabase = await createClient()
  const { error } = await supabase.from('recurring_expenses').update({ is_active: !isActive }).eq('id', id)
  if (error) return { error: 'Failed to update.' }
  revalidatePath(`/dashboard/groups/${groupId}`)
  return { success: true }
}
