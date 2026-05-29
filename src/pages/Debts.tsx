import { useState } from 'react'
import { useDebts } from '../hooks/useDebts'
import PersonCard from '../components/PersonCard'
import AddPersonModal from '../components/AddPersonModal'
import DebtLedger from '../components/DebtLedger'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function Debts() {
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [activeTab, setActiveTab] = useState<'people' | 'ledger'>('people')
  const { people, loading, refresh, totalOwedToMe, totalIOwe } = useDebts()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>$</span> DEBTS
          </h1>
          <p className="page-subtitle">{people.length} contact{people.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddPerson(true)}>
          + ADD CONTACT
        </button>
      </div>

      {/* Debt summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 'var(--space-6)' }}>
        <div className="stat-card">
          <div className="stat-label">Owed To You</div>
          <div className="stat-value" style={{ color: totalOwedToMe > 0 ? 'var(--color-income)' : 'var(--color-text-muted)' }}>
            {formatINR(totalOwedToMe)}
          </div>
          <div className="stat-delta">across {people.filter(p => p.netBalance > 0).length} people</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">You Owe</div>
          <div className="stat-value" style={{ color: totalIOwe > 0 ? 'var(--color-warn)' : 'var(--color-text-muted)' }}>
            {formatINR(totalIOwe)}
          </div>
          <div className="stat-delta">across {people.filter(p => p.netBalance < 0).length} people</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
        {(['people', 'ledger'] as const).map(tab => (
          <button
            key={tab}
            className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><span className="blink text-dim">loading…</span></div>
      ) : activeTab === 'people' ? (
        people.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-text">
              No contacts yet.<br />
              Add a friend to start tracking debts.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {people.map(p => (
              <PersonCard key={p.id} person={p} onDelete={refresh} />
            ))}
          </div>
        )
      ) : (
        <DebtLedger people={people} onRefresh={refresh} />
      )}

      {showAddPerson && (
        <AddPersonModal onClose={() => setShowAddPerson(false)} onSuccess={refresh} />
      )}
    </div>
  )
}
