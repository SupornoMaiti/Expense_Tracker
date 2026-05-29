import { useState, useEffect, useCallback } from 'react'
import { getAllTransactions } from '../lib/db'
import type { Transaction } from '../lib/db'
import { pushOutbox } from '../lib/sync'
import { useOnlineStatus } from './useOnlineStatus'

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const isOnline = useOnlineStatus()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllTransactions()
      setTransactions(data)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  // Try to sync whenever we come online
  useEffect(() => {
    if (isOnline) {
      pushOutbox().then(({ pushed }) => {
        if (pushed > 0) refresh()
      })
    }
  }, [isOnline, refresh])

  // Derived stats
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  const balance = totalIncome - totalExpense

  const thisMonthExpense = (() => {
    const now = new Date()
    return transactions
      .filter(t => {
        const d = new Date(t.created_at)
        return t.type === 'expense' &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
      })
      .reduce((s, t) => s + t.amount, 0)
  })()

  return { transactions, loading, refresh, totalIncome, totalExpense, balance, thisMonthExpense }
}
