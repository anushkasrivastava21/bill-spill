import { createClient } from '@/utils/supabase/server'
import CreateGroupForm from './CreateGroupForm'
import Link from 'next/link'
import { formatAmount } from '@/utils/currency'

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, shared_groups(*)')
    .eq('user_id', user.id)

  const groups = memberships?.map(m => m.shared_groups) || []
  const groupIds = groups.map(g => g.id)
  
  const { data: allExpenses } = await supabase
    .from('group_expenses')
    .select('*')
    .in('group_id', groupIds)

  const { data: allMemberships } = await supabase
    .from('group_members')
    .select('group_id, user_id')
    .in('group_id', groupIds)

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="section-label">Groups</div>

      {/* Create Group */}
      <CreateGroupForm />

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <i className="ti ti-sailboat text-3xl mb-2" style={{ color: 'var(--color-text-3)', opacity: 0.5 }}></i>
          <p className="text-[13px]" style={{ color: 'var(--color-text-3)' }}>You haven't joined any groups yet.</p>
        </div>
      ) : (
        <div className="card list-card">
          {groups.map((group, idx) => {
            const members = allMemberships?.filter(m => m.group_id === group.id) || []
            const memberCount = members.length || 1
            
            const expenses = allExpenses?.filter(e => e.group_id === group.id) || []
            const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
            const splitAmount = totalSpent / memberCount
            
            const userPaid = expenses.filter(e => e.paid_by_user === user.id).reduce((sum, e) => sum + e.amount, 0)
            const net = userPaid - splitAmount

            let statusText = 'Settled up'
            let statusStyle = { color: 'var(--color-text-3)' }
            
            if (net > 0.01) {
              statusText = `You're owed ${formatAmount(net, group.currency)}`
              statusStyle = { color: 'var(--color-green-text)' }
            } else if (net < -0.01) {
              statusText = `You owe ${formatAmount(Math.abs(net), group.currency)}`
              statusStyle = { color: 'var(--color-red-text)' }
            }

            // Deterministic avatar colors per group position
            const avatarStyles = [
              { bg: 'var(--color-ember-bg)', color: 'var(--color-ember-text)' },
              { bg: 'var(--color-green-bg)', color: 'var(--color-green-text)' },
              { bg: 'var(--color-red-bg)', color: 'var(--color-red-text)' },
            ]

            return (
              <Link 
                key={group.id} 
                href={`/dashboard/groups/${group.id}`} 
                className="group-row"
                style={{ borderBottom: idx < groups.length - 1 ? '0.5px solid var(--color-border-subtle)' : 'none', textDecoration: 'none' }}
              >
                <div className="text-2xl leading-none">🚢</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium" style={{ color: 'var(--color-text-1)' }}>{group.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ ...statusStyle }}>
                    {memberCount} members · {statusText}
                  </div>
                </div>
                <div className="flex -space-x-1.5">
                  {members.slice(0, 3).map((m, mIdx) => (
                    <div 
                      key={m.user_id} 
                      className="avatar" 
                      style={{ 
                        background: avatarStyles[mIdx % 3].bg, 
                        color: avatarStyles[mIdx % 3].color,
                        border: '2px solid var(--color-bg-card)' 
                      }}
                    >
                      {m.user_id.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {memberCount > 3 && (
                    <div 
                      className="avatar" 
                      style={{ 
                        background: 'var(--color-ember-bg)', 
                        color: 'var(--color-ember-text)',
                        border: '2px solid var(--color-bg-card)',
                        fontSize: '9px'
                      }}
                    >
                      +{memberCount - 3}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
