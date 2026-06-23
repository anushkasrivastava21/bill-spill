import { createClient } from '@/utils/supabase/server'
import ExpenseForm from './ExpenseForm'
import ExpenseList from './ExpenseList'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: expenses } = await supabase
    .from('personal_expenses')
    .select('*')
    .order('date', { ascending: false })

  const totalSpent = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0
  
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const thisMonthExpenses = expenses?.filter(exp => {
    const d = new Date(exp.date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }) || []
  
  const thisMonthSpent = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const count = expenses?.length || 0
  const avg = count > 0 ? (totalSpent / count).toFixed(2) : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="material-symbols-outlined text-primary text-3xl">payments</span>
        <h2 className="font-title-md text-title-md text-on-surface">My Expenses</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="glass-card rounded-xl p-4 flex flex-col gap-1">
          <span className="font-label-sm text-on-surface-variant uppercase tracking-wider text-xs">Total Spent</span>
          <span className="font-display-lg text-2xl text-primary font-bold">₹{totalSpent.toLocaleString()}</span>
        </div>
        <div className="glass-card rounded-xl p-4 flex flex-col gap-1">
          <span className="font-label-sm text-on-surface-variant uppercase tracking-wider text-xs">This Month</span>
          <span className="font-display-lg text-2xl text-primary font-bold">₹{thisMonthSpent.toLocaleString()}</span>
        </div>
        <div className="glass-card rounded-xl p-4 flex flex-col gap-1">
          <span className="font-label-sm text-on-surface-variant uppercase tracking-wider text-xs">Transactions</span>
          <span className="font-display-lg text-2xl text-primary font-bold">{count}</span>
        </div>
        <div className="glass-card rounded-xl p-4 flex flex-col gap-1">
          <span className="font-label-sm text-on-surface-variant uppercase tracking-wider text-xs">Average</span>
          <span className="font-display-lg text-2xl text-primary font-bold">₹{avg}</span>
        </div>
      </div>

      {/* Entry Form */}
      <div className="glass-card rounded-xl p-6 mt-4 wave-pattern">
        <h3 className="font-title-md text-lg text-on-surface mb-4">New Expense</h3>
        <ExpenseForm />
      </div>

      {/* History Table */}
      <div className="mt-4">
        <h3 className="font-title-md text-lg text-on-surface mb-4">History</h3>
        <ExpenseList expenses={expenses || []} />
      </div>
    </div>
  )
}
