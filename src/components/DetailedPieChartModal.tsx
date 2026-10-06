import { PieChart, Pie, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
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

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
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
                <ChartContainer
                  config={categories.reduce((acc, cat) => {
                    acc[cat.name] = { label: cat.name, color: cat.color || '#888888' }
                    return acc
                  }, {} as Record<string, any>)}
                  className="mx-auto aspect-square max-h-[250px] [&_.recharts-responsive-container]:!aspect-auto"
                >
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry) => {
                        const color = categories.find(c => c.name === entry.name)?.color || '#888888'
                        return <Cell key={entry.name} fill={color} />
                      })}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value) => formatINR(value as number)} />}
                    />
                  </PieChart>
                </ChartContainer>
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
