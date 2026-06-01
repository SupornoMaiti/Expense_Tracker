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

const NAV_ITEMS = [
  { to: '/',         label: 'SPEND',    icon: '◈', end: true  },
  { to: '/debts',    label: 'DEBTS',    icon: '⇌', end: false },
  { to: '/contacts', label: 'CONTACTS', icon: '👤', end: false },
] as const

// ── Scroll-to-top on every route change ──────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    const el = document.querySelector('.main-content') as HTMLElement | null
    if (el) el.scrollTop = 0
  }, [pathname])
  return null
}

// ── User menu (avatar + dropdown in topbar) ───────────────────────────────────
function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen]   = useState(false)

  if (!user) return null

  // Derive initials from email
  const initials = (user.email ?? 'U').slice(0, 1).toUpperCase()

  return (
    <div className="account-box" style={{ position: 'relative' }}>
      <button
        id="account-trigger"
        className="account-badge"
        onClick={() => setOpen(o => !o)}
        title={user.email ?? 'User menu'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {initials}
      </button>

      {open && (
        <>
          {/* Click-outside overlay */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 299 }}
            onClick={() => setOpen(false)}
          />
          <div className="account-dropdown" role="menu">
            <div className="account-dropdown__email">{user.email}</div>
            <hr className="account-dropdown__divider" />
            <button
              id="sign-out-btn"
              className="account-dropdown__signout"
              role="menuitem"
              onClick={async () => {
                setOpen(false)
                await signOut()
              }}
            >
              ⏻ Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Boot screen — shown while session is being resolved ──────────────────────
function BootScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', gap: '16px',
    }}>
      <span style={{ fontSize: '2rem', color: 'var(--color-accent)', filter: 'drop-shadow(0 0 12px var(--color-accent))' }}>₹</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        initialising<span className="blink">_</span>
      </span>
    </div>
  )
}

// ── Global FAB wrapper (needs router context) ─────────────────────────────────
function AppShell() {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="app-shell">
      {/* ── Top bar ───────────────────────────────── */}
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__brand-icon">₹</span>
          FINTRACK
        </div>
        <div className="topbar__right">
          <SyncStatusBar />
          <UserMenu />
        </div>
      </header>

      {/* ── Bottom nav (mobile) / Sidebar (desktop) ── */}
      <nav className="sidebar">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => 'sidebar__nav-item' + (isActive ? ' active' : '')}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        {/* Version — desktop sidebar only */}
        <div className="sidebar__footer">
          <div>FINTRACK v2.0</div>
          <div>offline-first PWA</div>
        </div>
      </nav>

      {/* ── Main content ──────────────────────────── */}
      <main className="main-content">
        <ScrollToTop />
        <Routes>
          <Route path="/"             element={<Spend />} />
          <Route path="/debts"        element={<Debts />} />
          <Route path="/log"          element={<Transactions />} />
          <Route path="/contacts"     element={<Contacts />} />
          <Route path="/contacts/:id" element={<PersonDetail />} />
          {/* Legacy route kept for backward compat */}
          <Route path="/debts/:id"    element={<PersonDetail />} />
          <Route path="*"             element={
            <div className="empty-state">
              <div className="empty-state-icon">404</div>
              <p className="empty-state-text">Page not found.</p>
            </div>
          } />
        </Routes>
      </main>

      {/* ── Floating Action Button ─────────────────── */}
      <button
        className="fab"
        onClick={() => setShowAdd(true)}
        title="Add expense"
        aria-label="Add expense"
      >
        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>+</span>
      </button>

      {showAdd && (
        <AddTransactionModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

// ── Auth-gated root ───────────────────────────────────────────────────────────
function AuthGate() {
  const { user, loading } = useAuth()

  if (loading) return <BootScreen />
  if (!user)   return <Login />

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
