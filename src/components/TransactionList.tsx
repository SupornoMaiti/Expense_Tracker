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
    <table className="ledger-table">
      <thead>
        <tr>
          <th style={{ width: 60 }}>DATE</th>
          <th>DESCRIPTION</th>
          <th>CATEGORY</th>
          <th style={{ textAlign: 'right' }}>AMOUNT</th>
          <th style={{ width: 40 }}></th>
        </tr>
      </thead>
      <tbody>
        {displayed.map(tx => {
          const { day, month, time } = formatDate(tx.created_at)
          return (
            <tr key={tx.id}>
              <td>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-text)' }}>
                    {day} {month}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {time}
                  </div>
                </div>
              </td>
              <td>
                <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                  {tx.description || '—'}
                </div>
                {tx.synced_at === null && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warn)' }}>
                    ◌ pending
                  </span>
                )}
              </td>
              <td>
                <CategoryBadge category={tx.category} />
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className={tx.type === 'income' ? 'amount-income' : 'amount-expense'}>
                  {formatAmount(tx.amount)}
                </span>
              </td>
              <td>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => handleDelete(tx.id)}
                  title="Delete transaction"
                  style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}
                >
                  ✕
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
