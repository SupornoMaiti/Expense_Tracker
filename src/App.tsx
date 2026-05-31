import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import SyncStatusBar from './components/SyncStatusBar'
import AddTransactionModal from './components/AddTransactionModal'
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

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
