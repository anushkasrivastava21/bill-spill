import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AddExpenseForm, AddMemberForm, SettleUpForm, UndoSettlementButton, ExpenseComments, RecurringExpenseForm, RecurringExpenseToggle, ExportButtons } from './GroupForms'
import { formatAmount } from '@/utils/currency'

export default async function GroupDetailsPage({ params }) {
  const { id: groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard/groups')

  const { data: group } = await supabase.from('shared_groups').select('*').eq('id', groupId).single()

  const { data: memberships } = await supabase.from('group_members').select('user_id').eq('group_id', groupId)
  const memberIds = memberships.map(m => m.user_id)
  const { data: users } = await supabase.from('users').select('id, name, email').in('id', memberIds)

  const usersMap = {}
  users?.forEach(u => usersMap[u.id] = u)

  const { data: expenses } = await supabase.from('group_expenses').select('*').eq('group_id', groupId).order('date', { ascending: false })

  const { data: settlementHistory } = await supabase.from('settlements').select('*').eq('group_id', groupId).order('created_at', { ascending: false })

  // Feature 7: Comments
  const expenseIds = expenses?.map(e => e.id) || []
  let allComments = []
  if (expenseIds.length > 0) {
    const { data } = await supabase.from('expense_comments').select('*').in('expense_id', expenseIds).order('created_at', { ascending: true })
    allComments = data || []
  }
  const commentsByExpense = {}
  allComments.forEach(c => {
    if (!commentsByExpense[c.expense_id]) commentsByExpense[c.expense_id] = []
    commentsByExpense[c.expense_id].push(c)
  })

  // Feature 5: Splits
  let allSplits = []
  if (expenseIds.length > 0) {
    const { data } = await supabase.from('expense_splits').select('*').in('expense_id', expenseIds)
    allSplits = data || []
  }
  const splitsByExpense = {}
  allSplits.forEach(s => {
    if (!splitsByExpense[s.expense_id]) splitsByExpense[s.expense_id] = []
    splitsByExpense[s.expense_id].push(s)
  })

  // Feature 6: Recurring
  const { data: recurringExpenses } = await supabase.from('recurring_expenses').select('*').eq('group_id', groupId).order('next_due', { ascending: true })

  // --- SETTLEMENT ALGORITHM (with unequal splits support) ---
  const paid = {}
  const owed = {}
  memberships.forEach(m => { paid[m.user_id] = 0; owed[m.user_id] = 0 })
  
  let totalExpenses = 0
  expenses?.forEach(e => {
    if (paid[e.paid_by_user] !== undefined) {
      paid[e.paid_by_user] += e.amount
      totalExpenses += e.amount
    }
    // If unequal splits exist for this expense, use them
    const customSplits = splitsByExpense[e.id]
    if (customSplits && customSplits.length > 0) {
      customSplits.forEach(s => {
        if (owed[s.user_id] !== undefined) owed[s.user_id] += s.amount
      })
    } else {
      // Equal split
      const numMembers = memberships.length
      const share = numMembers > 0 ? e.amount / numMembers : 0
      memberships.forEach(m => { owed[m.user_id] += share })
    }
  })

  const balances = {}
  memberships.forEach(m => {
    balances[m.user_id] = paid[m.user_id] - owed[m.user_id]
  })

  settlementHistory?.forEach(s => {
    if (balances[s.paid_by] !== undefined) balances[s.paid_by] += s.amount
    if (balances[s.paid_to] !== undefined) balances[s.paid_to] -= s.amount
  })

  const debtors = Object.keys(balances).filter(id => balances[id] < -0.01).sort((a, b) => balances[a] - balances[b])
  const creditors = Object.keys(balances).filter(id => balances[id] > 0.01).sort((a, b) => balances[b] - balances[a])

  const debts = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i], creditor = creditors[j]
    const amount = Math.min(-balances[debtor], balances[creditor])
    balances[debtor] += amount
    balances[creditor] -= amount
    debts.push({ from: usersMap[debtor]?.name || 'Unknown', to: usersMap[creditor]?.name || 'Unknown', amount })
    if (balances[debtor] >= -0.01) i++
    if (balances[creditor] <= 0.01) j++
  }

  const CATEGORY_MAP = {
    'Food & Drink': { icon: 'ti-tools-kitchen-2', bg: 'var(--color-ember-bg)', text: 'var(--color-ember-text)' },
    'Transport':    { icon: 'ti-car',             bg: 'var(--color-green-bg)', text: 'var(--color-green-text)' },
    'Lodging':      { icon: 'ti-home',            bg: 'var(--color-green-bg)', text: 'var(--color-green-text)' },
    'Tickets':      { icon: 'ti-ticket',          bg: 'var(--color-red-bg)',   text: 'var(--color-red-text)' },
    'Groceries':    { icon: 'ti-basket',          bg: 'var(--color-green-bg)', text: 'var(--color-green-text)' },
    'Bills':        { icon: 'ti-bolt',            bg: 'var(--color-red-bg)',   text: 'var(--color-red-text)' },
    'Other':        { icon: 'ti-receipt',         bg: 'var(--color-ember-bg)', text: 'var(--color-ember-text)' },
  }

  // For export: enrich expenses with paid_by_name
  const exportExpenses = expenses?.map(e => ({ ...e, paid_by_name: usersMap[e.paid_by_user]?.name || '' })) || []

  const now = new Date()

  return (
    <div className="flex flex-col gap-6 py-6 print-area">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/groups" className="p-2 rounded-lg transition-colors print:hidden" style={{ color: 'var(--color-text-3)' }}>
            <i className="ti ti-arrow-left text-lg"></i>
          </Link>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-1)', letterSpacing: '-0.3px' }}>{group.name}</h2>
            <span className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>
              {memberships.length} members · {formatAmount(totalExpenses, group.currency)} total
            </span>
          </div>
        </div>
        {/* Feature 8: Export */}
        <div className="print:hidden">
          <ExportButtons expenses={exportExpenses} groupName={group.name} currency={group.currency} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Add Expense (Feature 5: with split type + members) */}
          <div className="section-label print:hidden">Add expense</div>
          <div className="card print:hidden" style={{ padding: '20px' }}>
            <AddExpenseForm groupId={groupId} currencyCode={group.currency} members={users || []} />
          </div>

          {/* Expenses List */}
          <div className="section-label">Expenses</div>
          {expenses?.length === 0 ? (
            <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <i className="ti ti-receipt-off text-3xl mb-2" style={{ color: 'var(--color-text-3)', opacity: 0.5 }}></i>
              <p className="text-[13px]" style={{ color: 'var(--color-text-3)' }}>No expenses logged yet.</p>
            </div>
          ) : (
            <div className="card list-card">
              <div className="list-header">
                <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-2)' }}>Recent</div>
                <span className="text-[12px] font-medium" style={{ color: 'var(--color-ember-text)' }}>{expenses.length} entries</span>
              </div>
              {expenses?.map(exp => {
                const cat = CATEGORY_MAP[exp.category] || CATEGORY_MAP['Other']
                const expSplits = splitsByExpense[exp.id]
                const expComments = commentsByExpense[exp.id] || []
                return (
                  <div key={exp.id}>
                    <div className="expense-row">
                      <div className="exp-icon" style={{ background: cat.bg }}>
                        <i className={`ti ${cat.icon}`} style={{ color: cat.text, fontSize: '16px' }}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-1)' }}>{exp.description}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>
                          {usersMap[exp.paid_by_user]?.name} paid · {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {exp.split_type && exp.split_type !== 'equal' && (
                            <span className="ml-1" style={{ color: 'var(--color-ember-text)' }}>· {exp.split_type} split</span>
                          )}
                        </div>
                        {/* Show custom splits inline */}
                        {expSplits && expSplits.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 mt-1">
                            {expSplits.map(s => (
                              <span key={s.id} className="text-[10px]" style={{ color: 'var(--color-text-3)' }}>
                                {usersMap[s.user_id]?.name}: {formatAmount(s.amount, group.currency)}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Feature 7: Comments */}
                        <div className="mt-1 print:hidden">
                          <ExpenseComments expenseId={exp.id} groupId={groupId} comments={expComments} usersMap={usersMap} />
                        </div>
                      </div>
                      <div className="text-[13px] font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-1)' }}>
                        {formatAmount(exp.amount, group.currency)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Settle Up */}
          <div className="section-label">Settle up</div>
          <div className="card" style={{ padding: '20px' }}>
            {debts.length === 0 ? (
              <p className="text-[13px] text-center py-4" style={{ color: 'var(--color-text-3)' }}>Everyone is settled up! ✓</p>
            ) : (
              <div>
                {debts.map((s, idx) => (
                  <div key={idx} className="settle-row">
                    <div className="avatar" style={{ background: 'var(--color-red-bg)', color: 'var(--color-red-text)' }}>{s.from.charAt(0)}</div>
                    <div className="text-[13px] flex-1">
                      <span className="font-medium" style={{ color: 'var(--color-text-1)' }}>{s.from}</span>
                      {' '}<span style={{ color: 'var(--color-text-3)' }}>owes</span>{' '}
                      <span className="font-medium" style={{ color: 'var(--color-text-1)' }}>{s.to}</span>
                    </div>
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--color-ember-text)' }}>
                      {formatAmount(s.amount, group.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {users && users.filter(u => u.id !== user.id).length > 0 && (
              <div className="mt-4 pt-4 print:hidden" style={{ borderTop: '0.5px solid var(--color-border-subtle)' }}>
                <p className="text-[11px] font-medium uppercase mb-3" style={{ letterSpacing: '1.8px', color: 'var(--color-text-3)' }}>Record a payment</p>
                <SettleUpForm groupId={groupId} members={users.filter(u => u.id !== user.id)} currencyCode={group.currency} />
              </div>
            )}
          </div>

          {/* Payment History */}
          {settlementHistory && settlementHistory.length > 0 && (
            <>
              <div className="section-label">Payment history</div>
              <div className="card list-card">
                {settlementHistory.map(s => {
                  const canUndo = s.paid_by === user.id && (now - new Date(s.created_at)) < 24 * 60 * 60 * 1000
                  return (
                    <div key={s.id} className="expense-row">
                      <div className="avatar" style={{ background: 'var(--color-green-bg)', color: 'var(--color-green-text)' }}>
                        <i className="ti ti-check text-sm"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px]" style={{ color: 'var(--color-text-1)' }}>
                          <span className="font-medium">{usersMap[s.paid_by]?.name || 'Unknown'}</span>
                          {' '}paid{' '}
                          <span className="font-medium">{usersMap[s.paid_to]?.name || 'Unknown'}</span>
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>
                          {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {s.note && ` · ${s.note}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-green-text)' }}>{formatAmount(s.amount, group.currency)}</span>
                        {canUndo && <UndoSettlementButton settlementId={s.id} groupId={groupId} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Feature 6: Recurring Expenses */}
          <div className="section-label print:hidden">Recurring expenses</div>
          <div className="card print:hidden" style={{ padding: '20px' }}>
            {recurringExpenses && recurringExpenses.length > 0 && (
              <div className="mb-4">
                {recurringExpenses.map(re => {
                  const cat = CATEGORY_MAP[re.category] || CATEGORY_MAP['Other']
                  return (
                    <div key={re.id} className="settle-row">
                      <div className="exp-icon" style={{ background: cat.bg, width: '28px', height: '28px' }}>
                        <i className={`ti ${cat.icon}`} style={{ color: cat.text, fontSize: '13px' }}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium" style={{ color: 'var(--color-text-1)' }}>{re.description}</div>
                        <div className="text-[10px]" style={{ color: 'var(--color-text-3)' }}>
                          {re.frequency} · Due {new Date(re.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text-1)' }}>{formatAmount(re.amount, group.currency)}</span>
                        <RecurringExpenseToggle id={re.id} isActive={re.is_active} groupId={groupId} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {group.created_by === user.id && <RecurringExpenseForm groupId={groupId} />}
          </div>

          {/* Members */}
          <div className="section-label">Members</div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="flex flex-col gap-2">
              {users?.map((u, idx) => {
                const avatarStyles = [
                  { bg: 'var(--color-ember-bg)', color: 'var(--color-ember-text)' },
                  { bg: 'var(--color-green-bg)', color: 'var(--color-green-text)' },
                  { bg: 'var(--color-red-bg)', color: 'var(--color-red-text)' },
                ]
                const as = avatarStyles[idx % 3]
                return (
                  <div key={u.id} className="flex items-center gap-3 py-1.5">
                    <div className="avatar" style={{ background: as.bg, color: as.color }}>{u.name?.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0">
                      <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-1)' }}>{u.name} {u.id === user.id && '(You)'}</span>
                      <div className="text-[10px]" style={{ color: 'var(--color-text-3)' }}>{u.email}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            {group.created_by === user.id && (
              <div className="mt-4 pt-4 print:hidden" style={{ borderTop: '0.5px solid var(--color-border-subtle)' }}>
                <AddMemberForm groupId={groupId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
