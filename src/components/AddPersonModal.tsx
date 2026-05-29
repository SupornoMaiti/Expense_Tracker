import React, { useState } from 'react'
import { addPerson } from '../lib/db'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function AddPersonModal({ onClose, onSuccess }: Props) {
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await addPerson({ name: name.trim(), phone: phone.trim() })
      onSuccess()
      onClose()
    } catch {
      setError('Failed to save person.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">+ Add Contact</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="person-name">Name</label>
            <input
              id="person-name"
              type="text"
              className="form-input"
              placeholder="e.g., Rahul"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="person-phone">
              Phone (optional — for WhatsApp)
            </label>
            <input
              id="person-phone"
              type="tel"
              className="form-input"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
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
              {saving ? 'SAVING…' : '[ ADD ]'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
