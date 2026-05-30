import { useState, useEffect } from 'react'
import { addTransaction, addDebt, getAllPeople } from '../lib/db'
import type { TransactionType, Person } from '../lib/db'
import { CATEGORIES } from './CategoryBadge'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function AddTransactionModal({ onClose, onSuccess }: Props) {
  const [type, setType]           = useState<TransactionType>('expense')
  const [amount, setAmount]       = useState('')
  const [category, setCategory]   = useState('food')
  const [description, setDesc]    = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // ── Split state ───────────────────────────────────────────────────────────
  const [splitEnabled, setSplit]  = useState(false)
  const [people, setPeople]       = useState<Person[]>([])
  const [splitPersonId, setSplitPerson] = useState('')
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [customShare, setCustomShare]   = useState('')

  useEffect(() => {
    if (splitEnabled && people.length === 0) {
      getAllPeople().then(setPeople)
    }
  }, [splitEnabled, people.length])

  // Computed friend's share
  const totalAmount = parseFloat(amount) || 0
  const friendShare = (() => {
    if (!splitEnabled || totalAmount <= 0) return 0
    if (splitMode === 'equal') return Math.round((totalAmount / 2) * 100) / 100
    const c = parseFloat(customShare)
    return isNaN(c) ? 0 : c
  })()
  const myShare = totalAmount - friendShare

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || isNaN(totalAmount) || totalAmount <= 0) {
      setError('Enter a valid positive amount.')
      return
    }
    if (splitEnabled) {
      if (!splitPersonId) { setError('Select a friend to split with.'); return }
      if (friendShare <= 0 || friendShare >= totalAmount) {
        setError("Friend's share must be between ₹0 and the total amount.")
        return
      }
    }

    setSaving(true)
    setError('')
    try {
      // 1. Record the full expense transaction
      const tx = await addTransaction({ type, amount: totalAmount, category, description })

      // 2. If splitting: create a debt — they owe me their share
      if (splitEnabled && splitPersonId && friendShare > 0) {
        await addDebt({
          person_id: splitPersonId,
          transaction_id: tx.id,
          amount: friendShare,            // positive = they owe me
          note: `Split: ${description || category} (₹${totalAmount})`,
          settled: false,
        })
      }

      onSuccess()
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const splitPerson = people.find(p => p.id === splitPersonId)

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">+ New Transaction</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>

          {/* Type toggle */}
          <div className="form-group">
            <label className="form-label">Type</label>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {(['expense', 'income'] as TransactionType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`btn ${type === t ? (t === 'income' ? 'btn-primary' : 'btn-danger') : 'btn-ghost'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { setType(t); if (t === 'income') setSplit(false) }}
                >
                  {t === 'expense' ? '▼ EXPENSE' : '▲ INCOME'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-amount">Amount (₹)</label>
            <input
              id="tx-amount"
              type="number"
              className="form-input"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              autoFocus
              required
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-category">Category</label>
            <select
              id="tx-category"
              className="form-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES
                .filter(c => type === 'income' ? ['salary','freelance','other'].includes(c) : !['salary','freelance'].includes(c))
                .map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-desc">Description (optional)</label>
            <input
              id="tx-desc"
              type="text"
              className="form-input"
              placeholder="e.g., lunch at mess, metro to college..."
              value={description}
              onChange={e => setDesc(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* ── Split with Friend ─────────────────────────────────────────── */}
          {type === 'expense' && (
            <div className="split-section">
              <button
                type="button"
                className={`split-toggle ${splitEnabled ? 'split-toggle--on' : ''}`}
                onClick={() => setSplit(s => !s)}
              >
                <span className="split-toggle__icon">{splitEnabled ? '⊟' : '⊞'}</span>
                <span>SPLIT WITH FRIEND</span>
                {splitEnabled && totalAmount > 0 && (
                  <span className="split-toggle__badge">
                    your share: ₹{myShare.toFixed(2)}
                  </span>
                )}
              </button>

              {splitEnabled && (
                <div className="split-body">
                  {/* Person selector */}
                  <div className="form-group">
                    <label className="form-label">Friend</label>
                    {people.length === 0 ? (
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', padding: 'var(--space-3)' }}>
                        ⚠ No contacts yet — add someone in the Debts page first.
                      </p>
                    ) : (
                      <select
                        className="form-select"
                        value={splitPersonId}
                        onChange={e => setSplitPerson(e.target.value)}
                        required={splitEnabled}
                      >
                        <option value="">-- select friend --</option>
                        {people.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Split mode */}
                  <div className="form-group">
                    <label className="form-label">Split</label>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${splitMode === 'equal' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setSplitMode('equal')}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        50 / 50
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${splitMode === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setSplitMode('custom')}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        CUSTOM
                      </button>
                    </div>
                  </div>

                  {splitMode === 'custom' && (
                    <div className="form-group">
                      <label className="form-label">
                        {splitPerson ? splitPerson.name + "'s" : "Friend's"} share (₹)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0.00"
                        value={customShare}
                        onChange={e => setCustomShare(e.target.value)}
                        min="0.01"
                        step="0.01"
                        max={totalAmount - 0.01}
                      />
                    </div>
                  )}

                  {/* Preview */}
                  {totalAmount > 0 && splitPersonId && (
                    <div className="split-preview">
                      <div className="split-preview__row">
                        <span>Your share</span>
                        <span style={{ color: 'var(--color-expense)', fontWeight: 700 }}>
                          ₹{myShare.toFixed(2)}
                        </span>
                      </div>
                      <div className="split-preview__row">
                        <span>{splitPerson?.name ?? 'Friend'} owes you</span>
                        <span style={{ color: 'var(--color-income)', fontWeight: 700 }}>
                          ₹{friendShare.toFixed(2)}
                        </span>
                      </div>
                      <div className="split-preview__note">
                        Debt entry will be added to {splitPerson?.name ?? 'friend'}'s ledger automatically.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--color-expense)', fontSize: 'var(--font-size-sm)' }}>
              ⚠ {error}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              CANCEL
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'SAVING…' : splitEnabled ? '[ SAVE + SPLIT ]' : '[ SAVE ]'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
