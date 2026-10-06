import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import CategoryBadge from '../components/CategoryBadge'
import ManageCategoriesModal from '../components/ManageCategoriesModal'
import DetailedPieChartModal from '../components/DetailedPieChartModal'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Settings, Loader2, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}


const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Spend() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [showManageCat, setShowManageCat] = useState(false)
  const [showDetailedPie, setShowDetailedPie] = useState(false)

  const { transactions, loading } = useTransactions()
  const { categories } = useCategories()

  const monthTxs = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.type !== 'expense' && tx.type !== 'refund') return false
      const d = new Date(tx.created_at)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [transactions, year, month])

  const expenseTxs = useMemo(() => monthTxs.filter(t => t.type === 'expense'), [monthTxs])
  const refundTxs  = useMemo(() => monthTxs.filter(t => t.type === 'refund'),  [monthTxs])

  const grossSpend  = useMemo(() => expenseTxs.reduce((s, t) => s + t.amount, 0), [expenseTxs])
  const totalRefund = useMemo(() => refundTxs.reduce((s, t) => s + t.amount, 0),  [refundTxs])
  const totalSpend  = grossSpend - totalRefund

  const pieData = useMemo(() => {
    const map: Record<string, number> = {}
    monthTxs.forEach(t => { 
      const amount = t.type === 'expense' ? t.amount : -t.amount
      map[t.category] = (map[t.category] || 0) + amount 
    })
    return Object.entries(map)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [monthTxs])

  const barData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const map: Record<number, number> = {}
    monthTxs.forEach(t => {
      const day = new Date(t.created_at).getDate()
      const amount = t.type === 'expense' ? t.amount : -t.amount
      map[day] = (map[day] || 0) + amount
    })
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: map[i + 1] || 0,
    }))
  }, [monthTxs, year, month])

  const todayDay = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const top2Categories = pieData.slice(0, 2).map(d => d.name)
  const renderLabel = ({ name, percent }: { name?: string; percent?: number }) => {
    if (window.innerWidth < 640) return ''
    if (name && top2Categories.includes(name)) {
      return `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
    }
    return ''
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Spend</h1>
          <p className="text-sm text-muted-foreground mt-1">Expense overview & analytics</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium w-28 text-center tabular-nums">
            {MONTH_NAMES[month]} {year}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowManageCat(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/50 dark:bg-indigo-900/10 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
        <CardContent className="p-6 md:p-8 text-center flex flex-col items-center justify-center">
          <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">Total Net Spend</div>
          <div className="text-4xl md:text-5xl font-bold tracking-tight text-foreground tabular-nums">
            {loading ? <Skeleton className="h-12 w-48 mx-auto" /> : formatINR(totalSpend)}
          </div>
          {totalRefund > 0 && !loading && (
            <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-2 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">
              Includes {formatINR(totalRefund)} in refunds
            </div>
          )}
          {!loading && (
            <div className="text-xs text-muted-foreground mt-3">
              {monthTxs.length} transaction{monthTxs.length !== 1 ? 's' : ''} this month
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
        </div>
      ) : monthTxs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-muted/20 border-dashed">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-foreground">No expenses yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            You haven't logged any expenses in {MONTH_NAMES[month]} {year}.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">By Category</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                    No category data
                  </div>
                ) : (
                  <div 
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onClick={() => setShowDetailedPie(true)}
                    title="Click for detailed view"
                  >
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                          label={renderLabel}
                          labelLine={false}
                          stroke="transparent"
                        >
                          {pieData.map((entry) => {
                            const color = categories.find(c => c.name === entry.name)?.color || '#94a3b8'
                            return <Cell key={entry.name} fill={color} />
                          })}
                        </Pie>
                        <RechartsTooltip
                          formatter={(v) => [typeof v === 'number' ? formatINR(v) : v, 'Amount']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '13px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Daily Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                    />
                    <RechartsTooltip
                      formatter={(v) => [typeof v === 'number' ? formatINR(v) : v, 'Amount']}
                      labelFormatter={(l) => `${MONTH_NAMES[month]} ${l}`}
                      cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '13px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {barData.map((entry) => (
                        <Cell
                          key={entry.day}
                          fill={entry.day === todayDay ? 'var(--primary)' : 'var(--primary)'}
                          fillOpacity={entry.day === todayDay ? 1 : 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-4 bg-muted/20 border-b">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Activity</CardTitle>
              <Link to="/log" className={buttonVariants({ variant: "ghost", size: "sm", className: "text-xs h-8 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300" })}>
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardHeader>
            <div className="divide-y">
              {monthTxs.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="w-12 text-center flex flex-col justify-center">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">{new Date(tx.created_at).toLocaleString('en', { month: 'short' })}</span>
                    <span className="text-lg font-bold leading-none mt-0.5">{new Date(tx.created_at).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {tx.description || 'Untitled Transaction'}
                      </p>
                      {tx.type === 'refund' && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Refund
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center">
                      <CategoryBadge category={tx.category} showIcon={false} />
                    </div>
                  </div>
                  <div className={`text-sm font-semibold whitespace-nowrap ${tx.type === 'refund' ? 'text-emerald-600' : 'text-foreground'}`}>
                    {tx.type === 'refund' ? '+' : '-'}{formatINR(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {showManageCat && (
        <ManageCategoriesModal onClose={() => setShowManageCat(false)} />
      )}

      {showDetailedPie && (
        <DetailedPieChartModal 
          onClose={() => setShowDetailedPie(false)} 
          pieData={pieData} 
          categories={categories} 
        />
      )}
    </div>
  )
}
