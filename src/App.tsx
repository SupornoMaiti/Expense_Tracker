import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import SyncStatusBar from './components/SyncStatusBar'
import Dashboard   from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Debts       from './pages/Debts'
import PersonDetail from './pages/PersonDetail'

const NAV_ITEMS = [
  { to: '/',             label: 'DASHBOARD',    icon: '◈' },
  { to: '/transactions', label: 'LEDGER',       icon: '≋' },
  { to: '/debts',        label: 'DEBTS',        icon: '⇌' },
] as const

// ── Scroll-to-top on every route change ──────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Scroll the main-content element, not window (which doesn't scroll here)
    const el = document.querySelector('.main-content') as HTMLElement | null
    if (el) el.scrollTop = 0
  }, [pathname])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* ── Top bar ─────────────────────────────────── */}
        <header className="topbar">
          <div className="topbar__brand">
            <span className="topbar__brand-icon">₹</span>
            FINTRACK
          </div>
          <div className="topbar__right">
            <SyncStatusBar />
          </div>
        </header>

        {/* ── Sidebar / bottom-nav ─────────────────────── */}
        <nav className="sidebar">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                'sidebar__nav-item' + (isActive ? ' active' : '')
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}

          {/* Version — desktop sidebar only, hidden on mobile */}
          <div className="sidebar__footer">
            <div>FINTRACK v1.0</div>
            <div>offline-first PWA</div>
          </div>
        </nav>

        {/* ── Main content ────────────────────────────── */}
        <main className="main-content">
          <ScrollToTop />
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/transactions"  element={<Transactions />} />
            <Route path="/debts"         element={<Debts />} />
            <Route path="/debts/:id"     element={<PersonDetail />} />
            <Route path="*"              element={
              <div className="empty-state">
                <div className="empty-state-icon">404</div>
                <p className="empty-state-text">Page not found.</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
