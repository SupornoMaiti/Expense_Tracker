// ─── Web Notifications API helper ────────────────────────────────────────────
// Works in browser, PWA (installed on Android/desktop). iOS Safari has limited
// support — the reminder banner is shown regardless as a fallback.

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function canNotify(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

export interface ReminderNotification {
  title: string
  body: string
  tag: string       // deduplicates — same tag replaces previous notification
}

export function fireNotification({ title, body, tag }: ReminderNotification): void {
  if (!canNotify()) return
  try {
    // Use service worker notification if available (persists when app is backgrounded)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag,
      })
    } else {
      new Notification(title, { body, tag, icon: '/icons/icon-192.png' })
    }
  } catch {
    // Silently fail — the in-app banner is always shown as fallback
  }
}

export function fireDebtReminders(
  reminders: { personName: string; amount: number; daysOverdue: number; debtId: string }[]
): void {
  if (!canNotify() || reminders.length === 0) return

  const overdue   = reminders.filter(r => r.daysOverdue >= 0)
  const upcoming  = reminders.filter(r => r.daysOverdue < 0)

  if (overdue.length === 1) {
    const r = overdue[0]
    fireNotification({
      title: `💸 ${r.personName} owes you money`,
      body: `₹${r.amount.toFixed(2)} — overdue by ${r.daysOverdue} day${r.daysOverdue !== 1 ? 's' : ''}`,
      tag: `debt-overdue-${r.debtId}`,
    })
  } else if (overdue.length > 1) {
    const total = overdue.reduce((s, r) => s + r.amount, 0)
    fireNotification({
      title: `💸 ${overdue.length} debts are overdue`,
      body: `Total ₹${total.toFixed(2)} — open FinTrack to follow up`,
      tag: 'debt-overdue-multiple',
    })
  }

  if (upcoming.length > 0 && overdue.length === 0) {
    const r = upcoming[0]
    const daysLeft = Math.abs(r.daysOverdue)
    fireNotification({
      title: `⏰ Upcoming: ${r.personName} owes you`,
      body: `₹${r.amount.toFixed(2)} due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      tag: `debt-upcoming-${r.debtId}`,
    })
  }
}
