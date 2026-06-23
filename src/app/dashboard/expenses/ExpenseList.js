'use client'

import { useState } from 'react'
import { deletePersonalExpense } from '@/app/actions/expenses'
import toast from 'react-hot-toast'

export default function ExpenseList({ expenses }) {
  const [deleting, setDeleting] = useState(null)

  async function handleDelete(id) {
    setDeleting(id)
    const result = await deletePersonalExpense(id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Expense deleted')
    }
    setDeleting(null)
  }

  if (expenses.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center text-on-surface-variant border-dashed">
        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
        <p>No expenses yet. Add your first one above!</p>
      </div>
    )
  }

  const getCategoryColor = (cat) => {
    switch(cat) {
      case 'Food': return 'bg-[#fef08a] text-[#854d0e] border-[#facc15]'
      case 'Transport': return 'bg-[#bae6fd] text-[#0369a1] border-[#38bdf8]'
      case 'Utilities': return 'bg-[#fbcfe8] text-[#be185d] border-[#f472b6]'
      case 'Shopping': return 'bg-[#bbf7d0] text-[#15803d] border-[#4ade80]'
      default: return 'bg-surface-container-high text-on-surface-variant border-outline-variant'
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {expenses.map((exp) => (
        <div key={exp.id} className="glass-card rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-center justify-center w-12 h-12 bg-surface-container rounded-lg text-primary">
              <span className="font-title-md text-lg leading-none">{new Date(exp.date).getDate()}</span>
              <span className="font-label-sm text-[10px] uppercase">{new Date(exp.date).toLocaleString('default', { month: 'short' })}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-title-md text-on-surface">{exp.description}</span>
              <div className="flex gap-2 items-center mt-1">
                <span className="sm:hidden font-label-sm text-xs text-on-surface-variant">{new Date(exp.date).toLocaleDateString()}</span>
                <span className={`px-2 py-0.5 rounded-full border font-label-sm text-[10px] uppercase tracking-wider ${getCategoryColor(exp.category)}`}>
                  {exp.category}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-title-md text-lg text-on-surface font-bold">₹{exp.amount.toLocaleString()}</span>
            <button 
              onClick={() => handleDelete(exp.id)}
              disabled={deleting === exp.id}
              className="p-2 text-outline hover:text-error hover:bg-error-container rounded-full transition-colors disabled:opacity-50"
            >
              {deleting === exp.id ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">delete</span>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
