import { useState, useEffect, useCallback } from 'react'
import { getAllDebts, getAllPeople } from '../lib/db'
import type { DebtReminder } from '../lib/db'
import { fireDebtReminders, requestNotificationPermission } from '../lib/notifications'

// How many days ahead to show an "upcoming" reminder
const UPCOMING_WINDOW_DAYS = 3

function daysDiff(dueDateStr: string): number {
  const due   = new Date(dueDateStr)
  due.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  // positive = overdue, 0 = today, negative = upcoming
}

export function useReminders() {
  const [reminders, setReminders] = useState<DebtReminder[]>([])
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )

  const refresh = useCallback(async () => {
    const [debts, people] = await Promise.all([getAllDebts(), getAllPeople()])
    const nameMap = Object.fromEntries(people.map(p => [p.id, p.name]))

    const active = debts.filter(d =>
      !d.settled &&
      d.amount > 0 &&           // only debts where they owe ME
      d.due_date                 // only ones with a due date set
    )

    const list: DebtReminder[] = active
      .map(debt => ({
        debt,
        personName: nameMap[debt.person_id] ?? 'Unknown',
        daysOverdue: daysDiff(debt.due_date!),
      }))
      // Show overdue + upcoming within the window
      .filter(r => r.daysOverdue >= 0 || Math.abs(r.daysOverdue) <= UPCOMING_WINDOW_DAYS)
      // Sort: most overdue first
      .sort((a, b) => b.daysOverdue - a.daysOverdue)

    setReminders(list)

    // Fire push notifications for overdue/today only (not upcoming)
    const notifPayload = list
      .filter(r => r.daysOverdue >= 0)
      .map(r => ({
        personName: r.personName,
        amount: r.debt.amount,
        daysOverdue: r.daysOverdue,
        debtId: r.debt.id,
      }))
    fireDebtReminders(notifPayload)
  }, [])

  useEffect(() => {
    refresh()
    // Re-check every minute so the dashboard updates without a page reload
    const interval = setInterval(refresh, 60_000)
    return () => clearInterval(interval)
  }, [refresh])

  async function askPermission() {
    const result = await requestNotificationPermission()
    setNotifPermission(result)
    if (result === 'granted') refresh()
    return result
  }

  const overdueCount   = reminders.filter(r => r.daysOverdue >= 0).length
  const upcomingCount  = reminders.filter(r => r.daysOverdue < 0).length

  return { reminders, refresh, overdueCount, upcomingCount, notifPermission, askPermission }
}
