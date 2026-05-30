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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className="modal-title">+ Add Contact</span>
            {'contacts' in navigator && 'ContactsManager' in window && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', color: 'var(--color-info)' }}
                onClick={async () => {
                  try {
                    // @ts-ignore - Contacts API is not in standard lib dom yet
                    const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false })
                    if (contacts && contacts.length > 0) {
                      setName(contacts[0].name?.[0] || '')
                      setPhone(contacts[0].tel?.[0] || '')
                    }
                  } catch (err) {
                    console.log('Contacts API failed:', err)
                  }
                }}
              >
                📥 IMPORT
              </button>
            )}
          </div>
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
