import { settleDebt } from '../lib/db'
import type { DebtReminder } from '../lib/db'

interface Props {
  reminders: DebtReminder[]
  onSettle: (debtId: string) => void
  notifPermission: NotificationPermission
  onAskPermission: () => void
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function dueLabel(daysOverdue: number): { label: string; urgent: boolean } {
  if (daysOverdue > 0)  return { label: `${daysOverdue}d overdue`, urgent: true }
  if (daysOverdue === 0) return { label: 'Due today', urgent: true }
  return { label: `Due in ${Math.abs(daysOverdue)}d`, urgent: false }
}

export default function ReminderBanner({ reminders, onSettle, notifPermission, onAskPermission }: Props) {
  if (reminders.length === 0) return null

  const overdue  = reminders.filter(r => r.daysOverdue >= 0)
  const upcoming = reminders.filter(r => r.daysOverdue < 0)
  const hasUrgent = overdue.length > 0

  return (
    <div className={`reminder-banner ${hasUrgent ? 'reminder-banner--urgent' : 'reminder-banner--upcoming'}`}>
      {/* Header row */}
      <div className="reminder-banner__header">
        <div className="reminder-banner__title">
          <span className="reminder-banner__icon">{hasUrgent ? '⚠' : '⏰'}</span>
          {hasUrgent
            ? `${overdue.length} DEBT${overdue.length > 1 ? 'S' : ''} OVERDUE`
            : `${upcoming.length} REPAYMENT${upcoming.length > 1 ? 'S' : ''} DUE SOON`}
        </div>

        {/* Notification permission prompt */}
        {notifPermission === 'default' && (
          <button className="btn btn-ghost btn-sm" onClick={onAskPermission}
            style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warn)' }}>
            🔔 Enable Notifications
          </button>
        )}
        {notifPermission === 'denied' && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            🔕 Notifications blocked
          </span>
        )}
        {notifPermission === 'granted' && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)' }}>
            🔔 Notifications on
          </span>
        )}
      </div>

      {/* Reminder rows */}
      <div className="reminder-banner__list">
        {reminders.map(r => {
          const { label, urgent } = dueLabel(r.daysOverdue)
          return (
            <div key={r.debt.id} className="reminder-row">
              <div className="reminder-row__avatar">
                {r.personName.slice(0, 2).toUpperCase()}
              </div>

              <div className="reminder-row__info">
                <span className="reminder-row__name">{r.personName}</span>
                {r.debt.note && (
                  <span className="reminder-row__note"> · {r.debt.note}</span>
                )}
              </div>

              <div className="reminder-row__amount">
                {formatINR(r.debt.amount)}
              </div>

              <div
                className="reminder-row__due"
                style={{ color: urgent ? 'var(--color-expense)' : 'var(--color-warn)' }}
              >
                {label}
              </div>

              <div className="reminder-row__actions">
                {r.debt.amount > 0 && r.debt.note?.toLowerCase().startsWith('+91') === false && (
                  <a
                    href={`https://wa.me/?text=Hey+${encodeURIComponent(r.personName)}!+Gentle+reminder+—+you+owe+me+${encodeURIComponent(formatINR(r.debt.amount))}.+${r.debt.note ? encodeURIComponent('(' + r.debt.note + ')') : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#25D366', fontSize: 'var(--font-size-xs)' }}
                    title="Send WhatsApp reminder"
                  >
                    📲
                  </a>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-accent)', fontSize: 'var(--font-size-xs)' }}
                  title="Mark as settled"
                  onClick={async () => {
                    await settleDebt(r.debt.id)
                    onSettle(r.debt.id)
                  }}
                >
                  ✓ SETTLE
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
