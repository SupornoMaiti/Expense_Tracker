import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import CategoryBadge from '../components/CategoryBadge'

const CATEGORY_COLORS: Record<string, string> = {
  food:          '#00ff88',
  transport:     '#00ccff',
  rent:          '#ffaa00',
  entertainment: '#ff6b6b',
  health:        '#bb88ff',
  other:         '#888888',
  utilities:     '#f39c12',
  shopping:      '#e91e63',
  education:     '#1abc9c',
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.getDate().toString().padStart(2, '0') + ' ' +
    d.toLocaleString('en', { month: 'short' }).toUpperCase()
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Spend() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())   // 0-indexed

  const { transactions, loading } = useTransactions()

  // Filter to selected month — expenses + refunds both needed
  const monthTxs = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.type !== 'expense' && tx.type !== 'refund') return false
      const d = new Date(tx.created_at)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [transactions, year, month])

  const expenseTxs = useMemo(() => monthTxs.filter(t => t.type === 'expense'), [monthTxs])
  const refundTxs  = useMemo(() => monthTxs.filter(t => t.type === 'refund'),  [monthTxs])

  // Net spend = gross expenses − refunds received
  const grossSpend  = useMemo(() => expenseTxs.reduce((s, t) => s + t.amount, 0), [expenseTxs])
  const totalRefund = useMemo(() => refundTxs.reduce((s, t) => s + t.amount, 0),  [refundTxs])
  const totalSpend  = Math.max(0, grossSpend - totalRefund)

  // Pie: category breakdown — expenses only (not refunds)
  const pieData = useMemo(() => {
    const map: Record<string, number> = {}
    expenseTxs.forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [expenseTxs])

  // Bar: daily spend — expenses only
  const barData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const map: Record<number, number> = {}
    expenseTxs.forEach(t => {
      const day = new Date(t.created_at).getDate()
      map[day] = (map[day] || 0) + t.amount
    })
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: map[i + 1] || 0,
    }))
  }, [expenseTxs, year, month])

  const todayDay = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1

  // Navigate month
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Custom pie label
  const renderLabel = ({ name, percent }: { name?: string; percent?: number }) =>
    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* ── Month Navigator ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            <span style={{ color: 'var(--color-accent)' }}>◈</span> SPEND
          </h1>
          <p className="page-subtitle">expense overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>←</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', minWidth: 80, textAlign: 'center' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>→</button>
        </div>
      </div>

      {/* ── Summary Card ────────────────────────────── */}
      <div className="card" style={{ borderColor: 'rgba(0,255,136,0.2)', textAlign: 'center', padding: 'var(--space-6)' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
          THIS MONTH
        </div>
        <div style={{
          fontSize: 'clamp(1.8rem, 6vw, 2.5rem)',
          fontWeight: 700,
          color: totalSpend > 0 ? 'var(--color-expense)' : 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
          textShadow: totalSpend > 0 ? '0 0 20px rgba(255,71,87,0.3)' : 'none',
        }}>
          {loading ? '—' : formatINR(totalSpend)}
        </div>
        {totalRefund > 0 && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)', marginTop: 'var(--space-1)', fontFamily: 'var(--font-mono)' }}>
            −{formatINR(totalRefund)} refunded → gross {formatINR(grossSpend)}
          </div>
        )}
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
          {expenseTxs.length} expense{expenseTxs.length !== 1 ? 's' : ''} logged
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><span className="blink text-dim">loading…</span></div>
      ) : expenseTxs.length === 0 && refundTxs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">No expenses in {MONTH_NAMES[month]} {year}.<br />Hit + to log one.</div>
        </div>
      ) : (
        <>
          {/* ── Charts Row ──────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'var(--space-4)' }}>

            {/* Pie Chart */}
            <div className="card">
              <div className="panel-header" style={{ marginBottom: 'var(--space-4)' }}>
                <span className="panel-title">BY CATEGORY</span>
              </div>
              {pieData.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={renderLabel}
                        labelLine={false}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#888888'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [typeof v === 'number' ? formatINR(v) : v, 'Amount']}
                        contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                    {pieData.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[d.name] || '#888' }} />
                        {d.name} · {formatINR(d.value)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Bar Chart */}
            <div className="card">
              <div className="panel-header" style={{ marginBottom: 'var(--space-4)' }}>
                <span className="panel-title">DAILY SPEND</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                  />
                  <Tooltip
                    formatter={(v) => [typeof v === 'number' ? formatINR(v) : v, 'Amount']}
                    labelFormatter={(l) => `Day ${l}`}
                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text)' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                    {barData.map((entry) => (
                      <Cell
                        key={entry.day}
                        fill={entry.day === todayDay ? '#ffffff' : '#00ff88'}
                        fillOpacity={entry.amount === 0 ? 0.1 : 0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Recent Expenses ─────────────────────────── */}
          <div className="card">
            <div className="panel-header">
              <span className="panel-title">RECENT EXPENSES</span>
              <Link to="/log" className="btn btn-ghost btn-sm" style={{ fontSize: 'var(--font-size-xs)' }}>
                VIEW ALL →
              </Link>
            </div>
            <div>
              {monthTxs.slice(0, 5).map((tx, i) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) 0',
                    borderBottom: i < Math.min(monthTxs.length, 5) - 1 ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', minWidth: 48, fontFamily: 'var(--font-mono)' }}>
                    {formatDate(tx.created_at)}
                  </div>
                  <div style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: tx.type === 'refund' ? 'var(--color-accent)' : 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.type === 'refund' && <span style={{ marginRight: 4, fontSize: 'var(--font-size-xs)' }}>↩</span>}
                    {tx.description || '—'}
                  </div>
                  <CategoryBadge category={tx.category} showIcon={false} />
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: tx.type === 'refund' ? 'var(--color-accent)' : 'var(--color-expense)', fontSize: 'var(--font-size-sm)', minWidth: 70, textAlign: 'right' }}>
                    {tx.type === 'refund' ? '-' : ''}{formatINR(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
