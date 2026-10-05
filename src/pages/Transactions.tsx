import { useState, useEffect, useMemo } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { getAllPeople } from '../lib/db'
import type { Person } from '../lib/db'
import TransactionList from '../components/TransactionList'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Loader2, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function Transactions() {
  const [catFilter, setCatFilter] = useState('all')
  const [personFilter, setPersonFilter] = useState('all')
  const [people, setPeople] = useState<Person[]>([])

  const { transactions, loading, refresh } = useTransactions()
  const { categories } = useCategories()

  useEffect(() => {
    getAllPeople().then(setPeople)
  }, [])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      // In this view, maybe we want to see income and refunds too? 
      // The old logic only showed expenses. Let's show all, but filter by category.
      // If we keep the old logic (only expenses), people might wonder where refunds/income are.
      // Let's show all but allow filtering.
      if (catFilter !== 'all' && tx.category !== catFilter) return false
      // person filter logic (naive implementation matching old behavior)
      if (personFilter !== 'all') {
        const person = people.find(p => p.id === personFilter)
        if (person && !tx.description.toLowerCase().includes(person.name.toLowerCase())) return false
      }
      return true
    })
  }, [transactions, catFilter, personFilter, people])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Activity</h1>
          <p className="text-sm text-muted-foreground mt-1">View and filter your transactions</p>
        </div>
      </div>

      <Card className="bg-muted/30 shadow-none border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filter by:</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
            <Select value={catFilter} onValueChange={(v) => v && setCatFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.name} className="capitalize">
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={personFilter} onValueChange={(v) => v && setPersonFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background">
                <SelectValue placeholder="Person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All People</SelectItem>
                {people.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground whitespace-nowrap self-end sm:self-center">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      <div>
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
          </div>
        ) : (
          <TransactionList transactions={filtered} onDelete={refresh} />
        )}
      </div>
    </div>
  )
}
