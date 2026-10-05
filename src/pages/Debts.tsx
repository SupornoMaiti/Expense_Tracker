import { useState } from 'react'
import { useDebts } from '../hooks/useDebts'
import PersonCard from '../components/PersonCard'
import AddPersonModal from '../components/AddPersonModal'
import DebtLedger from '../components/DebtLedger'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Loader2, UserPlus } from 'lucide-react'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function Debts() {
  const [showAddPerson, setShowAddPerson] = useState(false)
  const { people, loading, refresh, totalOwedToMe, totalIOwe } = useDebts()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Debts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage shared expenses and balances</p>
        </div>
        <Button onClick={() => setShowAddPerson(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-emerald-100 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-900/10 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500" />
          <CardContent className="p-5">
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1">Owed To You</div>
            <div className={`text-3xl font-bold tracking-tight tabular-nums ${totalOwedToMe > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
              {formatINR(totalOwedToMe)}
            </div>
            <div className="text-sm text-muted-foreground mt-1 font-medium">
              across {people.filter(p => p.netBalance > 0).length} people
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-900/10 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 w-1 h-full bg-amber-500" />
          <CardContent className="p-5">
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1">You Owe</div>
            <div className={`text-3xl font-bold tracking-tight tabular-nums ${totalIOwe > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}`}>
              {formatINR(totalIOwe)}
            </div>
            <div className="text-sm text-muted-foreground mt-1 font-medium">
              across {people.filter(p => p.netBalance < 0).length} people
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="people" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm mb-6">
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="ledger">Master Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-0 outline-none">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
            </div>
          ) : people.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-muted/20 border-dashed px-4">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No contacts yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mb-6">
                Add a friend to start tracking shared expenses and debts.
              </p>
              <Button variant="outline" onClick={() => setShowAddPerson(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {people.map(p => (
                <PersonCard key={p.id} person={p} onDelete={refresh} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-0 outline-none">
          <DebtLedger people={people} onRefresh={refresh} />
        </TabsContent>
      </Tabs>

      {showAddPerson && (
        <AddPersonModal onClose={() => setShowAddPerson(false)} onSuccess={refresh} />
      )}
    </div>
  )
}
