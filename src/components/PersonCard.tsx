import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PersonWithBalance } from '../hooks/useDebts'
import { deletePerson, settleAllDebts } from '../lib/db'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Trash2, CheckCircle2, ArrowRight, MessageCircle } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface Props {
  person: PersonWithBalance
  onDelete: () => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

export default function PersonCard({ person, onDelete }: Props) {
  const { netBalance, activeDebts } = person
  const isCredit  = netBalance > 0  // they owe me
  const isDebit   = netBalance < 0  // I owe them
  const isSettled = netBalance === 0
  const [settling, setSettling] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete ${person.name} and all their debts?`)) return
    await deletePerson(person.id)
    onDelete()
  }

  async function handleSettleAll() {
    if (activeDebts.length === 0) return
    const label = isCredit
      ? `Mark all ${activeDebts.length} debt(s) from ${person.name} as settled?\nThis will record refunds on the Spend page.`
      : `Settle all ${activeDebts.length} debt(s) you owe ${person.name}?\nThis will record expenses on the Spend page.`
    if (!confirm(label)) return
    setSettling(true)
    await settleAllDebts(person.id)
    setSettling(false)
    onDelete()
  }

  return (
    <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md ${isCredit ? 'border-emerald-500/30' : isDebit ? 'border-amber-500/30' : 'border-border'}`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 shadow-sm" style={{ borderColor: isCredit ? 'rgb(16 185 129 / 0.5)' : isDebit ? 'rgb(245 158 11 / 0.5)' : 'transparent' }}>
            <AvatarFallback className={`font-semibold ${isCredit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : isDebit ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
              {getInitials(person.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-base">{person.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span>{activeDebts.length} active</span>
              {person.phone && (
                <>
                  <span>•</span>
                  <span className="truncate">{person.phone}</span>
                </>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            {isSettled ? (
              <Badge variant="secondary" className="font-medium">
                Settled
              </Badge>
            ) : (
              <div className="flex flex-col items-end">
                <span className={`text-lg font-bold tabular-nums tracking-tight ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500'}`}>
                  {isCredit ? '+' : '-'}{formatINR(netBalance)}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">
                  {isCredit ? 'owes you' : 'you owe'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border justify-end flex-wrap">
          {activeDebts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className={`h-8 font-medium ${isCredit ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20' : 'text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-900/50 dark:hover:bg-amber-900/20'}`}
              onClick={handleSettleAll}
              disabled={settling}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              {settling ? 'Settling...' : 'Settle All'}
            </Button>
          )}

          {person.phone && (
            <a
              href={`https://wa.me/${person.phone.replace(/\D/g, '')}?text=${(() => {
                if (activeDebts.length === 0) return encodeURIComponent(`Hey ${person.name}, we are all settled up! 🎉`)
                
                let msg = `Hey ${person.name}!\n\nHere is our current balance breakdown:\n`
                activeDebts.forEach(d => {
                  const amt = Math.abs(d.amount).toFixed(2)
                  const action = d.amount > 0 ? 'You owe me' : 'I owe you'
                  const note = d.note ? ` for ${d.note}` : ''
                  msg += `• ${action} ₹${amt}${note}\n`
                })
                
                msg += `\nNet Balance: *${isCredit ? 'You owe me' : 'I owe you'} ₹${Math.abs(netBalance).toFixed(2)}*\n\nLet's settle up soon!`
                return encodeURIComponent(msg)
              })()}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10 border-[#25D366]/20 font-medium" })}
            >
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}

          <Link 
            to={`/contacts/${person.id}`}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10" })}
          >
            View <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            title="Delete contact"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
