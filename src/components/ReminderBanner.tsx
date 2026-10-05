import { settleDebt } from '../lib/db'
import type { DebtReminder } from '../lib/db'
import { Button, buttonVariants } from '@/components/ui/button'
import { Bell, BellOff, BellRing, CheckCircle2, MessageCircle, AlertCircle, Clock } from 'lucide-react'

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

  const overdue = reminders.filter(r => r.daysOverdue >= 0)
  const upcoming = reminders.filter(r => r.daysOverdue < 0)
  const hasUrgent = overdue.length > 0

  return (
    <div className={`rounded-xl border shadow-sm mb-6 overflow-hidden ${hasUrgent ? 'border-destructive/30 bg-destructive/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${hasUrgent ? 'border-destructive/20 bg-destructive/10' : 'border-amber-500/20 bg-amber-500/10'}`}>
        <div className="flex items-center gap-2 font-semibold">
          {hasUrgent ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          )}
          <span className={hasUrgent ? 'text-destructive' : 'text-amber-700 dark:text-amber-500'}>
            {hasUrgent
              ? `${overdue.length} DEBT${overdue.length > 1 ? 'S' : ''} OVERDUE`
              : `${upcoming.length} REPAYMENT${upcoming.length > 1 ? 'S' : ''} DUE SOON`}
          </span>
        </div>

        {notifPermission === 'default' && (
          <Button variant="ghost" size="sm" onClick={onAskPermission} className="h-7 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
            <BellRing className="mr-1.5 h-3.5 w-3.5" />
            Enable Notifications
          </Button>
        )}
        {notifPermission === 'denied' && (
          <div className="flex items-center text-xs text-muted-foreground font-medium">
            <BellOff className="mr-1.5 h-3.5 w-3.5" />
            Notifications blocked
          </div>
        )}
        {notifPermission === 'granted' && (
          <div className="flex items-center text-xs text-indigo-600 font-medium">
            <Bell className="mr-1.5 h-3.5 w-3.5" />
            Notifications on
          </div>
        )}
      </div>

      <div className="divide-y divide-border">
        {reminders.map(r => {
          const { label, urgent } = dueLabel(r.daysOverdue)
          return (
            <div key={r.debt.id} className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between hover:bg-background/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${urgent ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                  {r.personName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">{r.personName}</div>
                  {r.debt.note && (
                    <div className="text-xs text-muted-foreground line-clamp-1">{r.debt.note}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 ml-11 sm:ml-0 mt-1 sm:mt-0">
                <div className="text-left sm:text-right">
                  <div className="font-bold text-sm tabular-nums text-foreground">{formatINR(r.debt.amount)}</div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider ${urgent ? 'text-destructive' : 'text-amber-600 dark:text-amber-500'}`}>
                    {label}
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  {r.debt.amount > 0 && r.debt.note?.toLowerCase().startsWith('+91') === false && (
                    <a
                      href={`https://wa.me/?text=Hey+${encodeURIComponent(r.personName)}!+Gentle+reminder+—+you+owe+me+${encodeURIComponent(formatINR(r.debt.amount))}.+${r.debt.note ? encodeURIComponent('(' + r.debt.note + ')') : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8 text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10" })}
                      title="Send WhatsApp reminder"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                    title="Mark as settled"
                    onClick={async () => {
                      await settleDebt(r.debt.id)
                      onSettle(r.debt.id)
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
