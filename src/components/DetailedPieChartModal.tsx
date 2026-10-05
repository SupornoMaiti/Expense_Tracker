import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { Category } from '../lib/db'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PieChart as PieChartIcon } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Props {
  onClose: () => void
  pieData: { name: string; value: number }[]
  categories: Category[]
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function DetailedPieChartModal({ onClose, pieData, categories }: Props) {
  const renderLabel = ({ name, percent }: { name?: string; percent?: number }) =>
    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-indigo-600" />
            <DialogTitle className="text-xl">Category Breakdown</DialogTitle>
          </div>
          <DialogDescription>
            Detailed view of your spending by category.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 bg-muted/20 border rounded-xl p-4">
          {pieData.length === 0 ? (
            <div className="flex justify-center items-center h-48 text-muted-foreground">
              No data available
            </div>
          ) : (
            <>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={renderLabel}
                      labelLine={true}
                    >
                      {pieData.map((entry) => {
                        const color = categories.find(c => c.name === entry.name)?.color || '#888888'
                        return <Cell key={entry.name} fill={color} />
                      })}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [typeof v === 'number' ? formatINR(v) : v, 'Amount']}
                      contentStyle={{ 
                        background: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '0.5rem', 
                        fontSize: '0.875rem', 
                        color: 'hsl(var(--foreground))',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <ScrollArea className="h-[200px] mt-4 pr-4">
                <div className="space-y-2">
                  {pieData.map(d => {
                    const cat = categories.find(c => c.name === d.name)
                    const icon = cat?.icon || '📌'
                    const color = cat?.color || '#888888'
                    return (
                      <div key={d.name} className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xl leading-none">{icon}</span>
                          <span className="capitalize font-semibold text-sm" style={{ color }}>{d.name}</span>
                        </div>
                        <div className="font-bold tabular-nums text-foreground text-sm">
                          {formatINR(d.value)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
