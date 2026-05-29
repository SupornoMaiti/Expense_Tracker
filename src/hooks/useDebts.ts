import { useState, useEffect, useCallback } from 'react'
import { getAllPeople, getAllDebts } from '../lib/db'
import type { Person, Debt } from '../lib/db'

export interface PersonWithBalance extends Person {
  netBalance: number    // positive = they owe me, negative = I owe them
  activeDebts: Debt[]
}

export function useDebts() {
  const [people, setPeople] = useState<PersonWithBalance[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [allPeople, allDebts] = await Promise.all([getAllPeople(), getAllDebts()])
      const unsettled = allDebts.filter(d => !d.settled)

      const withBalance: PersonWithBalance[] = allPeople.map(person => {
        const activeDebts = unsettled.filter(d => d.person_id === person.id)
        const netBalance  = activeDebts.reduce((sum, d) => sum + d.amount, 0)
        return { ...person, netBalance, activeDebts }
      })

      setPeople(withBalance)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const totalOwedToMe = people
    .filter(p => p.netBalance > 0)
    .reduce((s, p) => s + p.netBalance, 0)

  const totalIOwe = people
    .filter(p => p.netBalance < 0)
    .reduce((s, p) => s + Math.abs(p.netBalance), 0)

  return { people, loading, refresh, totalOwedToMe, totalIOwe }
}
