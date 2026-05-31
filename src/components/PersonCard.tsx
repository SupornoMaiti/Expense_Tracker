import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PersonWithBalance } from '../hooks/useDebts'
import { deletePerson, settleAllDebts } from '../lib/db'

interface Props {
  person: PersonWithBalance
  onDelete: () => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

export default function PersonCard({ person, onDelete }: Props) {
  const { netBalance, activeDebts } = person
  const isCredit  = netBalance > 0  // they owe me
  const isDebit   = netBalance < 0  // I owe them
  const isSettled = netBalance === 0
  const [settling, setSettling] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete ${person.name} and all their debts?`)) return
    await deletePerson(person.id)
    onDelete()
  }

  async function handleSettleAll() {
    if (activeDebts.length === 0) return
    const label = isCredit
      ? `Mark all ${activeDebts.length} debt(s) from ${person.name} as settled?\nThis will record refunds on the Spend page.`
      : `Settle all ${activeDebts.length} debt(s) you owe ${person.name}?\nThis will record expenses on the Spend page.`
    if (!confirm(label)) return
    setSettling(true)
    await settleAllDebts(person.id)
    setSettling(false)
    onDelete() // refresh parent list
  }

  return (
    <div
      className="card"
      style={{
        borderColor: isCredit
          ? 'rgba(0,255,136,0.2)'
          : isDebit
          ? 'rgba(255,165,2,0.2)'
          : 'var(--color-border)',
        transition: 'border-color 220ms ease, box-shadow 220ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Avatar */}
        <div
          className="avatar"
          style={{
            color: isCredit ? 'var(--color-income)' : isDebit ? 'var(--color-warn)' : 'var(--color-text-muted)',
            borderColor: isCredit ? 'rgba(0,255,136,0.3)' : isDebit ? 'rgba(255,165,2,0.3)' : 'var(--color-border)',
          }}
        >
          {getInitials(person.name)}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{person.name}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            {activeDebts.length} active debt{activeDebts.length !== 1 ? 's' : ''}
            {person.phone && (
              <span style={{ marginLeft: 8 }}>· {person.phone}</span>
            )}
          </div>
        </div>

        {/* Balance badge */}
        <div style={{ textAlign: 'right' }}>
          {isSettled ? (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              SETTLED
            </span>
          ) : (
            <>
              <div
                style={{
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 700,
                  color: isCredit ? 'var(--color-income)' : 'var(--color-warn)',
                }}
              >
                {isCredit ? '+' : '-'}{formatINR(netBalance)}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {isCredit ? 'owes you' : 'you owe'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {/* SETTLE ALL — only shown when there are active debts */}
        {activeDebts.length > 0 && (
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
        <Link
          to={`/contacts/${person.id}`}
          className="btn btn-ghost btn-sm"
        >
          VIEW →
        </Link>
        {person.phone && (
          <a
            href={`https://wa.me/${person.phone.replace(/\D/g, '')}?text=${(() => {
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
            WhatsApp
          </a>
        )}
        <button className="btn btn-danger btn-sm" onClick={handleDelete}>
          DEL
        </button>
      </div>
    </div>
  )
}
