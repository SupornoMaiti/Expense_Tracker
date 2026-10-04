import test from 'node:test'
import assert from 'node:assert/strict'

import { fireDebtReminders } from '../src/lib/notifications.ts'

const originalWindow = globalThis.window
const originalNavigator = globalThis.navigator
const originalNotification = globalThis.Notification

let calls = []

class MockNotification {
  static permission = 'granted'

  constructor(title, options) {
    calls.push({ title, options })
  }
}

function installBrowserMocks() {
  calls = []
  Object.defineProperty(globalThis, 'window', {
    value: { Notification: MockNotification },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'navigator', {
    value: {},
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'Notification', {
    value: MockNotification,
    configurable: true,
    writable: true,
  })
}

function restoreBrowserMocks() {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'Notification', {
    value: originalNotification,
    configurable: true,
    writable: true,
  })
}

test.beforeEach(() => {
  installBrowserMocks()
})

test.afterEach(() => {
  restoreBrowserMocks()
})

test('aggregates multiple overdue debts into one summary notification', () => {
  fireDebtReminders([
    { personName: 'A', amount: 100, daysOverdue: 3, debtId: 'd1' },
    { personName: 'B', amount: 250.5, daysOverdue: 1, debtId: 'd2' },
  ])

  assert.equal(calls.length, 1)
  assert.equal(calls[0].title, '💸 2 debts are overdue')
  assert.equal(calls[0].options.body, 'Total ₹350.50 — open FinTrack to follow up')
  assert.equal(calls[0].options.tag, 'debt-overdue-multiple')
})

test('does not send upcoming reminder when an overdue debt exists', () => {
  fireDebtReminders([
    { personName: 'A', amount: 100, daysOverdue: 0, debtId: 'overdue' },
    { personName: 'B', amount: 90, daysOverdue: -2, debtId: 'upcoming' },
  ])

  assert.equal(calls.length, 1)
  assert.match(calls[0].title, /owes you money/)
  assert.equal(calls[0].options.tag, 'debt-overdue-overdue')
})

test('formats singular day correctly for upcoming debt reminders', () => {
  fireDebtReminders([
    { personName: 'A', amount: 49.99, daysOverdue: -1, debtId: 'd1' },
  ])

  assert.equal(calls.length, 1)
  assert.equal(calls[0].title, '⏰ Upcoming: A owes you')
  assert.equal(calls[0].options.body, '₹49.99 due in 1 day')
  assert.equal(calls[0].options.tag, 'debt-upcoming-d1')
})
