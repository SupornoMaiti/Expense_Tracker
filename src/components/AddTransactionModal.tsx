import React, { useState, useEffect } from 'react'
import { addTransaction, addDebt, getAllPeople, addPerson } from '../lib/db'
import type { Person } from '../lib/db'
import { CATEGORIES } from './CategoryBadge'
import AddPersonModal from './AddPersonModal'

// Expense-only categories (remove income-only ones)
const EXPENSE_CATEGORIES = CATEGORIES.filter(
  c => !['salary', 'freelance'].includes(c)
)

interface Props {
  onClose: () => void
  onSuccess: () => void
}

function todayISO() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

export default function AddTransactionModal({ onClose, onSuccess }: Props) {
  const [amount,      setAmount]   = useState('')
  const [category,    setCategory] = useState('food')
  const [description, setDesc]     = useState('')
  const [date,        setDate]     = useState(todayISO())
  const [saving,      setSaving]   = useState(false)
  const [error,       setError]    = useState('')

  // ── Split state ────────────────────────────────────────────────────────────
  const [splitEnabled,   setSplit]         = useState(false)
  const [people,         setPeople]        = useState<Person[]>([])
  const [splitPersonIds, setSplitPersonIds] = useState<string[]>([])
  const [showAddPerson,  setShowAddPerson] = useState(false)

  const fetchPeople = async () => {
    const p = await getAllPeople()
    setPeople(p)
  }

  useEffect(() => {
    if (splitEnabled && people.length === 0) {
      fetchPeople()
    }
  }, [splitEnabled, people.length])

  const totalAmount = parseFloat(amount) || 0

  // Equal split: total / (friends + 1)
  const friendShare = splitEnabled && splitPersonIds.length > 0 && totalAmount > 0
    ? Math.round((totalAmount / (splitPersonIds.length + 1)) * 100) / 100
    : 0
  const myShare = totalAmount - (friendShare * splitPersonIds.length)

  function togglePerson(id: string) {
    setSplitPersonIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const contactsApiSupported = 'contacts' in navigator && 'ContactsManager' in window

  async function handleBulkImport() {
    if (!contactsApiSupported) {
      alert(
        'The native Contacts picker requires:\n' +
        '• Chrome on Android\n' +
        '• Safari on iOS 14.5+\n\n' +
        'Please use the \"+ ADD\" button to add contacts manually on this device.'
      )
      return
    }
    try {
      setSaving(true)
      // @ts-ignore
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true })
      if (contacts && contacts.length > 0) {
        const newIds: string[] = []
        for (const c of contacts) {
          const p = await addPerson({ name: c.name?.[0] || 'Unknown', phone: c.tel?.[0] || '' })
          newIds.push(p.id)
        }
        const updated = await getAllPeople()
        setPeople(updated)
        setSplitPersonIds(prev => [...new Set([...prev, ...newIds])])
      }
    } catch (err) {
      console.log('Contacts API failed:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || isNaN(totalAmount) || totalAmount <= 0) {
      setError('Enter a valid positive amount.')
      return
    }
    if (splitEnabled && splitPersonIds.length === 0) {
      setError('Select at least one friend to split with.')
      return
    }

    setSaving(true)
    setError('')
    try {
      // 1. Write expense transaction
      const tx = await addTransaction({
        type: 'expense',
        amount: totalAmount,
        category,
        description,
      })

      // 2. Write a debt per selected friend
      if (splitEnabled && splitPersonIds.length > 0 && friendShare > 0) {
        for (const pid of splitPersonIds) {
          await addDebt({
            person_id:      pid,
            transaction_id: tx.id,
            amount:         friendShare,   // positive = they owe me
            note:           description || category,
            settled:        false,
          })
        }
      }

      onSuccess()
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">+ Add Expense</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>

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

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-desc">Description</label>
            <input
              id="tx-desc"
              type="text"
              className="form-input"
              placeholder="e.g., lunch at mess, auto to college..."
              value={description}
              onChange={e => setDesc(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-date">Date</label>
            <input
              id="tx-date"
              type="date"
              className="form-input"
              value={date}
              onChange={e => setDate(e.target.value)}
              max={todayISO()}
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
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* ── Split Section ─────────────────────────────────────────────── */}
          <div className="split-section">
            <button
              type="button"
              className={`split-toggle ${splitEnabled ? 'split-toggle--on' : ''}`}
              onClick={() => setSplit(s => !s)}
            >
              <span className="split-toggle__icon">{splitEnabled ? '⊟' : '⊞'}</span>
              <span>SPLIT WITH FRIENDS</span>
              {splitEnabled && totalAmount > 0 && splitPersonIds.length > 0 && (
                <span className="split-toggle__badge">
                  your share: ₹{myShare.toFixed(2)}
                </span>
              )}
            </button>

            {splitEnabled && (
              <div className="split-body">
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <label className="form-label" style={{ margin: 0 }}>Friends</label>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', color: contactsApiSupported ? 'var(--color-info)' : 'var(--color-text-muted)' }}
                        onClick={handleBulkImport}
                        disabled={saving}
                        title={contactsApiSupported ? 'Import from phone contacts' : 'Requires Android Chrome or iOS Safari'}
                      >
                        📥 IMPORT
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', color: 'var(--color-primary)' }}
                        onClick={() => setShowAddPerson(true)}
                        disabled={saving}
                      >
                        + ADD
                      </button>
                    </div>
                  </div>

                  {people.length === 0 ? (
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', padding: 'var(--space-3)' }}>
                      ⚠ No contacts yet — import or go to Contacts tab to add.
                    </p>
                  ) : (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
                      maxHeight: 150, overflowY: 'auto',
                      padding: 'var(--space-2)', background: 'var(--color-surface-2)',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                    }}>
                      {people.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                          <input
                            type="checkbox"
                            checked={splitPersonIds.includes(p.id)}
                            onChange={() => togglePerson(p.id)}
                          />
                          {p.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preview */}
                {totalAmount > 0 && splitPersonIds.length > 0 && (
                  <div className="split-preview">
                    <div className="split-preview__row">
                      <span>Your share</span>
                      <span style={{ color: 'var(--color-expense)', fontWeight: 700 }}>₹{myShare.toFixed(2)}</span>
                    </div>
                    <div className="split-preview__row">
                      <span>Each friend owes you</span>
                      <span style={{ color: 'var(--color-income)', fontWeight: 700 }}>₹{friendShare.toFixed(2)}</span>
                    </div>
                    <div className="split-preview__note">
                      Debt will be added for {splitPersonIds.length} friend{splitPersonIds.length > 1 ? 's' : ''}.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <p style={{ color: 'var(--color-expense)', fontSize: 'var(--font-size-sm)' }}>⚠ {error}</p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>CANCEL</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'SAVING…' : splitEnabled ? '[ SAVE + SPLIT ]' : '[ SAVE ]'}
            </button>
          </div>
        </form>
      </div>

      {showAddPerson && (
        <AddPersonModal
          onClose={() => setShowAddPerson(false)}
          onSuccess={() => {
            fetchPeople()
            setShowAddPerson(false)
          }}
        />
      )}
    </div>
  )
}
