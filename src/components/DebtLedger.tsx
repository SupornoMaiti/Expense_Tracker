import { useState } from 'react'
import { addDebt, settleDebt, deleteDebt } from '../lib/db'
import type { PersonWithBalance } from '../hooks/useDebts'

interface Props {
  people: PersonWithBalance[]
  onRefresh: () => void
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DebtLedger({ people, onRefresh }: Props) {
  const [selectedPerson, setSelectedPerson] = useState('')
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function handleAddDebt(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!selectedPerson || isNaN(num) || num <= 0) {
      setError('Select a person and enter a valid amount.')
      return
    }
    setAdding(true)
    setError('')
    try {
      await addDebt({
        person_id: selectedPerson,
        transaction_id: null,
        amount: direction === 'credit' ? num : -num,
        note: note.trim(),
        settled: false,
        due_date: dueDate || undefined,
      })
      setAmount('')
      setNote('')
      setDueDate('')
      onRefresh()
    } catch {
      setError('Failed to add debt entry.')
    } finally {
      setAdding(false)
    }
  }

  // Flat list of all active debts with person name
  const allDebts = people.flatMap(p =>
    p.activeDebts.map(d => ({ ...d, personName: p.name }))
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div>
      {/* Quick add form */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="panel-header">
          <span className="panel-title">+ Quick Add Debt Entry</span>
        </div>
        <form onSubmit={handleAddDebt} style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 150px', minWidth: 140 }}>
            <label className="form-label">Person</label>
            <select
              className="form-select"
              value={selectedPerson}
              onChange={e => setSelectedPerson(e.target.value)}
              required
            >
              <option value="">-- select --</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label className="form-label">Direction</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className={`btn btn-sm ${direction === 'credit' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setDirection('credit')}
                title="They owe me"
              >
                OWES ME
              </button>
              <button
                type="button"
                className={`btn btn-sm ${direction === 'debit' ? '' : 'btn-ghost'}`}
                style={direction === 'debit' ? { background: 'var(--color-warn)', color: '#000', border: '1px solid var(--color-warn)' } : {}}
                onClick={() => setDirection('debit')}
                title="I owe them"
              >
                I OWE
              </button>
            </div>
          </div>

          <div className="form-group" style={{ flex: '1 1 120px', minWidth: 110 }}>
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div className="form-group" style={{ flex: '2 1 200px', minWidth: 150 }}>
            <label className="form-label">Note</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., movie tickets"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Due date — only relevant when they owe me */}
          {direction === 'credit' && (
            <div className="form-group" style={{ flex: '1 1 140px', minWidth: 130 }}>
              <label className="form-label">Due Date <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
              <input
                type="date"
                className="form-input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
          )}

          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label className="form-label" style={{ visibility: 'hidden' }}>x</label>
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? '…' : '[ ADD ]'}
            </button>
          </div>
        </form>
        {error && <p style={{ color: 'var(--color-expense)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>⚠ {error}</p>}
      </div>

      {/* All active debts ledger */}
      <div className="card">
        <div className="panel-header">
          <span className="panel-title">Active Debt Ledger</span>
          <span className="text-xs text-muted">{allDebts.length} entries</span>
        </div>

        {allDebts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🤝</div>
            <div className="empty-state-text">No outstanding debts. You're all square!</div>
          </div>
        ) : (
          <div className="ledger-table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>PERSON</th>
                <th>NOTE</th>
                <th>DUE</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {allDebts.map(debt => {
                const isCredit = debt.amount > 0
                return (
                  <tr key={debt.id}>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {formatDate(debt.created_at)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{debt.personName}</td>
                    <td style={{ color: 'var(--color-text-dim)' }}>{debt.note || '—'}</td>
                    <td>
                      {debt.due_date ? (() => {
                        const due = new Date(debt.due_date)
                        due.setHours(0,0,0,0)
                        const today = new Date(); today.setHours(0,0,0,0)
                        const diff = Math.round((today.getTime() - due.getTime()) / 86400000)
                        const label = diff > 0 ? `${diff}d over` : diff === 0 ? 'today' : `in ${-diff}d`
                        const color = diff >= 0 ? 'var(--color-expense)' : 'var(--color-warn)'
                        return <span style={{ fontSize: 'var(--font-size-xs)', color, fontWeight: 600 }}>{label}</span>
                      })() : <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ color: isCredit ? 'var(--color-income)' : 'var(--color-warn)', fontWeight: 700 }}>
                        {isCredit ? '+' : '-'}{formatINR(debt.amount)}
                      </span>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {isCredit ? 'owes you' : 'you owe'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-accent)', fontSize: 'var(--font-size-xs)' }}
                          title="Mark settled"
                          onClick={async () => { await settleDebt(debt.id); onRefresh() }}
                        >
                          ✓ SETTLE
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}
                          title="Delete"
                          onClick={async () => { await deleteDebt(debt.id); onRefresh() }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
