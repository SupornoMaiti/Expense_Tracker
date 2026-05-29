import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import SyncStatusBar from './components/SyncStatusBar'
import Dashboard   from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Debts       from './pages/Debts'
import PersonDetail from './pages/PersonDetail'

const NAV_ITEMS = [
  { to: '/',             label: 'DASHBOARD',     icon: '⬛' },
  { to: '/transactions', label: 'TRANSACTIONS',  icon: '≡' },
  { to: '/debts',        label: 'DEBTS',         icon: '⇄' },
] as const

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

        {/* ── Sidebar navigation ──────────────────────── */}
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
              {item.label}
            </NavLink>
          ))}

          <div style={{ flex: 1 }} />

          {/* Version / info footer */}
          <div style={{
            padding: 'var(--space-3) var(--space-5)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
          }}>
            <div>FINTRACK v1.0</div>
            <div>offline-first PWA</div>
          </div>
        </nav>

        {/* ── Main content ────────────────────────────── */}
        <main className="main-content">
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
