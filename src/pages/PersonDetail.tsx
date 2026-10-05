import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPerson, getDebtsByPerson, settleDebt, deleteDebt, addDebt, settleAllDebts } from '../lib/db'
import type { Person, Debt } from '../lib/db'
import { useCategories } from '../hooks/useCategories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, CheckCircle2, MessageCircle, Plus, Trash2, History } from 'lucide-react'
import CategoryBadge from '../components/CategoryBadge'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>()
  const [person, setPerson] = useState<Person | null>(null)
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [direction, setDir] = useState<'credit' | 'debit'>('credit')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [settling, setSettling] = useState(false)
  const [category, setCategory] = useState('other')
  const { categories } = useCategories()
  
  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [p, d] = await Promise.all([getPerson(id), getDebtsByPerson(id)])
    setPerson(p ?? null)
    setDebts(d.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    setLoading(false)
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  const unsettled = debts.filter(d => !d.settled)
  const settled = debts.filter(d => d.settled)
  const netBalance = unsettled.reduce((s, d) => s + d.amount, 0)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) return
    setAdding(true)
    await addDebt({
      person_id: id,
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
    setAdding(false)
    refresh()
  }

  async function handleSettleAll() {
    if (!id || unsettled.length === 0) return
    const isCredit = netBalance > 0
    const label = isCredit
      ? `Mark all ${unsettled.length} debt(s) from ${person?.name} as settled?\nThis will record refunds on the Spend page.`
      : `Settle all ${unsettled.length} debt(s) you owe ${person?.name}?\nThis will record expenses on the Spend page.`
    if (!confirm(label)) return
    setSettling(true)
    await settleAllDebts(id)
    setSettling(false)
    refresh()
  }

  if (loading) return (
    <div className="flex justify-center p-12">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full opacity-50" />
    </div>
  )
  
  if (!person) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4">❌</div>
      <h3 className="text-lg font-medium text-foreground">Contact not found</h3>
      <Link to="/debts" className={buttonVariants({ variant: 'link', className: "mt-2" })}>
        Back to Debts
      </Link>
    </div>
  )

  const isCredit = netBalance > 0
  const isDebit = netBalance < 0
  const isSettled = netBalance === 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/debts" className={buttonVariants({ variant: 'ghost', size: 'sm', className: "mb-4 -ml-2 text-muted-foreground hover:text-foreground" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Debts
        </Link>
      </div>

      <Card className={`overflow-hidden ${isCredit ? 'border-emerald-500/30' : isDebit ? 'border-amber-500/30' : 'border-border'}`}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 shadow-sm" style={{ borderColor: isCredit ? 'rgb(16 185 129 / 0.5)' : isDebit ? 'rgb(245 158 11 / 0.5)' : 'transparent' }}>
                <AvatarFallback className={`text-xl font-semibold ${isCredit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : isDebit ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                  {getInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{person.name}</h2>
                {person.phone && (
                  <p className="text-sm text-muted-foreground">{person.phone}</p>
                )}
              </div>
            </div>

            <div className="md:text-right flex flex-col md:items-end">
              <div className={`text-3xl font-bold tracking-tight tabular-nums ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : isDebit ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}`}>
                {isSettled ? 'SETTLED' : `${isCredit ? '+' : '-'}${formatINR(netBalance)}`}
              </div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">
                {isCredit ? 'owes you' : isDebit ? 'you owe' : 'all clear'}
              </div>
              
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {unsettled.length > 0 && (
                  <Button
                    size="sm"
                    className={`font-medium ${isCredit ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                    onClick={handleSettleAll}
                    disabled={settling}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    {settling ? 'Settling...' : 'Settle All'}
                  </Button>
                )}
                {person.phone && (
                  <a
                    href={`https://wa.me/${person.phone.replace(/\D/g, '')}?text=${(() => {
                      const activeDebts = debts.filter(d => !d.settled)
                      if (activeDebts.length === 0) return encodeURIComponent(`Hey ${person.name}, we are all settled up! 🎉`)
                      
                      let msg = `Hey ${person.name}!\n\nHere is our current balance breakdown:\n`
                      activeDebts.forEach(d => {
                        const amt = Math.abs(d.amount).toFixed(2)
                        const action = d.amount > 0 ? 'You owe me' : 'I owe you'
                        const note = d.note ? ` for ${d.note}` : ''
                        const date = new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        msg += `• ${action} ₹${amt}${note} (${date})\n`
                      })
                      
                      msg += `\nNet Balance: *${isCredit ? 'You owe me' : 'I owe you'} ₹${Math.abs(netBalance).toFixed(2)}*\n\nLet's settle up soon!`
                      return encodeURIComponent(msg)
                    })()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: 'outline', size: 'sm', className: "text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10 border-[#25D366]/20 font-medium" })}
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleAdd} className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
            <div className="space-y-2">
              <Label>Direction</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={direction === 'credit' ? 'default' : 'outline'}
                  className={direction === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-muted-foreground'}
                  onClick={() => setDir('credit')}
                >
                  Owes Me
                </Button>
                <Button
                  type="button"
                  variant={direction === 'debit' ? 'default' : 'outline'}
                  className={direction === 'debit' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-muted-foreground'}
                  onClick={() => setDir('debit')}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
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
                placeholder="e.g., dinner split"
                value={note}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
                maxLength={200}
              />
            </div>
            
            {direction === 'credit' && (
              <div className="space-y-2 flex-1 min-w-[150px]">
                <Label htmlFor="dueDate">Due Date <span className="text-muted-foreground font-normal">(opt)</span></Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full"
                />
              </div>
            )}
            
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
            
            <Button type="submit" disabled={adding} className="w-full md:w-auto shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white">
              {adding ? 'Adding...' : 'Add Entry'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-4 bg-muted/20 border-b">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <History className="h-4 w-4" /> Debt History
          </CardTitle>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="bg-background px-2 py-1 rounded-md border shadow-sm">{unsettled.length} active</span>
            <span className="bg-background px-2 py-1 rounded-md border shadow-sm">{settled.length} settled</span>
          </div>
        </CardHeader>
        
        {debts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-dashed">
            <div className="bg-muted p-4 rounded-full mb-4">
              <History className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <h3 className="text-base font-medium text-foreground">No entries yet</h3>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {debts.map(debt => {
              const isC = debt.amount > 0
              return (
                <div key={debt.id} className={`p-4 flex flex-col md:flex-row md:items-center gap-4 transition-colors ${debt.settled ? 'opacity-50 bg-muted/50' : 'hover:bg-muted/30'}`}>
                  <div className="w-24 shrink-0 text-sm text-muted-foreground">
                    {formatDate(debt.created_at)}
                  </div>
                  
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="font-semibold text-foreground truncate">{debt.note || <span className="italic opacity-50">No note</span>}</div>
                      <div className="mt-1">
                        <CategoryBadge category={debt.category || 'other'} />
                      </div>
                    </div>
                    <div className="flex flex-col items-start justify-center gap-1">
                      {debt.due_date && !debt.settled ? (() => {
                        const due = new Date(debt.due_date); due.setHours(0,0,0,0)
                        const today = new Date(); today.setHours(0,0,0,0)
                        const diff = Math.round((today.getTime() - due.getTime()) / 86400000)
                        const label = diff > 0 ? `${diff}d overdue` : diff === 0 ? 'today' : `in ${-diff}d`
                        const isOverdue = diff >= 0
                        return (
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${isOverdue ? 'text-destructive border-destructive/30 bg-destructive/10' : 'text-amber-600 border-amber-600/30 bg-amber-500/10 dark:text-amber-400'}`}>
                            {label}
                          </Badge>
                        )
                      })() : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 mt-2 md:mt-0">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${debt.settled ? 'text-muted-foreground bg-muted' : isC ? 'text-emerald-600 border-emerald-600/30 bg-emerald-500/10 dark:text-emerald-400' : 'text-amber-600 border-amber-600/30 bg-amber-500/10 dark:text-amber-400'}`}>
                        {debt.settled ? 'Settled' : isC ? 'Owes' : 'Owed'}
                      </Badge>
                      <div className={`text-base font-bold tabular-nums text-right ${isC ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500'}`}>
                        {isC ? '+' : '-'}{formatINR(debt.amount)}
                      </div>
                    </div>

                    {!debt.settled && (
                      <div className="flex gap-1 border-l pl-4 border-border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                          title="Mark settled"
                          onClick={async () => { await settleDebt(debt.id); refresh() }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete"
                          onClick={async () => { await deleteDebt(debt.id); refresh() }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
