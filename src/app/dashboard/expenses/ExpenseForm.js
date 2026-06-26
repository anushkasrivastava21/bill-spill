'use client'

import { useState } from 'react'
import { addPersonalExpense } from '@/app/actions/expenses'
import toast from 'react-hot-toast'

export default function ExpenseForm() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    setLoading(true)
    const formData = new FormData(form)
    
    const result = await addPersonalExpense(formData)
    
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Expense saved!')
      form.reset()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end w-full">
      <div className="flex flex-col gap-1 flex-1">
        <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Expense name</label>
        <input name="description" type="text" required className="input-field" placeholder="Morning coffee" />
      </div>
      
      <div className="flex flex-col gap-1 w-full md:w-36">
        <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Amount</label>
        <input name="amount" type="number" step="0.01" min="0.01" required className="input-field" placeholder="₹ 120" />
      </div>
      
      <div className="flex flex-col gap-1 w-full md:w-40">
        <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Category</label>
        <select name="category" defaultValue="" required className="input-field" style={{ appearance: 'none' }}>
          <option value="" disabled>Select...</option>
          <option value="Food">Food & Dining</option>
          <option value="Transport">Transport</option>
          <option value="Utilities">Bills & Utilities</option>
          <option value="Shopping">Shopping</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <button type="submit" disabled={loading} className="btn btn-fill w-full md:w-auto flex items-center justify-center gap-2 disabled:opacity-70" style={{ height: '42px' }}>
        {loading ? (
          <><i className="ti ti-loader-2 animate-spin text-sm"></i> Saving...</>
        ) : (
          <><i className="ti ti-plus text-sm"></i> Add</>
        )}
      </button>
    </form>
  )
}
