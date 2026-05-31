import React, { useState } from 'react'
import { addCategory, deleteCategory } from '../lib/db'
import { useCategories, DEFAULT_CATEGORIES } from '../hooks/useCategories'

interface Props {
  onClose: () => void
}

export default function ManageCategoriesModal({ onClose }: Props) {
  const { categories, refresh } = useCategories()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📌')
  const [color, setColor] = useState('#00ff88')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const customCategories = categories.filter(c => 
    !DEFAULT_CATEGORIES.some(dc => dc.name === c.name)
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const safeName = name.trim().toLowerCase()
    if (!safeName || !icon) {
      setError('Name and Emoji are required')
      return
    }
    if (categories.some(c => c.name === safeName)) {
      setError('Category already exists')
      return
    }
    setError('')
    setSaving(true)
    try {
      await addCategory({ name: safeName, icon, color })
      setName('')
      setIcon('📌')
      refresh()
    } catch (err) {
      setError('Failed to add category')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Past transactions will fall back to "other" visually.')) return
    try {
      await deleteCategory(id)
      refresh()
    } catch (err) {
      alert('Failed to delete category')
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Manage Categories</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="modal-form" onSubmit={handleAdd} style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Add Custom Category</div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <div className="form-group" style={{ flex: '0 0 60px' }}>
              <label className="form-label">Emoji</label>
              <input type="text" className="form-input" style={{ textAlign: 'center' }} maxLength={2} value={icon} onChange={e => setIcon(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Name</label>
              <input type="text" className="form-input" placeholder="e.g. beer" value={name} onChange={e => setName(e.target.value)} maxLength={20} required />
            </div>
            <div className="form-group" style={{ flex: '0 0 60px' }}>
              <label className="form-label">Color</label>
              <input type="color" className="form-input" style={{ padding: 0, height: 42, cursor: 'pointer' }} value={color} onChange={e => setColor(e.target.value)} required />
            </div>
          </div>
          {error && <div style={{ color: 'var(--color-expense)', fontSize: 'var(--font-size-xs)', marginTop: 4 }}>⚠ {error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-3)' }} disabled={saving}>
            {saving ? 'ADDING...' : 'ADD CATEGORY'}
          </button>
        </form>

        <div style={{ maxHeight: 250, overflowY: 'auto' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>Custom Categories</div>
          {customCategories.length === 0 ? (
            <div className="text-muted text-xs">No custom categories yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {customCategories.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{ fontSize: '1.2rem' }}>{c.icon}</span>
                    <span style={{ textTransform: 'capitalize', color: c.color, fontWeight: 600 }}>{c.name}</span>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-expense)' }} onClick={() => handleDelete(c.id)}>DEL</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
