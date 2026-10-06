import { useState } from 'react'
import { deleteTransaction } from '../lib/db'
import type { Transaction } from '../lib/db'
import CategoryBadge from './CategoryBadge'
import { Button } from '@/components/ui/button'
import { Trash2, FileText } from 'lucide-react'


interface Props {
  transactions: Transaction[]
  onDelete?: () => void
  limit?: number
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const day = d.getDate().toString().padStart(2, '0')
  const month = d.toLocaleString('en', { month: 'short' })
  const time = d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true })
  return { day, month, time }
}

export default function TransactionList({ transactions, onDelete, limit }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const displayed = limit ? transactions.slice(0, limit) : transactions

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border rounded-xl bg-muted/10 border-dashed">
        <div className="bg-muted p-4 rounded-full mb-4">
          <FileText className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium text-foreground">No transactions found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          You haven't logged any entries that match this criteria.
        </p>
      </div>
    )
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    await deleteTransaction(id)
    onDelete?.()
  }

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="divide-y divide-border">
        {displayed.map(tx => {
          const { day, month, time } = formatDate(tx.created_at)
          const isExpanded = expandedId === tx.id
          
          return (
            <div key={tx.id} className="flex flex-col">
              <div 
                className="flex items-center gap-3 p-3 md:p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => setExpandedId(isExpanded ? null : tx.id)}
              >
                {/* Date block */}
                <div className="w-12 text-center flex flex-col justify-center flex-shrink-0">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">{month}</span>
                  <span className="text-lg font-bold leading-none mt-0.5">{day}</span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {tx.description || 'Untitled Transaction'}
                    </p>
                    {tx.type === 'refund' && (
                      <span className="inline-flex flex-shrink-0 items-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20">
                        Refund
                      </span>
                    )}

                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <CategoryBadge category={tx.category} />
                    <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
                      {time}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className={`text-sm font-semibold whitespace-nowrap ${
                    tx.type === 'income' || tx.type === 'refund' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                  }`}>
                    {tx.type === 'income' || tx.type === 'refund' ? '+' : '-'}{formatAmount(tx.amount)}
                  </span>
                  
                  {/* Delete button (visible on hover or expanded) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 mt-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => { e.stopPropagation(); handleDelete(tx.id) }}
                    title="Delete transaction"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Expanded Description Area */}
              {isExpanded && (
                <div className="px-4 py-3 bg-muted/20 border-t text-sm flex gap-4 text-muted-foreground">
                  <div className="w-12 flex-shrink-0" /> {/* Spacer */}
                  <div className="flex-1">
                    <p className="font-medium text-foreground mb-1">Details</p>
                    <p>{tx.description ? tx.description : <span className="italic opacity-60">No additional description provided.</span>}</p>
                    <p className="text-[10px] mt-2 opacity-60">Logged at {time}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
