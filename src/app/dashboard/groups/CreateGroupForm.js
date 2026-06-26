'use client'

import { useState } from 'react'
import { createGroup } from '@/app/actions/groups'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function CreateGroupForm() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    const formData = new FormData(event.currentTarget)
    
    const result = await createGroup(formData)
    
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    } else {
      toast.success('Group created!')
      router.push(`/dashboard/groups/${result.groupId}`)
    }
  }

  return (
    <div className="card" style={{ padding: '20px' }}>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Group name</label>
          <input name="name" type="text" required className="input-field" placeholder="e.g., Flat expenses" />
        </div>
        
        <div className="flex flex-col gap-1 w-full md:w-28">
          <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Currency</label>
          <select name="currency" className="input-field" style={{ appearance: 'none' }} defaultValue="INR">
            <option value="INR">₹ INR</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
            <option value="THB">฿ THB</option>
            <option value="AED">د.إ AED</option>
            <option value="SGD">S$ SGD</option>
            <option value="JPY">¥ JPY</option>
          </select>
        </div>

        <button type="submit" disabled={loading} className="btn btn-outline w-full md:w-auto flex items-center justify-center gap-2 disabled:opacity-70" style={{ height: '42px' }}>
          {loading ? (
            <><i className="ti ti-loader-2 animate-spin text-sm"></i> Creating...</>
          ) : (
            <><i className="ti ti-plus text-sm"></i> Create group</>
          )}
        </button>
      </form>
    </div>
  )
}
