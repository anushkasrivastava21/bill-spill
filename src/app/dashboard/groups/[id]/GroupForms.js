'use client'

import { useState } from 'react'
import { addGroupExpense, addGroupMember } from '@/app/actions/group_details'
import toast from 'react-hot-toast'

export function AddExpenseForm({ groupId }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    const formData = new FormData(event.currentTarget)
    formData.append('group_id', groupId)
    
    const result = await addGroupExpense(formData)
    
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Expense added!')
      event.currentTarget.reset()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end w-full">
      <div className="flex flex-col gap-xs w-full md:w-1/2">
        <label className="font-label-md text-sm text-on-surface-variant">Expense Description</label>
        <input name="description" type="text" required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary font-body-md outline-none" placeholder="Dinner at Luigi's" />
      </div>
      
      <div className="flex flex-col gap-xs w-full md:w-1/3">
        <label className="font-label-md text-sm text-on-surface-variant">Amount ₹</label>
        <input name="amount" type="number" step="0.01" min="0.01" required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary font-body-md outline-none" placeholder="1500" />
      </div>
      
      <button type="submit" disabled={loading} className="w-full md:w-auto py-2 px-6 bg-primary text-on-primary rounded-xl font-label-md pressable shadow-md h-[42px] flex-shrink-0 disabled:opacity-70">
        {loading ? 'Adding...' : 'Add Expense'}
      </button>
    </form>
  )
}

export function AddMemberForm({ groupId }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    const formData = new FormData(event.currentTarget)
    formData.append('group_id', groupId)
    
    const result = await addGroupMember(formData)
    
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Member added!')
      event.currentTarget.reset()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end w-full mt-4 p-4 bg-surface-container-high rounded-xl">
      <div className="flex flex-col gap-xs w-full md:flex-1">
        <label className="font-label-md text-sm text-on-surface-variant">Invite via Email</label>
        <input name="email" type="email" required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-on-surface focus:border-primary font-body-md outline-none" placeholder="friend@example.com" />
      </div>
      
      <button type="submit" disabled={loading} className="w-full md:w-auto py-2 px-6 bg-secondary text-on-secondary rounded-xl font-label-md pressable shadow-md h-[42px] flex-shrink-0 disabled:opacity-70">
        {loading ? 'Inviting...' : 'Add Member'}
      </button>
    </form>
  )
}
