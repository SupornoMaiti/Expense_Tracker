import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import SyncStatusBar from './components/SyncStatusBar'
import AddTransactionModal from './components/AddTransactionModal'
import Login from './pages/Login'
import Spend       from './pages/Spend'
import Debts       from './pages/Debts'
import Contacts    from './pages/Contacts'
import PersonDetail from './pages/PersonDetail'
import Transactions from './pages/Transactions'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LayoutDashboard, ArrowRightLeft, Users, Contact, IndianRupee, Plus, LogOut, Loader2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu'
import { ThemeProvider } from './components/theme-provider'
import { ThemeToggle } from './components/ThemeToggle'

const NAV_ITEMS = [
  { to: '/',         label: 'Spend',       icon: LayoutDashboard, end: true  },
  { to: '/log',      label: 'Activity',    icon: ArrowRightLeft,  end: false },
  { to: '/debts',    label: 'Debts',       icon: Users,           end: false },
  { to: '/contacts', label: 'Contacts',    icon: Contact,         end: false },
] as const

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    const el = document.getElementById('main-scroll-area')
    if (el) el.scrollTop = 0
  }, [pathname])
  return null
}

function UserMenu() {
  const { user, signOut } = useAuth()

  if (!user) return null
  const initials = (user.email ?? 'U').slice(0, 1).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 outline-none hover:bg-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/80">
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Account</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BootScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 animate-pulse">
        <IndianRupee className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium uppercase tracking-widest">
        <Loader2 className="h-4 w-4 animate-spin" />
        Initialising
      </div>
    </div>
  )
}

function AppShell() {
  const [showAdd, setShowAdd] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-dvh w-full flex-col bg-background md:flex-row overflow-hidden">
      {/* ── Top bar (Mobile only) ───────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 md:hidden z-30">
        <div className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400 tracking-tight">
          <IndianRupee className="h-5 w-5" />
          FINTRACK
        </div>
        <div className="flex items-center gap-4">
          <SyncStatusBar />
          <UserMenu />
        </div>
      </header>

      {/* ── Sidebar (Desktop only) ──────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30 z-30">
        <div className="flex h-14 items-center justify-between px-6 border-b border-transparent">
          <div className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
            <IndianRupee className="h-5 w-5" />
            FINTRACK
          </div>
        </div>
        
        <div className="px-4 py-4 flex items-center justify-between">
           <UserMenu />
           <div className="flex items-center gap-2">
             <ThemeToggle />
             <SyncStatusBar />
           </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-xs text-muted-foreground/60">
          <p>FINTRACK v2.0</p>
          <p>offline-first PWA</p>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────── */}
      <main id="main-scroll-area" className="flex-1 overflow-y-auto relative pb-20 md:pb-0 scroll-smooth">
        <ScrollToTop />
        <div className="mx-auto max-w-5xl p-4 md:p-8 lg:p-10">
          <Routes>
            <Route path="/"             element={<Spend />} />
            <Route path="/debts"        element={<Debts />} />
            <Route path="/log"          element={<Transactions />} />
            <Route path="/contacts"     element={<Contacts />} />
            <Route path="/contacts/:id" element={<PersonDetail />} />
            {/* Legacy route kept for backward compat */}
            <Route path="/debts/:id"    element={<PersonDetail />} />
            <Route path="*"             element={
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-4xl font-bold text-muted-foreground/20 mb-4">404</div>
                <p className="text-muted-foreground">This page doesn't exist.</p>
              </div>
            } />
          </Routes>
        </div>
      </main>

      {/* ── Floating Action Button (Mobile only) ─────────────────── */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="Add transaction"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* ── Bottom nav (Mobile only) ──────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-background/90 backdrop-blur-md pb-safe md:hidden">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex h-full flex-1 flex-col items-center justify-center gap-1 relative"
            >
              <div className={`flex flex-col items-center justify-center transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground'}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className="text-[10px] font-medium tracking-wide mt-1">{item.label}</span>
              </div>
            </NavLink>
          )
        })}
      </nav>

      {/* Add Button for Desktop (placed in header typically, or just float bottom right) */}
      <div className="hidden md:block fixed bottom-8 right-8 z-40">
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:shadow-indigo-600/25 hover:-translate-y-1 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="Add transaction"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {showAdd && (
        <AddTransactionModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()

  if (loading) return <BootScreen />
  if (!user)   return <Login />

  return (
    <BrowserRouter>
      <TooltipProvider>
        <AppShell />
      </TooltipProvider>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="fintrack-theme">
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  )
}
