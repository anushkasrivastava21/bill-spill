import { createClient } from '@/utils/supabase/server'
import CreateGroupForm from './CreateGroupForm'
import Link from 'next/link'

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch groups the user belongs to
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, shared_groups(*)')
    .eq('user_id', user.id)

  const groups = memberships?.map(m => m.shared_groups) || []

  // To calculate balances, we need all members and expenses for these groups
  const groupIds = groups.map(g => g.id)
  
  // We can fetch all expenses for these groups
  const { data: allExpenses } = await supabase
    .from('group_expenses')
    .select('*')
    .in('group_id', groupIds)

  // We need to know member counts for splits
  const { data: allMemberships } = await supabase
    .from('group_members')
    .select('group_id, user_id')
    .in('group_id', groupIds)

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center gap-sm mb-sm">
        <span className="material-symbols-outlined text-primary text-3xl">diversity_3</span>
        <h2 className="font-title-md text-title-md text-on-surface">Active Voyages</h2>
      </div>

      <CreateGroupForm />

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {groups.length === 0 && (
          <div className="col-span-full glass-card rounded-xl p-8 flex flex-col items-center justify-center text-on-surface-variant border-dashed">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">sailing</span>
            <p>You haven't joined any voyages yet.</p>
          </div>
        )}
        
        {groups.map(group => {
          const members = allMemberships?.filter(m => m.group_id === group.id) || []
          const memberCount = members.length || 1
          
          const expenses = allExpenses?.filter(e => e.group_id === group.id) || []
          const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
          const splitAmount = totalSpent / memberCount
          
          const userPaid = expenses.filter(e => e.paid_by_user === user.id).reduce((sum, e) => sum + e.amount, 0)
          const net = userPaid - splitAmount

          let statusText = 'Settled up'
          let statusColor = 'text-outline font-medium'
          let bgColor = 'bg-surface-container-high'
          
          if (net > 0.01) {
            statusText = `You are owed ₹${net.toFixed(2)}`
            statusColor = 'text-[#15803d] font-bold'
            bgColor = 'bg-[#bbf7d0]/50'
          } else if (net < -0.01) {
            statusText = `You owe ₹${Math.abs(net).toFixed(2)}`
            statusColor = 'text-[#b91c1c] font-bold'
            bgColor = 'bg-[#fecaca]/50'
          }

          return (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`} className="glass-card rounded-xl p-md flex flex-col gap-sm hover:shadow-lg transition-all pressable group relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
              
              <div className="flex items-start justify-between z-10">
                <div className="flex flex-col">
                  <h3 className="font-title-md text-lg text-on-surface line-clamp-1">{group.name}</h3>
                  <span className="font-label-sm text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    {memberCount} members
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined">directions_boat</span>
                </div>
              </div>

              <div className="mt-auto pt-4 z-10">
                <div className={`px-3 py-2 rounded-lg ${bgColor} border border-white/40`}>
                  <p className={`font-label-md text-sm ${statusColor} text-center`}>{statusText}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
