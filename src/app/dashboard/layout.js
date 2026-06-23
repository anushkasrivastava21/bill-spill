import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile to show name
  const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).single()

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop SideNav */}
      <nav className="hidden md:flex flex-col p-6 gap-2 bg-surface-container-low h-screen w-64 left-0 top-0 fixed shadow-xl z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>sailing</span>
          <span className="font-display-lg text-title-md text-primary tracking-tight">ShoreSplit</span>
        </div>
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="w-12 h-12 rounded-full border-2 border-primary-container bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <p className="font-title-md text-title-md text-on-surface text-sm truncate w-32">{profile?.name || 'User'}</p>
            <p className="font-body-md text-body-md text-on-surface-variant text-xs truncate w-32">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          <Link href="/dashboard/expenses" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-highest rounded-xl transition-colors font-label-md">
            <span className="material-symbols-outlined">payments</span>
            My Expenses
          </Link>
          <Link href="/dashboard/groups" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-highest rounded-xl transition-colors font-label-md">
            <span className="material-symbols-outlined">diversity_3</span>
            Shared Groups
          </Link>
        </div>
        
        <form action="/auth/signout" method="post" className="mt-auto">
          <button type="submit" className="flex w-full items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-error-container hover:text-error rounded-xl transition-colors font-label-md cursor-pointer">
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </form>
      </nav>

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-40 flex justify-between items-center px-5 h-16 bg-surface/80 backdrop-blur-md border-b border-white/20 shadow-sm md:ml-64 md:w-[calc(100%-16rem)]">
        <div className="flex items-center gap-3 md:hidden">
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>sailing</span>
          <span className="font-display-lg text-headline-lg-mobile text-primary tracking-tight">ShoreSplit</span>
        </div>
        <div className="hidden md:block">
        </div>
        <div className="flex items-center gap-3 md:hidden">
          <form action="/auth/signout" method="post">
            <button type="submit" className="p-2 text-primary hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full md:ml-64 pt-20 pb-24 md:pb-10 px-5 md:px-10 max-w-[1200px] mx-auto min-h-screen">
        {children}
      </main>

      {/* Mobile BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 md:hidden bg-surface/70 backdrop-blur-lg border-t border-white/20 shadow-[0_-4px_20px_rgba(0,93,144,0.1)] rounded-t-xl">
        <Link href="/dashboard/expenses" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:text-primary transition-colors font-label-sm">
          <span className="material-symbols-outlined mb-1 text-xl">payments</span>
          Bills
        </Link>
        <Link href="/dashboard/groups" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:text-primary transition-colors font-label-sm">
          <span className="material-symbols-outlined mb-1 text-xl">diversity_3</span>
          Groups
        </Link>
      </nav>
    </div>
  )
}
