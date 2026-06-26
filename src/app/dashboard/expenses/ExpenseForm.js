'use client'

import { useState } from 'react'
import { addPersonalExpense } from '@/app/actions/expenses'
import toast from 'react-hot-toast'

export default function ExpenseForm() {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Receipt must be under 5 MB')
        e.target.value = ''
        setPreview(null)
        return
      }
      setPreview(URL.createObjectURL(file))
    } else {
      setPreview(null)
    }
  }

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
      setPreview(null)
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

      <div className="flex gap-2">
        <div className="relative">
          <input 
            type="file" 
            name="receipt" 
            id="receipt-upload" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange} 
          />
          <label 
            htmlFor="receipt-upload" 
            className="btn btn-outline flex items-center justify-center cursor-pointer" 
            style={{ width: '42px', height: '42px', padding: 0 }}
            title="Attach receipt"
          >
            {preview ? (
              <img src={preview} alt="Receipt preview" className="w-full h-full object-cover rounded-md" />
            ) : (
              <i className="ti ti-camera text-lg"></i>
            )}
          </label>
        </div>

        <button type="submit" disabled={loading} className="btn btn-fill flex items-center justify-center gap-2 disabled:opacity-70" style={{ height: '42px', padding: '0 20px' }}>
          {loading ? (
            <><i className="ti ti-loader-2 animate-spin text-sm"></i> Saving...</>
          ) : (
            <><i className="ti ti-plus text-sm"></i> Add</>
          )}
        </button>
      </div>
    </form>
  )
}
