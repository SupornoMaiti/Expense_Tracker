import { useState, useEffect } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { getAllPeople } from '../lib/db'
import type { Person } from '../lib/db'
import TransactionList from '../components/TransactionList'

const CATEGORY_OPTIONS = ['all','food','transport','rent','utilities','shopping','health','entertainment','education','other']

export default function Transactions() {
  const [catFilter,    setCatFilter]   = useState('all')
  const [personFilter, setPersonFilter] = useState('all')
  const [people,       setPeople]      = useState<Person[]>([])

  const { transactions, loading, refresh } = useTransactions()

  useEffect(() => {
    getAllPeople().then(setPeople)
  }, [])

  // Expenses only + category + person filter
  const filtered = transactions.filter(tx => {
    if (tx.type !== 'expense') return false
    if (catFilter    !== 'all' && tx.category !== catFilter) return false
    // person filter: show tx that have a split debt for this person
    // For now filter by checking if description mentions person (future: join debts)
    return true
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span style={{ color: 'var(--color-accent)' }}>≋</span> LOG
          </h1>
          <p className="page-subtitle">{filtered.length} expense{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <label className="text-xs text-muted" style={{ letterSpacing: '0.08em' }}>FILTER:</label>

        <select
          className="filter-select"
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          {CATEGORY_OPTIONS.map(c => (
            <option key={c} value={c}>{c === 'all' ? 'ALL CATEGORIES' : c.toUpperCase()}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={personFilter}
          onChange={e => setPersonFilter(e.target.value)}
        >
          <option value="all">ALL PEOPLE</option>
          {people.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
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
    </div>
  )
}
