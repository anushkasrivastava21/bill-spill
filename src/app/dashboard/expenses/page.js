import { createClient } from '@/utils/supabase/server'
import ExpenseForm from './ExpenseForm'
import ExpenseList from './ExpenseList'
import { PersonalExportButtons } from './ExportButtons'

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
  const avg = count > 0 ? (totalSpent / count).toFixed(0) : 0

  return (
    <div className="flex flex-col gap-6 py-6 print-area">
      <div className="flex items-center justify-between">
        <div className="section-label">Dashboard</div>
        <div className="print:hidden">
          <PersonalExportButtons expenses={expenses || []} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card stat-card">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value"><span className="stat-currency">₹</span>{totalSpent.toLocaleString()}</div>
          <div className="stat-tag tag-ember">{count} entries</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">This Month</div>
          <div className="stat-value"><span className="stat-currency">₹</span>{thisMonthSpent.toLocaleString()}</div>
          <div className="stat-tag tag-red">{thisMonthExpenses.length} this month</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{count}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Average</div>
          <div className="stat-value"><span className="stat-currency">₹</span>{avg}</div>
        </div>
      </div>

      {/* Entry Form */}
      <div className="section-label mt-4 print:hidden">Add expense</div>
      <div className="card print:hidden" style={{ padding: '20px' }}>
        <ExpenseForm />
      </div>

      {/* History */}
      <div className="section-label mt-4">History</div>
      <ExpenseList expenses={expenses || []} />
    </div>
  )
}
