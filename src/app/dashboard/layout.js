import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ThemeToggle from './ThemeToggle'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).single()

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg-page)' }}>
      {/* Desktop SideNav */}
      <nav className="hidden md:flex flex-col p-6 gap-2 h-screen w-64 left-0 top-0 fixed z-50" style={{ background: 'var(--color-bg-card)', borderRight: '0.5px solid var(--color-border)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'var(--color-ember)' }}>
            <i className="ti ti-receipt-2 text-white text-base"></i>
          </div>
          <span className="text-[17px] font-semibold" style={{ letterSpacing: '-0.3px', color: 'var(--color-text-1)' }}>Bill Spill</span>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: 'var(--color-ember-bg)', color: 'var(--color-ember-text)' }}>
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate w-32" style={{ color: 'var(--color-text-1)' }}>{profile?.name || 'User'}</p>
            <p className="text-[11px] truncate w-32" style={{ color: 'var(--color-text-3)' }}>{user.email}</p>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex flex-col gap-1 flex-1">
          <Link href="/dashboard/expenses" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors" style={{ color: 'var(--color-text-2)' }} onMouseOver="this.style.background='var(--color-bg-inset)'" onMouseOut="this.style.background='transparent'">
            <i className="ti ti-wallet text-base"></i>
            My Expenses
          </Link>
          <Link href="/dashboard/groups" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors" style={{ color: 'var(--color-text-2)' }}>
            <i className="ti ti-users-group text-base"></i>
            Shared Groups
          </Link>
        </div>
        
        {/* Bottom */}
        <div className="mt-auto flex flex-col gap-1">
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <button type="submit" className="flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer" style={{ color: 'var(--color-text-3)' }}>
              <i className="ti ti-logout text-base"></i>
              Logout
            </button>
          </form>
        </div>
      </nav>

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-40 flex justify-between items-center px-5 h-14 md:ml-64 md:w-[calc(100%-16rem)]" style={{ background: 'var(--color-bg-card)', borderBottom: '0.5px solid var(--color-border)' }}>
        <div className="flex items-center gap-2.5 md:hidden">
          <div className="w-7 h-7 flex items-center justify-center rounded-md" style={{ background: 'var(--color-ember)' }}>
            <i className="ti ti-receipt-2 text-white text-sm"></i>
          </div>
          <span className="text-[15px] font-semibold" style={{ letterSpacing: '-0.3px', color: 'var(--color-text-1)' }}>Bill Spill</span>
        </div>
        <div className="hidden md:block"></div>
        <div className="flex items-center gap-3 md:hidden">
          <form action="/auth/signout" method="post">
            <button type="submit" className="p-2 transition-opacity" style={{ color: 'var(--color-text-3)' }}>
              <i className="ti ti-logout text-lg"></i>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full md:ml-64 pt-18 pb-24 md:pb-10 px-5 md:px-10 max-w-[900px] mx-auto min-h-screen">
        {children}
      </main>

      {/* Mobile BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 md:hidden" style={{ background: 'var(--color-bg-card)', borderTop: '0.5px solid var(--color-border)' }}>
        <Link href="/dashboard/expenses" className="flex flex-col items-center justify-center px-4 py-1 transition-colors text-[11px]" style={{ color: 'var(--color-text-3)' }}>
          <i className="ti ti-wallet text-lg mb-0.5"></i>
          Bills
        </Link>
        <Link href="/dashboard/groups" className="flex flex-col items-center justify-center px-4 py-1 transition-colors text-[11px]" style={{ color: 'var(--color-text-3)' }}>
          <i className="ti ti-users-group text-lg mb-0.5"></i>
          Groups
        </Link>
      </nav>
    </div>
  )
}
