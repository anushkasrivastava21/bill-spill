import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AddExpenseForm, AddMemberForm, SettleUpForm } from './GroupForms'

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

  // Fold recorded payments into balances so they reduce outstanding debts
  settlementHistory?.forEach(s => {
    if (balances[s.paid_by] !== undefined) balances[s.paid_by] += s.amount
    if (balances[s.paid_to] !== undefined) balances[s.paid_to] -= s.amount
  })

  const debtors = Object.keys(balances).filter(id => balances[id] < -0.01).sort((a, b) => balances[a] - balances[b])
  const creditors = Object.keys(balances).filter(id => balances[id] > 0.01).sort((a, b) => balances[b] - balances[a])

  const debts = []
  
  let i = 0
  let j = 0
  
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    
    const amount = Math.min(-balances[debtor], balances[creditor])
    
    balances[debtor] += amount
    balances[creditor] -= amount
    
    debts.push({
      from: usersMap[debtor]?.name || 'Unknown',
      to: usersMap[creditor]?.name || 'Unknown',
      amount: amount
    })
    
    if (balances[debtor] >= -0.01) i++
    if (balances[creditor] <= 0.01) j++
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link href="/dashboard/groups" className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </Link>
        <div className="flex flex-col">
          <h2 className="font-display-lg text-2xl text-on-surface">{group.name}</h2>
          <span className="font-label-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">group</span>
            {numMembers} members • ₹{totalExpenses.toLocaleString()} total spent
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Expenses & Forms) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Add Expense Form */}
          <div className="glass-card rounded-xl p-6 wave-pattern">
            <h3 className="font-title-md text-lg text-on-surface mb-4">Log a Group Expense</h3>
            <AddExpenseForm groupId={groupId} />
          </div>

          {/* Expenses List */}
          <div>
            <h3 className="font-title-md text-lg text-on-surface mb-4">Voyage Expenses</h3>
            {expenses?.length === 0 ? (
              <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center text-on-surface-variant border-dashed">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
                <p>No expenses logged yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {expenses?.map(exp => (
                  <div key={exp.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {usersMap[exp.paid_by_user]?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-title-md text-on-surface">{exp.description}</span>
                        <span className="font-label-sm text-on-surface-variant text-xs">
                          Paid by {usersMap[exp.paid_by_user]?.name} • {new Date(exp.date).toLocaleDateString('en-US')}
                        </span>
                      </div>
                    </div>
                    <span className="font-title-md text-lg font-bold text-on-surface">
                      ₹{exp.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Debts, Settle Up, History & Members) */}
        <div className="flex flex-col gap-6">
          {/* Who Owes Who */}
          <div className="glass-card rounded-xl p-6 bg-gradient-to-br from-surface to-surface-container-high border-secondary/20">
            <h3 className="font-title-md text-lg text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">handshake</span>
              Who Owes Who
            </h3>

            {debts.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-4">Everyone is settled up! 🎉</p>
            ) : (
              <div className="flex flex-col gap-3">
                {debts.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant/30 shadow-sm">
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-surface text-sm"><span className="font-bold">{s.from}</span> owes</span>
                      <span className="font-label-md text-on-surface-variant text-xs">{s.to}</span>
                    </div>
                    <span className="font-title-md font-bold text-error">₹{s.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Settle Up form — only shown when there are other members to pay */}
            {users && users.filter(u => u.id !== user.id).length > 0 && (
              <div className="mt-4 pt-4 border-t border-outline-variant/30">
                <p className="font-label-sm text-on-surface-variant text-xs mb-3 uppercase tracking-wider">Record a payment you made</p>
                <SettleUpForm groupId={groupId} members={users.filter(u => u.id !== user.id)} />
              </div>
            )}
          </div>

          {/* Payment History */}
          {settlementHistory && settlementHistory.length > 0 && (
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-title-md text-lg text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">receipt_long</span>
                Payment History
              </h3>
              <div className="flex flex-col gap-2">
                {settlementHistory.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-surface text-sm">
                        <span className="font-bold">{usersMap[s.paid_by]?.name || 'Unknown'}</span>
                        {' '}paid{' '}
                        <span className="font-bold">{usersMap[s.paid_to]?.name || 'Unknown'}</span>
                      </span>
                      <span className="font-label-sm text-on-surface-variant text-xs">
                        {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="font-title-md font-bold text-[#15803d]">₹{Number(s.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-title-md text-lg text-on-surface mb-4">Crew Members</h3>
            <div className="flex flex-col gap-3 mb-4">
              {users?.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-bold text-sm">
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-on-surface text-sm">{u.name} {u.id === user.id && '(You)'}</span>
                    <span className="font-label-sm text-on-surface-variant text-[10px]">{u.email}</span>
                  </div>
                </div>
              ))}
            </div>

            {group.created_by === user.id && (
              <AddMemberForm groupId={groupId} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
