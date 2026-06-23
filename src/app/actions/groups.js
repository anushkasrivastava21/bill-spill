'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createGroup(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name')
  if (!name) return { error: 'Group name is required' }

  // 1. Create group
  const { data: group, error: groupError } = await supabase.from('shared_groups').insert({
    name,
    created_by: user.id
  }).select('id').single()

  if (groupError) return { error: 'Failed to create group' }

  // 2. Add creator to group_members automatically
  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id
  })

  revalidatePath('/dashboard/groups')
  return { success: true, groupId: group.id }
}
