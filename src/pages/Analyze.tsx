import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getActiveExpenses, getActivePeople } from '../db/repositories';
import { computeAnalyze } from '../domain/analyze';
import { formatMoney } from '../lib/money';
import { toISODate } from '../lib/date';
import { PieChart, AlertCircle, ChevronLeft, ChevronRight, TrendingUp, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Pie, PieChart as RechartsPieChart, Sector, CartesianGrid, Line, LineChart, Bar, BarChart as RechartsBarChart, XAxis } from "recharts";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export default function Analyze() {
  const expenses = useLiveQuery(() => getActiveExpenses());
  const people = useLiveQuery(() => getActivePeople());
  const categories = useLiveQuery(() => db.categories.toArray());
  const settings = useLiveQuery(() => db.settings.get('user_settings'));

  const [yearMonth, setYearMonth] = useState<string>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [dailyChartType, setDailyChartType] = useState<'bar' | 'line'>('bar');

  const me = people?.find((p) => p.isMe);
  const myId = me?.id;

  const { currencies, months } = useMemo(() => {
    if (!expenses) return { currencies: [], months: [] };
    const curSet = new Set<string>();
    const moSet = new Set<string>();
    for (const exp of expenses) {
      if (exp.deletedAt) continue;
      curSet.add(exp.currency);
      if (exp.date) {
        const iso = toISODate(exp.date);
        moSet.add(iso.substring(0, 7)); // YYYY-MM
      }
    }
    return {
      currencies: Array.from(curSet).sort(),
      months: Array.from(moSet).sort((a, b) => b.localeCompare(a)) // descending
    };
  }, [expenses]);

  const activeCurrency = selectedCurrency || settings?.defaultCurrency || currencies[0] || 'INR';

  // Loading state
  if (expenses === undefined || people === undefined || categories === undefined || settings === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
          <PieChart className="h-8 w-8" />
          <p>Analyzing spending...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (people.length === 0 || !myId) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Could not load user data. Please ensure you are set up.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handlePrevMonth = () => {
    if (yearMonth === 'all') {
      if (months.length > 0) setYearMonth(months[0]);
    } else {
      const idx = months.indexOf(yearMonth);
      if (idx < months.length - 1) setYearMonth(months[idx + 1]);
    }
  };

  const handleNextMonth = () => {
    if (yearMonth === 'all') return;
    const idx = months.indexOf(yearMonth);
    if (idx > 0) setYearMonth(months[idx - 1]);
    else setYearMonth('all');
  };

  const analyzeResult = computeAnalyze(expenses, myId, activeCurrency, yearMonth);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const avgPerExpense = analyzeResult.expenseCount > 0
    ? Math.round(analyzeResult.totalSpendMinor / analyzeResult.expenseCount)
    : 0;

  const topCategorySpend = analyzeResult.categories.length > 0 ? analyzeResult.categories[0] : null;
  const topCategory = topCategorySpend
    ? (topCategorySpend.categoryId === 'Uncategorized'
        ? { name: 'Uncategorized', icon: '❓', color: '#94a3b8' }
        : catMap.get(topCategorySpend.categoryId))
    : null;

  const topCategoryPct = (analyzeResult.totalSpendMinor > 0 && topCategorySpend)
    ? Math.round((topCategorySpend.amountMinor / analyzeResult.totalSpendMinor) * 100)
    : 0;

  const formatMonth = (ym: string) => {
    if (ym === 'all') return 'All time';
    const parts = ym.split('-');
    if (parts.length === 2) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    return ym;
  };

  const pieChartData = analyzeResult.categories.map((spend) => {
    const cat = spend.categoryId === 'Uncategorized' ? { name: 'Uncategorized', icon: '❓', color: '#94a3b8' } : catMap.get(spend.categoryId);
    return {
      category: cat?.name || 'Unknown',
      amount: spend.amountMinor / 100,
      fill: cat?.color || '#94a3b8',
      categoryId: spend.categoryId,
    };
  });

  const pieChartConfig = analyzeResult.categories.reduce((acc, spend) => {
    const cat = spend.categoryId === 'Uncategorized' ? { name: 'Uncategorized', icon: '❓', color: '#94a3b8' } : catMap.get(spend.categoryId);
    acc[spend.categoryId] = {
      label: cat?.name || 'Unknown',
      color: cat?.color || '#94a3b8',
    };
    return acc;
  }, { amount: { label: "Amount" } } as ChartConfig);

  const lineChartData = analyzeResult.dailySpend.map((spend) => {
    const parts = spend.date.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : spend.date;
    return {
      date: label,
      spend: spend.amountMinor / 100,
    };
  });

  const lineChartConfig = {
    spend: {
      label: "Spend",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Analyze</h1>
        <p className="text-muted-foreground">Your spend by category</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} disabled={yearMonth !== 'all' && months.indexOf(yearMonth) === months.length - 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-32 text-center font-medium text-sm">
            {formatMonth(yearMonth)}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={yearMonth === 'all'}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {currencies.length > 1 && (
          <Select value={activeCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!analyzeResult.expenseCount ? (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[40vh]">
          <div className="bg-muted/30 p-4 rounded-full mb-4">
            <PieChart className="h-12 w-12 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No expenses</h2>
          <p className="text-muted-foreground max-w-sm">
            No spending recorded for this period.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Total Spent Hero Card */}
            <Card className="col-span-2 sm:col-span-1 relative overflow-hidden bg-gradient-to-br from-primary/10 via-card to-card border-primary/25 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Spent
                </CardTitle>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-0.5 pt-1">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                  {formatMoney(analyzeResult.totalSpendMinor, activeCurrency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {yearMonth === 'all' ? 'All-time spending' : `Spent in ${formatMonth(yearMonth)}`}
                </p>
              </CardContent>
            </Card>

            {/* Expenses Count Card */}
            <Card className="col-span-1 relative overflow-hidden shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Expenses
                </CardTitle>
                <div className="p-1.5 sm:p-2 rounded-xl bg-muted text-muted-foreground">
                  <Receipt className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-0.5 pt-1">
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {analyzeResult.expenseCount}
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  Avg {formatMoney(avgPerExpense, activeCurrency)}
                </p>
              </CardContent>
            </Card>

            {/* Top Category Card */}
            <Card className="col-span-1 relative overflow-hidden shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Top Category
                </CardTitle>
                <div className="p-1.5 sm:p-2 rounded-xl bg-muted text-muted-foreground">
                  <PieChart className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-0.5 pt-1">
                <div className="text-base sm:text-xl font-bold tracking-tight text-foreground truncate flex items-center gap-1">
                  <span>{topCategory?.icon || '🏷️'}</span>
                  <span className="truncate">{topCategory?.name || 'None'}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  {topCategorySpend ? `${topCategoryPct}% of spend` : 'No expenses'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              {pieChartData.length > 0 ? (
                <>
                  <ChartContainer
                    config={pieChartConfig}
                    className="mx-auto aspect-square max-h-[260px]"
                  >
                    <RechartsPieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={pieChartData}
                        dataKey="amount"
                        nameKey="category"
                        innerRadius={60}
                        strokeWidth={5}
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        shape={({
                          cx,
                          cy,
                          innerRadius,
                          outerRadius = 0,
                          startAngle,
                          endAngle,
                          fill,
                          index
                        }: PieSectorShapeProps & { index?: number }) => (
                          <Sector
                            cx={cx}
                            cy={cy}
                            innerRadius={innerRadius}
                            outerRadius={index === activePieIndex ? outerRadius + 10 : outerRadius}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            fill={fill}
                          />
                        )}
                      />
                    </RechartsPieChart>
                  </ChartContainer>

                  {/* Category Legend & Percentage List */}
                  <div className="space-y-1.5 mt-2 pt-3 border-t max-h-48 overflow-y-auto pr-1">
                    {analyzeResult.categories.map((spend) => {
                      const cat = spend.categoryId === 'Uncategorized' ? { name: 'Uncategorized', icon: '❓', color: '#94a3b8' } : catMap.get(spend.categoryId);
                      const pct = analyzeResult.totalSpendMinor > 0 
                        ? Math.round((spend.amountMinor / analyzeResult.totalSpendMinor) * 100) 
                        : 0;
                      return (
                        <div key={spend.categoryId} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{cat?.icon || '📦'}</span>
                            <span className="font-medium text-xs sm:text-sm">{cat?.name || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-medium">{pct}%</span>
                            <span className="font-semibold text-xs sm:text-sm">{formatMoney(spend.amountMinor, activeCurrency)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-10">No category data</div>
              )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Daily Spend
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant={dailyChartType === 'bar' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-2.5 rounded-full"
                    onClick={() => setDailyChartType('bar')}
                  >
                    Bar
                  </Button>
                  <Button
                    variant={dailyChartType === 'line' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-2.5 rounded-full"
                    onClick={() => setDailyChartType('line')}
                  >
                    Line
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
              {lineChartData.length > 0 ? (
                <ChartContainer config={lineChartConfig} className="min-h-[250px] w-full mt-2">
                  {dailyChartType === 'bar' ? (
                    <RechartsBarChart
                      accessibilityLayer
                      data={lineChartData}
                      margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar
                        dataKey="spend"
                        fill="hsl(var(--primary))"
                        radius={[6, 6, 0, 0]}
                      />
                    </RechartsBarChart>
                  ) : (
                    <LineChart
                      accessibilityLayer
                      data={lineChartData}
                      margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Line
                        dataKey="spend"
                        type="monotone"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  )}
                </ChartContainer>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-10">No daily data</div>
              )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
