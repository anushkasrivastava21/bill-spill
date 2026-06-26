'use client'

import { useState } from 'react'
import { addGroupExpense, addGroupMember, recordSettlement } from '@/app/actions/group_details'
import toast from 'react-hot-toast'
import { CURRENCIES } from '@/utils/currency'

export function AddExpenseForm({ groupId, currencyCode = 'INR' }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    setLoading(true)
    const formData = new FormData(form)
    formData.append('group_id', groupId)
    
    const result = await addGroupExpense(formData)
    
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Expense added!')
      form.reset()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end w-full">
      <div className="flex flex-col gap-1 flex-1">
        <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Description</label>
        <input name="description" type="text" required className="input-field" placeholder="Dinner at BBQ Nation" />
      </div>
      
      <div className="flex flex-col gap-1 w-full md:w-32">
        <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Amount {CURRENCIES[currencyCode]?.symbol || '₹'}</label>
        <input name="amount" type="number" step="0.01" min="0.01" required className="input-field" placeholder="1500" />
      </div>

      <div className="flex flex-col gap-1 w-full md:w-36">
        <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Category</label>
        <select name="category" className="input-field" style={{ appearance: 'none' }} defaultValue="Other">
          <option value="Food & Drink">Food & Drink</option>
          <option value="Transport">Transport</option>
          <option value="Lodging">Lodging</option>
          <option value="Tickets">Tickets</option>
          <option value="Groceries">Groceries</option>
          <option value="Other">Other</option>
        </select>
      </div>
      
      <button type="submit" disabled={loading} className="btn btn-fill w-full md:w-auto flex items-center justify-center gap-2 disabled:opacity-70" style={{ height: '42px' }}>
        {loading ? 'Adding...' : 'Add expense'}
      </button>
    </form>
  )
}

export function SettleUpForm({ groupId, members, currencyCode = 'INR' }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    setLoading(true)
    const formData = new FormData(form)
    formData.append('group_id', groupId)

    const result = await recordSettlement(formData)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Payment recorded!')
      form.reset()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <select name="paid_to" required defaultValue="" className="input-field" style={{ appearance: 'none' }}>
        <option value="" disabled>I paid...</option>
        {members.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <input name="amount" type="number" step="0.01" min="0.01" required placeholder={`Amount ${CURRENCIES[currencyCode]?.symbol || '₹'}`} className="input-field flex-1" />
        <button type="submit" disabled={loading} className="btn btn-fill disabled:opacity-70 whitespace-nowrap" style={{ fontSize: '12px' }}>
          {loading ? 'Saving...' : 'Settle Up'}
        </button>
      </div>
    </form>
  )
}

export function AddMemberForm({ groupId }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    setLoading(true)
    const formData = new FormData(form)
    formData.append('group_id', groupId)
    
    const result = await addGroupMember(formData)
    
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Member added!')
      form.reset()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex flex-col gap-1 flex-1">
        <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Invite via email</label>
        <input name="email" type="email" required className="input-field" placeholder="friend@example.com" />
      </div>
      <button type="submit" disabled={loading} className="btn btn-outline disabled:opacity-70 whitespace-nowrap" style={{ height: '42px', fontSize: '12px' }}>
        {loading ? 'Inviting...' : 'Add'}
      </button>
    </form>
  )
}
