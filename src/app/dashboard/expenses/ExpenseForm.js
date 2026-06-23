'use client'

import { useState } from 'react'
import { addPersonalExpense } from '@/app/actions/expenses'
import toast from 'react-hot-toast'

export default function ExpenseForm() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    const formData = new FormData(event.currentTarget)
    
    const result = await addPersonalExpense(formData)
    
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Expense saved successfully!')
      event.currentTarget.reset()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end w-full">
      <div className="flex flex-col gap-xs w-full md:w-1/3">
        <label className="font-label-md text-on-surface-variant text-sm">Expense Name</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">edit</span>
          <input name="description" type="text" required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 pl-10 pr-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md outline-none" placeholder="Morning coffee" />
        </div>
      </div>
      
      <div className="flex flex-col gap-xs w-full md:w-1/4">
        <label className="font-label-md text-on-surface-variant text-sm">Amount ₹</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">payments</span>
          <input name="amount" type="number" step="0.01" min="0.01" required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 pl-10 pr-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md outline-none" placeholder="120" />
        </div>
      </div>
      
      <div className="flex flex-col gap-xs w-full md:w-1/4">
        <label className="font-label-md text-on-surface-variant text-sm">Category</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">category</span>
          <select name="category" required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 pl-10 pr-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md outline-none appearance-none cursor-pointer">
            <option value="" disabled selected>Select...</option>
            <option value="Food">Food & Dining</option>
            <option value="Transport">Transport</option>
            <option value="Utilities">Bills & Utilities</option>
            <option value="Shopping">Shopping</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full md:w-auto py-2 px-6 bg-primary text-on-primary rounded-xl font-label-md flex items-center justify-center gap-sm pressable shadow-md h-[42px] disabled:opacity-70 flex-shrink-0">
        {loading ? (
          <>
            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            Saving...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-sm">add</span>
            Add
          </>
        )}
      </button>
    </form>
  )
}
