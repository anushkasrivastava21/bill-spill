import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AddExpenseForm, AddMemberForm, SettleUpForm } from './GroupForms'
import { formatAmount } from '@/utils/currency'

export default async function GroupDetailsPage({ params }) {
  const { id: groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Verify access
  const { data: membership } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/dashboard/groups')
  }

  // Fetch Group
  const { data: group } = await supabase
    .from('shared_groups')
    .select('*')
    .eq('id', groupId)
    .single()

  // Fetch all members
  const { data: memberships } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)

  const memberIds = memberships.map(m => m.user_id)
  
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', memberIds)

  const usersMap = {}
  users?.forEach(u => usersMap[u.id] = u)

  // Fetch expenses
  const { data: expenses } = await supabase
    .from('group_expenses')
    .select('*')
    .eq('group_id', groupId)
    .order('date', { ascending: false })

  // Fetch recorded payments
  const { data: settlementHistory } = await supabase
    .from('settlements')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  // --- SETTLEMENT ALGORITHM ---
  const paid = {}
  memberships.forEach(m => paid[m.user_id] = 0)
  
  let totalExpenses = 0
  expenses?.forEach(e => {
    if (paid[e.paid_by_user] !== undefined) {
      paid[e.paid_by_user] += e.amount
      totalExpenses += e.amount
    }
  })

  const numMembers = memberships.length
  const share = numMembers > 0 ? totalExpenses / numMembers : 0

  const balances = {}
  memberships.forEach(m => {
    balances[m.user_id] = paid[m.user_id] - share
  })

  // Fold recorded payments into balances
  settlementHistory?.forEach(s => {
    if (balances[s.paid_by] !== undefined) balances[s.paid_by] += s.amount
    if (balances[s.paid_to] !== undefined) balances[s.paid_to] -= s.amount
  })

  const debtors = Object.keys(balances).filter(id => balances[id] < -0.01).sort((a, b) => balances[a] - balances[b])
  const creditors = Object.keys(balances).filter(id => balances[id] > 0.01).sort((a, b) => balances[b] - balances[a])

  const debts = []
  let i = 0, j = 0
  
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = Math.min(-balances[debtor], balances[creditor])
    
    balances[debtor] += amount
    balances[creditor] -= amount
    
    debts.push({
      from: usersMap[debtor]?.name || 'Unknown',
      to: usersMap[creditor]?.name || 'Unknown',
      amount
    })
    
    if (balances[debtor] >= -0.01) i++
    if (balances[creditor] <= 0.01) j++
  }

  // Category icons mapping
  const CATEGORY_MAP = {
    'Food & Drink': { icon: 'ti-tools-kitchen-2', bg: 'var(--color-ember-bg)', text: 'var(--color-ember-text)' },
    'Transport':    { icon: 'ti-car',             bg: 'var(--color-green-bg)', text: 'var(--color-green-text)' },
    'Lodging':      { icon: 'ti-home',            bg: 'var(--color-green-bg)', text: 'var(--color-green-text)' },
    'Tickets':      { icon: 'ti-ticket',          bg: 'var(--color-red-bg)',   text: 'var(--color-red-text)' },
    'Groceries':    { icon: 'ti-basket',          bg: 'var(--color-green-bg)', text: 'var(--color-green-text)' },
    'Other':        { icon: 'ti-receipt',         bg: 'var(--color-ember-bg)', text: 'var(--color-ember-text)' },
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/groups" className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-3)' }}>
          <i className="ti ti-arrow-left text-lg"></i>
        </Link>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-1)', letterSpacing: '-0.3px' }}>{group.name}</h2>
          <span className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>
            {numMembers} members · {formatAmount(totalExpenses, group.currency)} total
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Add Expense */}
          <div className="section-label">Add expense</div>
          <div className="card" style={{ padding: '20px' }}>
            <AddExpenseForm groupId={groupId} currencyCode={group.currency} />
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
                return (
                  <div key={exp.id} className="expense-row">
                    <div className="exp-icon" style={{ background: cat.bg }}>
                      <i className={`ti ${cat.icon}`} style={{ color: cat.text, fontSize: '16px' }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-1)' }}>{exp.description}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>
                        {usersMap[exp.paid_by_user]?.name} paid · {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {exp.category && exp.category !== 'Other' && ` · ${exp.category}`}
                      </div>
                    </div>
                    <div className="text-[13px] font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-1)' }}>
                      {formatAmount(exp.amount, group.currency)}
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
                    <div className="avatar" style={{ background: 'var(--color-red-bg)', color: 'var(--color-red-text)' }}>
                      {s.from.charAt(0)}
                    </div>
                    <div className="text-[13px]">
                      <span className="font-medium" style={{ color: 'var(--color-text-1)' }}>{s.from}</span>
                      {' '}<span style={{ color: 'var(--color-text-3)' }}>owes</span>{' '}
                      <span className="font-medium" style={{ color: 'var(--color-text-1)' }}>{s.to}</span>
                    </div>
                    <div className="ml-auto text-[13px] font-semibold" style={{ color: 'var(--color-ember-text)' }}>
                      {formatAmount(s.amount, group.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Settle Up form */}
            {users && users.filter(u => u.id !== user.id).length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '0.5px solid var(--color-border-subtle)' }}>
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
                {settlementHistory.map(s => (
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
                      </div>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--color-green-text)' }}>{formatAmount(s.amount, group.currency)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

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
                    <div className="avatar" style={{ background: as.bg, color: as.color }}>
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-1)' }}>{u.name} {u.id === user.id && '(You)'}</span>
                      <div className="text-[10px]" style={{ color: 'var(--color-text-3)' }}>{u.email}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {group.created_by === user.id && (
              <div className="mt-4 pt-4" style={{ borderTop: '0.5px solid var(--color-border-subtle)' }}>
                <AddMemberForm groupId={groupId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
