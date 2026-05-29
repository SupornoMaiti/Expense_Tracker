import { useState } from 'react'
import { addTransaction } from '../lib/db'
import type { TransactionType } from '../lib/db'
import { CATEGORIES } from './CategoryBadge'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function AddTransactionModal({ onClose, onSuccess }: Props) {
  const [type, setType]         = useState<TransactionType>('expense')
  const [amount, setAmount]     = useState('')
  const [category, setCategory] = useState('food')
  const [description, setDesc]  = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!amount || isNaN(num) || num <= 0) {
      setError('Enter a valid positive amount.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await addTransaction({ type, amount: num, category, description })
      onSuccess()
      onClose()
    } catch (err) {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

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
                  onClick={() => setType(t)}
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
              {saving ? 'SAVING…' : '[ SAVE ]'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
