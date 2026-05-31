import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPerson, getDebtsByPerson, settleDebt, deleteDebt, addDebt, settleAllDebts } from '../lib/db'
import type { Person, Debt } from '../lib/db'
import { useCategories } from '../hooks/useCategories'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>()
  const [person, setPerson]   = useState<Person | null>(null)
  const [debts, setDebts]     = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount]   = useState('')
  const [direction, setDir]   = useState<'credit' | 'debit'>('credit')
  const [note, setNote]       = useState('')
  const [dueDate, setDueDate] = useState('')
  const [adding, setAdding]   = useState(false)
  const [settling, setSettling] = useState(false)
  const [category, setCategory] = useState('other')
  const { categories } = useCategories()
  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [p, d] = await Promise.all([getPerson(id), getDebtsByPerson(id)])
    setPerson(p ?? null)
    setDebts(d.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    setLoading(false)
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  const unsettled = debts.filter(d => !d.settled)
  const settled   = debts.filter(d => d.settled)
  const netBalance = unsettled.reduce((s, d) => s + d.amount, 0)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) return
    setAdding(true)
    await addDebt({
      person_id: id,
      transaction_id: null,
      amount: direction === 'credit' ? num : -num,
      category,
      note: note.trim(),
      settled: false,
      due_date: dueDate || undefined,
    })
    setAmount('')
    setNote('')
    setDueDate('')
    setAdding(false)
    refresh()
  }

  async function handleSettleAll() {
    if (!id || unsettled.length === 0) return
    const isCredit = netBalance > 0
    const label = isCredit
      ? `Mark all ${unsettled.length} debt(s) from ${person?.name} as settled?\nThis will record refunds on the Spend page.`
      : `Settle all ${unsettled.length} debt(s) you owe ${person?.name}?\nThis will record expenses on the Spend page.`
    if (!confirm(label)) return
    setSettling(true)
    await settleAllDebts(id)
    setSettling(false)
    refresh()
  }

  if (loading) return <div className="empty-state"><span className="blink text-dim">loading…</span></div>
  if (!person) return (
    <div className="empty-state">
      <div className="empty-state-icon">❌</div>
      <p>Contact not found. <Link to="/debts" className="text-accent">Back to Debts</Link></p>
    </div>
  )

  const isCredit  = netBalance > 0
  const isDebit   = netBalance < 0
  const isSettled = netBalance === 0

  return (
    <div>
      {/* Back nav */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <Link to="/debts" className="btn btn-ghost btn-sm">← BACK</Link>
      </div>

      {/* Person header */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', borderColor: isCredit ? 'rgba(0,255,136,0.3)' : isDebit ? 'rgba(255,165,2,0.3)' : 'var(--color-border)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center' }}>
          <div
            className="avatar"
            style={{
              width: 56, height: 56,
              fontSize: 'var(--font-size-xl)',
              color: isCredit ? 'var(--color-income)' : isDebit ? 'var(--color-warn)' : 'var(--color-text-muted)',
            }}
          >
            {getInitials(person.name)}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {person.name}
            </h2>
            {person.phone && (
              <div className="text-dim text-sm">{person.phone}</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 'var(--font-size-2xl)', fontWeight: 700,
              color: isCredit ? 'var(--color-income)' : isDebit ? 'var(--color-warn)' : 'var(--color-text-muted)',
            }}>
              {isSettled ? 'SETTLED' : `${isCredit ? '+' : '-'}${formatINR(netBalance)}`}
            </div>
            <div className="text-xs text-muted">
              {isCredit ? 'owes you' : isDebit ? 'you owe' : 'all clear'}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {unsettled.length > 0 && (
                <button
                  className="btn btn-sm"
                  style={{
                    background: isCredit ? 'rgba(0,255,136,0.12)' : 'rgba(255,165,2,0.12)',
                    color:       isCredit ? 'var(--color-income)'  : 'var(--color-warn)',
                    border:      `1px solid ${isCredit ? 'rgba(0,255,136,0.3)' : 'rgba(255,165,2,0.3)'}`,
                  }}
                  onClick={handleSettleAll}
                  disabled={settling}
                >
                  {settling ? '⏳' : '✓'} SETTLE ALL
                </button>
              )}
              {person.phone && (
                <a
                  href={`https://wa.me/${person.phone.replace(/\D/g, '')}?text=${(() => {
                    const activeDebts = debts.filter(d => !d.settled)
                    if (activeDebts.length === 0) return encodeURIComponent(`Hey ${person.name}, we are all settled up! 🎉`)
                    
                    let msg = `Hey ${person.name}!\n\nHere is our current balance breakdown:\n`
                    activeDebts.forEach(d => {
                      const amt = Math.abs(d.amount).toFixed(2)
                      const action = d.amount > 0 ? 'You owe me' : 'I owe you'
                      const note = d.note ? ` for ${d.note}` : ''
                      msg += `• ${action} ₹${amt}${note}\n`
                    })
                    
                    msg += `\nNet Balance: *${isCredit ? 'You owe me' : 'I owe you'} ₹${Math.abs(netBalance).toFixed(2)}*\n\nLet's settle up soon!`
                    return encodeURIComponent(msg)
                  })()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#25D366' }}
                >
                  📲 WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick add debt */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="panel-header">
          <span className="panel-title">+ Add Entry</span>
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label className="form-label">Direction</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className={`btn btn-sm ${direction === 'credit' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDir('credit')}>OWES ME</button>
              <button
                type="button"
                className={`btn btn-sm ${direction === 'debit' ? '' : 'btn-ghost'}`}
                style={direction === 'debit' ? { background: 'var(--color-warn)', color: '#000', border: '1px solid var(--color-warn)' } : {}}
                onClick={() => setDir('debit')}
              >I OWE</button>
            </div>
          </div>
          <div className="form-group" style={{ flex: '1 1 120px' }}>
            <label className="form-label">Amount (₹)</label>
            <input type="number" className="form-input" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} min="0.01" step="0.01" required />
          </div>
          <div className="form-group" style={{ flex: '2 1 200px' }}>
            <label className="form-label">Note</label>
            <input type="text" className="form-input" placeholder="e.g., dinner split" value={note} onChange={e => setNote(e.target.value)} maxLength={200} />
          </div>
          {direction === 'credit' && (
            <div className="form-group" style={{ flex: '1 1 140px' }}>
              <label className="form-label">Due Date <span style={{ color: 'var(--color-text-muted)' }}>(opt)</span></label>
              <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            </div>
          )}
          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c.name} value={c.name}>{c.icon} {c.name.charAt(0).toUpperCase() + c.name.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label className="form-label" style={{ visibility: 'hidden' }}>x</label>
            <button type="submit" className="btn btn-primary" disabled={adding}>{adding ? '…' : '[ ADD ]'}</button>
          </div>
        </form>
      </div>

      {/* Debt history */}
      <div className="card">
        <div className="panel-header">
          <span className="panel-title">Debt History</span>
          <span className="text-xs text-muted">{unsettled.length} active · {settled.length} settled</span>
        </div>

        {debts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">No entries yet.</div>
          </div>
        ) : (
          <div className="ledger-table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>CATEGORY</th>
                <th>NOTE</th>
                <th>DUE</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {debts.map(debt => {
                const isC = debt.amount > 0
                return (
                  <tr key={debt.id} style={{ opacity: debt.settled ? 0.4 : 1 }}>
                    <td className="text-xs text-muted">{formatDate(debt.created_at)}</td>
                    <td className="text-xs" style={{ textTransform: 'capitalize' }}>
                      {categories.find(c => c.name === debt.category)?.icon} {debt.category || 'other'}
                    </td>
                    <td>{debt.note || '—'}</td>
                    <td>
                      {debt.due_date && !debt.settled ? (() => {
                        const due = new Date(debt.due_date); due.setHours(0,0,0,0)
                        const today = new Date(); today.setHours(0,0,0,0)
                        const diff = Math.round((today.getTime() - due.getTime()) / 86400000)
                        const label = diff > 0 ? `${diff}d overdue` : diff === 0 ? 'today' : `in ${-diff}d`
                        return <span style={{ fontSize: 'var(--font-size-xs)', color: diff >= 0 ? 'var(--color-expense)' : 'var(--color-warn)', fontWeight: 600 }}>{label}</span>
                      })() : <span className="text-muted text-xs">—</span>}
                    </td>
                    <td style={{ textAlign: 'right', color: isC ? 'var(--color-income)' : 'var(--color-warn)', fontWeight: 700 }}>
                      {isC ? '+' : '-'}{formatINR(debt.amount)}
                    </td>
                    <td>
                      <span className="badge" style={{
                        color: debt.settled ? 'var(--color-text-muted)' : isC ? 'var(--color-income)' : 'var(--color-warn)',
                        backgroundColor: debt.settled ? 'transparent' : isC ? 'rgba(0,255,136,0.1)' : 'rgba(255,165,2,0.1)',
                        borderColor: debt.settled ? 'var(--color-border)' : isC ? 'rgba(0,255,136,0.3)' : 'rgba(255,165,2,0.3)',
                      }}>
                        {debt.settled ? 'SETTLED' : isC ? 'OWES' : 'OWED'}
                      </span>
                    </td>
                    <td>
                      {!debt.settled && (
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-accent)', fontSize: 'var(--font-size-xs)' }} onClick={async () => { await settleDebt(debt.id); refresh() }}>✓</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }} onClick={async () => { await deleteDebt(debt.id); refresh() }}>✕</button>
                        </div>
                      )}
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
