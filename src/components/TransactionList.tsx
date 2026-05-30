import React, { useState } from 'react'
import { deleteTransaction } from '../lib/db'
import type { Transaction } from '../lib/db'
import CategoryBadge from './CategoryBadge'

interface Props {
  transactions: Transaction[]
  onDelete?: () => void
  limit?: number
}

function formatAmount(amount: number) {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
  return formatted
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const day   = d.getDate().toString().padStart(2, '0')
  const month = d.toLocaleString('en', { month: 'short' }).toUpperCase()
  const time  = d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
  return { day, month, time }
}

export default function TransactionList({ transactions, onDelete, limit }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const displayed = limit ? transactions.slice(0, limit) : transactions

  if (displayed.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">
          No transactions yet.<br />
          Hit <strong>[ + ADD ]</strong> to record your first entry.
        </div>
      </div>
    )
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    await deleteTransaction(id)
    onDelete?.()
  }

  return (
    <div className="ledger-table-wrap">
      <table className="ledger-table" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ width: 70 }}>DATE</th>
            <th style={{ width: 120 }}>CATEGORY</th>
            <th style={{ width: 100, textAlign: 'right' }}>AMOUNT</th>
            <th></th> {/* spacer */}
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {displayed.map(tx => {
            const { day, month, time } = formatDate(tx.created_at)
            const isExpanded = expandedId === tx.id
            
            return (
              <React.Fragment key={tx.id}>
                <tr 
                  onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                  style={{ cursor: 'pointer', borderBottom: isExpanded ? 'none' : '1px solid var(--color-border)' }}
                >
                  <td>
                    <div style={{ lineHeight: 1.2 }}>
                      <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-text)' }}>
                        {day} {month}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {time}
                      </div>
                      {tx.synced_at === null && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warn)', marginTop: 2 }}>
                          ◌ pending
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <CategoryBadge category={tx.category} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={tx.type === 'income' ? 'amount-income' : 'amount-expense'}>
                      {formatAmount(tx.amount)}
                    </span>
                  </td>
                  <td></td> {/* spacer */}
                  <td>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={(e) => { e.stopPropagation(); handleDelete(tx.id) }}
                      title="Delete transaction"
                      style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                    <td colSpan={5} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)' }}>
                      <strong>Description: </strong>
                      {tx.description ? tx.description : <span style={{ fontStyle: 'italic', opacity: 0.6 }}>No description provided.</span>}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
