'use client'

import { useState } from 'react'
import { addGroupExpense, addGroupMember, recordSettlement, deleteSettlement, addComment, addRecurringExpense, toggleRecurringExpense } from '@/app/actions/group_details'
import toast from 'react-hot-toast'
import { CURRENCIES } from '@/utils/currency'

// ============ ADD EXPENSE (with split type) ============
export function AddExpenseForm({ groupId, currencyCode = 'INR', members = [] }) {
  const [loading, setLoading] = useState(false)
  const [splitType, setSplitType] = useState('equal')
  const [splits, setSplits] = useState({})

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    setLoading(true)
    const formData = new FormData(form)
    formData.append('group_id', groupId)
    formData.append('split_type', splitType)

    if (splitType !== 'equal' && members.length > 0) {
      const splitsArr = members.map(m => ({
        user_id: m.id,
        amount: parseFloat(splits[m.id] || 0)
      }))
      formData.append('splits_json', JSON.stringify(splitsArr))
    }
    
    const result = await addGroupExpense(formData)
    
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Expense added!')
      form.reset()
      setSplitType('equal')
      setSplits({})
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <div className="flex flex-col md:flex-row gap-3 items-end">
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
      </div>

      {/* Split type selector */}
      {members.length > 1 && (
        <div>
          <div className="split-tabs mt-2">
            {['equal', 'exact', 'percentage'].map(t => (
              <button key={t} type="button" className={`split-tab ${splitType === t ? 'active' : ''}`} onClick={() => setSplitType(t)}>
                {t === 'equal' ? 'Equal' : t === 'exact' ? 'By amount' : 'By %'}
              </button>
            ))}
          </div>

          {splitType !== 'equal' && (
            <div className="mt-3 flex flex-col gap-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-[12px] font-medium flex-1" style={{ color: 'var(--color-text-2)' }}>{m.name}</span>
                  <input
                    type="number" step="0.01" min="0"
                    className="input-field w-24"
                    placeholder={splitType === 'percentage' ? '%' : CURRENCIES[currencyCode]?.symbol}
                    value={splits[m.id] || ''}
                    onChange={(e) => setSplits(prev => ({ ...prev, [m.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  )
}

// ============ SETTLE UP ============
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
      <input name="note" type="text" className="input-field" placeholder="Note (e.g. UPI, cash)" />
    </form>
  )
}

// ============ UNDO SETTLEMENT ============
export function UndoSettlementButton({ settlementId, groupId }) {
  const [loading, setLoading] = useState(false)

  async function handleUndo() {
    setLoading(true)
    const result = await deleteSettlement(settlementId, groupId)
    if (result?.error) toast.error(result.error)
    else toast.success('Settlement undone!')
    setLoading(false)
  }

  return (
    <button onClick={handleUndo} disabled={loading} className="text-[11px] font-medium cursor-pointer" style={{ color: 'var(--color-red-text)' }}>
      {loading ? '...' : 'Undo'}
    </button>
  )
}

// ============ ADD MEMBER ============
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

// ============ EXPENSE COMMENTS (Feature 7) ============
export function ExpenseComments({ expenseId, groupId, comments = [], usersMap = {} }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    setLoading(true)
    const formData = new FormData(form)
    formData.append('expense_id', expenseId)
    formData.append('group_id', groupId)

    const result = await addComment(formData)
    if (result?.error) toast.error(result.error)
    else { toast.success('Comment added!'); form.reset() }
    setLoading(false)
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[11px] font-medium cursor-pointer" style={{ color: 'var(--color-ember-text)' }}>
        <i className="ti ti-message text-sm"></i>
        {comments.length > 0 ? `${comments.length} comments` : 'Comment'}
      </button>
      {open && (
        <div className="mt-2 ml-12 flex flex-col gap-2">
          {comments.map(c => (
            <div key={c.id} className="text-[11px] py-1" style={{ borderBottom: '0.5px solid var(--color-border-subtle)' }}>
              <span className="font-medium" style={{ color: 'var(--color-text-1)' }}>{usersMap[c.user_id]?.name || 'User'}</span>
              <span style={{ color: 'var(--color-text-3)' }}> · {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <p className="mt-0.5" style={{ color: 'var(--color-text-2)' }}>{c.content}</p>
            </div>
          ))}
          <form onSubmit={handleSubmit} className="flex gap-2 mt-1">
            <input name="content" type="text" required maxLength={500} className="input-field flex-1" placeholder="Add a comment..." style={{ fontSize: '12px', padding: '6px 10px' }} />
            <button type="submit" disabled={loading} className="btn btn-fill disabled:opacity-70" style={{ fontSize: '11px', padding: '6px 12px' }}>
              {loading ? '...' : 'Post'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// ============ RECURRING EXPENSES (Feature 6) ============
export function RecurringExpenseForm({ groupId }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    setLoading(true)
    const formData = new FormData(form)
    formData.append('group_id', groupId)

    const result = await addRecurringExpense(formData)
    if (result?.error) toast.error(result.error)
    else { toast.success('Recurring expense added!'); form.reset() }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input name="description" type="text" required className="input-field flex-1" placeholder="Rent, WiFi..." />
        <input name="amount" type="number" step="0.01" min="0.01" required className="input-field w-24" placeholder="₹ Amt" />
      </div>
      <div className="flex gap-2">
        <select name="frequency" required className="input-field flex-1" style={{ appearance: 'none' }} defaultValue="">
          <option value="" disabled>Frequency</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <input name="next_due" type="date" required className="input-field flex-1" />
      </div>
      <select name="category" className="input-field" style={{ appearance: 'none' }} defaultValue="Bills">
        <option value="Bills">Bills</option>
        <option value="Food & Drink">Food & Drink</option>
        <option value="Transport">Transport</option>
        <option value="Lodging">Lodging</option>
        <option value="Other">Other</option>
      </select>
      <button type="submit" disabled={loading} className="btn btn-fill w-full disabled:opacity-70">
        {loading ? 'Adding...' : 'Add recurring expense'}
      </button>
    </form>
  )
}

export function RecurringExpenseToggle({ id, isActive, groupId }) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const result = await toggleRecurringExpense(id, isActive, groupId)
    if (result?.error) toast.error(result.error)
    setLoading(false)
  }

  return (
    <button onClick={handleToggle} disabled={loading} className="text-[11px] font-medium cursor-pointer" style={{ color: isActive ? 'var(--color-green-text)' : 'var(--color-text-3)' }}>
      {loading ? '...' : isActive ? 'Active' : 'Paused'}
    </button>
  )
}

// ============ EXPORT (Feature 8) ============
export function ExportButtons({ expenses, groupName, currency }) {
  function exportCSV() {
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Paid By']
    const rows = expenses.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.description,
      e.category || 'Other',
      e.amount,
      e.paid_by_name || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${groupName || 'expenses'}-export.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  function exportPDF() {
    window.print()
  }

  return (
    <div className="flex gap-2">
      <button onClick={exportCSV} className="btn btn-outline flex items-center gap-1.5" style={{ fontSize: '11px', padding: '6px 12px' }}>
        <i className="ti ti-file-spreadsheet text-sm"></i> CSV
      </button>
      <button onClick={exportPDF} className="btn btn-outline flex items-center gap-1.5" style={{ fontSize: '11px', padding: '6px 12px' }}>
        <i className="ti ti-printer text-sm"></i> PDF
      </button>
    </div>
  )
}
