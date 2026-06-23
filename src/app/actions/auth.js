'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: 'Invalid email or password. Please try again.' }
  }

  redirect('/dashboard/expenses')
}

export async function signup(formData) {
  const supabase = await createClient()

  const name = formData.get('name')
  const email = formData.get('email')
  const password = formData.get('password')

  if (!email || !password || password.length < 6) {
    return { error: 'Please provide a valid email and a password of at least 6 characters.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email address already exists. Try signing in instead!' }
    }
    return { error: error.message }
  }

  // Insert into public.users
  if (data?.user?.id) {
    const { error: insertError } = await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email,
      name: name,
    })
    
    if (insertError && !insertError.message.includes('duplicate key')) {
        return { error: 'Failed to create user profile.' }
    }
  }

  redirect('/dashboard/expenses')
}
