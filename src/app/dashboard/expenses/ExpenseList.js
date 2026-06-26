'use client'

import { useState } from 'react'
import { deletePersonalExpense } from '@/app/actions/expenses'
import toast from 'react-hot-toast'

const CATEGORY_STYLES = {
  Food:      { icon: 'ti-tools-kitchen-2', bg: 'var(--color-ember-bg)',  text: 'var(--color-ember-text)' },
  Transport: { icon: 'ti-car',            bg: 'var(--color-green-bg)',  text: 'var(--color-green-text)' },
  Utilities: { icon: 'ti-bolt',           bg: 'var(--color-red-bg)',    text: 'var(--color-red-text)' },
  Shopping:  { icon: 'ti-basket',         bg: 'var(--color-green-bg)',  text: 'var(--color-green-text)' },
  Other:     { icon: 'ti-receipt',        bg: 'var(--color-ember-bg)',  text: 'var(--color-ember-text)' },
}

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
      <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <i className="ti ti-receipt-off text-3xl mb-2" style={{ color: 'var(--color-text-3)', opacity: 0.5 }}></i>
        <p className="text-[13px]" style={{ color: 'var(--color-text-3)' }}>No expenses yet. Add your first one above!</p>
      </div>
    )
  }

  return (
    <div className="card list-card">
      <div className="list-header">
        <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-2)' }}>Recent</div>
        <span className="text-[12px] font-medium" style={{ color: 'var(--color-ember-text)' }}>{expenses.length} entries</span>
      </div>
      {expenses.map((exp) => {
        const cat = CATEGORY_STYLES[exp.category] || CATEGORY_STYLES.Other
        return (
          <div key={exp.id} className="expense-row group">
            <div className="exp-icon" style={{ background: cat.bg }}>
              <i className={`ti ${cat.icon}`} style={{ color: cat.text, fontSize: '16px' }}></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-1)' }}>{exp.description}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>
                {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {exp.category && ` · ${exp.category}`}
              </div>
            </div>
            <div className="text-right flex items-center gap-3">
              <span className="text-[13px] font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-1)' }}>₹{exp.amount.toLocaleString()}</span>
              <button 
                onClick={() => handleDelete(exp.id)}
                disabled={deleting === exp.id}
                className="p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                style={{ color: 'var(--color-red-text)' }}
              >
                {deleting === exp.id ? (
                  <i className="ti ti-loader-2 animate-spin text-sm"></i>
                ) : (
                  <i className="ti ti-trash text-sm"></i>
                )}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
