import { useState } from 'react'
import { addDebt, settleDebt, deleteDebt } from '../lib/db'
import type { PersonWithBalance } from '../hooks/useDebts'
import { useCategories } from '../hooks/useCategories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Trash2, Plus, Users } from 'lucide-react'
import CategoryBadge from './CategoryBadge'

interface Props {
  people: PersonWithBalance[]
  onRefresh: () => void
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DebtLedger({ people, onRefresh }: Props) {
  const [selectedPerson, setSelectedPerson] = useState('')
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [category, setCategory] = useState('other')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const { categories } = useCategories()

  async function handleAddDebt(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!selectedPerson || isNaN(num) || num <= 0) {
      setError('Select a person and enter a valid amount.')
      return
    }
    setAdding(true)
    setError('')
    try {
      await addDebt({
        person_id: selectedPerson,
        transaction_id: null,
        amount: direction === 'credit' ? num : -num,
        category,
        note: note.trim(),
        settled: false,
        due_date: dueDate || undefined,
      })
      setAmount('')
      setNote('')
      setDueDate('')
      onRefresh()
    } catch {
      setError('Failed to add debt entry.')
    } finally {
      setAdding(false)
    }
  }

  const allDebts = people.flatMap(p =>
    p.activeDebts.map(d => ({ ...d, personName: p.name }))
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Plus className="h-4 w-4" /> Quick Add Debt Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleAddDebt} className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="person">Person</Label>
              <Select value={selectedPerson} onValueChange={(v) => v && setSelectedPerson(v)} required>
                <SelectTrigger id="person">
                  {selectedPerson ? people.find(p => p.id === selectedPerson)?.name : <span className="text-muted-foreground">Select person</span>}
                </SelectTrigger>
                <SelectContent>
                  {people.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={direction === 'credit' ? 'default' : 'outline'}
                  className={direction === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-muted-foreground'}
                  onClick={() => setDirection('credit')}
                >
                  Owes Me
                </Button>
                <Button
                  type="button"
                  variant={direction === 'debit' ? 'default' : 'outline'}
                  className={direction === 'debit' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-muted-foreground'}
                  onClick={() => setDirection('debit')}
                >
                  I Owe
                </Button>
              </div>
            </div>

            <div className="space-y-2 flex-1 min-w-[120px]">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2 flex-[2] min-w-[200px]">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                type="text"
                placeholder="e.g., movie tickets"
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2 flex-1 min-w-[150px]">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.name} value={c.name} className="capitalize">
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {direction === 'credit' && (
              <div className="space-y-2 flex-1 min-w-[150px]">
                <Label htmlFor="dueDate">Due Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full justify-start text-left font-normal"
                />
              </div>
            )}

            <Button type="submit" disabled={adding} className="w-full md:w-auto shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white">
              {adding ? 'Adding...' : 'Add Entry'}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-4 bg-muted/20 border-b">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Active Debt Ledger</CardTitle>
          <Badge variant="secondary">{allDebts.length} entries</Badge>
        </CardHeader>
        
        {allDebts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-dashed">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No outstanding debts</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              You're all square! No one owes you, and you don't owe anyone.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {allDebts.map(debt => {
              const isCredit = debt.amount > 0
              return (
                <div key={debt.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-muted/30 transition-colors">
                  <div className="w-24 shrink-0 text-sm text-muted-foreground">
                    {formatDate(debt.created_at)}
                  </div>
                  
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="font-semibold text-foreground truncate">{debt.personName}</div>
                      <div className="text-sm text-muted-foreground truncate">{debt.note || <span className="italic opacity-50">No note</span>}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={debt.category || 'other'} />
                      {debt.due_date && (() => {
                        const due = new Date(debt.due_date)
                        due.setHours(0,0,0,0)
                        const today = new Date(); today.setHours(0,0,0,0)
                        const diff = Math.round((today.getTime() - due.getTime()) / 86400000)
                        const label = diff > 0 ? `${diff}d over` : diff === 0 ? 'today' : `in ${-diff}d`
                        const isOverdue = diff >= 0
                        return (
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${isOverdue ? 'text-destructive border-destructive/30 bg-destructive/10' : 'text-amber-600 border-amber-600/30 bg-amber-500/10 dark:text-amber-400'}`}>
                            {label}
                          </Badge>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 mt-2 md:mt-0">
                    <div className="text-right">
                      <div className={`text-base font-bold tabular-nums ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500'}`}>
                        {isCredit ? '+' : '-'}{formatINR(debt.amount)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                        {isCredit ? 'owes you' : 'you owe'}
                      </div>
                    </div>

                    <div className="flex gap-1 border-l pl-4 border-border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                        title="Mark settled"
                        onClick={async () => { await settleDebt(debt.id); onRefresh() }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                        onClick={async () => { await deleteDebt(debt.id); onRefresh() }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
