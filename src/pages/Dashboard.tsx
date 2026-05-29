import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useDebts } from '../hooks/useDebts'
import { useReminders } from '../hooks/useReminders'
import TransactionList from '../components/TransactionList'
import AddTransactionModal from '../components/AddTransactionModal'
import ReminderBanner from '../components/ReminderBanner'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function Dashboard() {
  const [showAdd, setShowAdd] = useState(false)
  const { transactions, loading, refresh, balance, thisMonthExpense, totalIncome } = useTransactions()
  const { totalOwedToMe, totalIOwe } = useDebts()
  const { reminders, refresh: refreshReminders, notifPermission, askPermission } = useReminders()

  const now = new Date()
  const monthName = now.toLocaleString('en', { month: 'long', year: 'numeric' }).toUpperCase()

  return (
    <div>
      {/* Reminder banner — shown only when there are due/overdue lent debts */}
      <ReminderBanner
        reminders={reminders}
        onSettle={() => refreshReminders()}
        notifPermission={notifPermission}
        onAskPermission={askPermission}
      />
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>$</span> DASHBOARD
          </h1>
          <p className="page-subtitle">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + ADD TRANSACTION
        </button>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        <div className="stat-card card-accent">
          <div className="stat-label">Net Balance</div>
          <div
            className="stat-value"
            style={{ color: balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
          >
            {formatINR(balance)}
          </div>
          <div className="stat-delta">total income − expenses</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">{monthName} Spend</div>
          <div className="stat-value" style={{ color: 'var(--color-expense)' }}>
            {formatINR(thisMonthExpense)}
          </div>
          <div className="stat-delta">expenses this month</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Income</div>
          <div className="stat-value" style={{ color: 'var(--color-income)' }}>
            {formatINR(totalIncome)}
          </div>
          <div className="stat-delta">all time</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Owed To You</div>
          <div className="stat-value" style={{ color: totalOwedToMe > 0 ? 'var(--color-income)' : 'var(--color-text-dim)' }}>
            {formatINR(totalOwedToMe)}
          </div>
          <div className="stat-delta text-warn">
            {totalIOwe > 0 && `You owe ${formatINR(totalIOwe)}`}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="panel-header">
          <span className="panel-title">Recent Transactions</span>
          <a href="/transactions" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)' }}>
            VIEW ALL →
          </a>
        </div>

        {loading ? (
          <div className="empty-state">
            <span className="blink text-dim">loading…</span>
          </div>
        ) : (
          <TransactionList transactions={transactions} onDelete={refresh} limit={8} />
        )}
      </div>

      {showAdd && (
        <AddTransactionModal onClose={() => setShowAdd(false)} onSuccess={refresh} />
      )}
    </div>
  )
}
