import { useState } from 'react'
import { useDebts } from '../hooks/useDebts'
import PersonCard from '../components/PersonCard'
import AddPersonModal from '../components/AddPersonModal'
import { addPerson } from '../lib/db'

export default function Contacts() {
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [importing, setImporting] = useState(false)
  const { people, loading, refresh } = useDebts()

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
    setImporting(true)
    try {
      // @ts-ignore - Web Contacts API
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true })
      if (contacts && contacts.length > 0) {
        for (const c of contacts) {
          await addPerson({ name: c.name?.[0] || 'Unknown', phone: c.tel?.[0] || '' })
        }
        refresh()
      }
    } catch (err) {
      console.log('Contacts API failed:', err)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      {/* ── Header ─────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span style={{ color: 'var(--color-accent)' }}>👤</span> CONTACTS
          </h1>
          <p className="page-subtitle">
            {people.length} contact{people.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className="btn btn-ghost"
            onClick={handleBulkImport}
            disabled={importing}
            style={{ color: contactsApiSupported ? 'var(--color-info)' : 'var(--color-text-muted)' }}
            title={contactsApiSupported ? 'Import from phone contacts' : 'Requires Android Chrome or iOS Safari'}
          >
            {importing ? '⏳' : '📥'} IMPORT
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddPerson(true)}>
            + ADD
          </button>
        </div>
      </div>

      {/* ── Contact List ────────────────────────────── */}
      {loading ? (
        <div className="empty-state"><span className="blink text-dim">loading…</span></div>
      ) : people.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-text">
            No contacts yet.<br />
            Add a friend to start splitting bills.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {people.map(p => (
            <PersonCard key={p.id} person={p} onDelete={refresh} />
          ))}
        </div>
      )}

      {showAddPerson && (
        <AddPersonModal
          onClose={() => setShowAddPerson(false)}
          onSuccess={() => { refresh(); setShowAddPerson(false) }}
        />
      )}
    </div>
  )
}
