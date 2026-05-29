import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import TransactionList from '../components/TransactionList'
import AddTransactionModal from '../components/AddTransactionModal'
import type { TransactionType } from '../lib/db'

const CATEGORY_OPTIONS = ['all','food','transport','rent','utilities','shopping','health','entertainment','education','salary','freelance','other']

export default function Transactions() {
  const [showAdd, setShowAdd]       = useState(false)
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')
  const [catFilter, setCatFilter]   = useState('all')

  const { transactions, loading, refresh } = useTransactions()

  const filtered = transactions.filter(tx => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false
    if (catFilter  !== 'all' && tx.category !== catFilter)  return false
    return true
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>$</span> TRANSACTIONS
          </h1>
          <p className="page-subtitle">{transactions.length} total entries</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + ADD
        </button>
      </div>

      {/* Filters toolbar */}
      <div className="toolbar">
        <label className="text-xs text-muted" style={{ letterSpacing: '0.08em' }}>FILTER:</label>

        <select
          className="filter-select"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as TransactionType | 'all')}
        >
          <option value="all">ALL TYPES</option>
          <option value="income">INCOME</option>
          <option value="expense">EXPENSE</option>
        </select>

        <select
          className="filter-select"
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          {CATEGORY_OPTIONS.map(c => (
            <option key={c} value={c}>{c === 'all' ? 'ALL CATEGORIES' : c.toUpperCase()}</option>
          ))}
        </select>

        <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><span className="blink text-dim">loading…</span></div>
        ) : (
          <TransactionList transactions={filtered} onDelete={refresh} />
        )}
      </div>

      {showAdd && (
        <AddTransactionModal onClose={() => setShowAdd(false)} onSuccess={refresh} />
      )}
    </div>
  )
}
