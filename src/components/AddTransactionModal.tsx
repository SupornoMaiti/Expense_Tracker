import React, { useState, useEffect } from 'react'
import { addTransaction, addDebt, getAllPeople, addPerson } from '../lib/db'
import type { Person } from '../lib/db'
import { useCategories } from '../hooks/useCategories'
import AddPersonModal from './AddPersonModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Users, UserPlus, SplitSquareHorizontal } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AddTransactionModal({ onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('food')
  const [description, setDesc] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { categories } = useCategories()
  const expenseCategories = categories.filter(c => !['salary', 'freelance'].includes(c.name))

  const [splitEnabled, setSplit] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [splitPersonIds, setSplitPersonIds] = useState<string[]>([])
  const [showAddPerson, setShowAddPerson] = useState(false)

  const fetchPeople = async () => {
    const p = await getAllPeople()
    setPeople(p)
  }

  useEffect(() => {
    if (splitEnabled && people.length === 0) {
      fetchPeople()
    }
  }, [splitEnabled, people.length])

  const totalAmount = parseFloat(amount) || 0

  const friendShare = splitEnabled && splitPersonIds.length > 0 && totalAmount > 0
    ? Math.round((totalAmount / (splitPersonIds.length + 1)) * 100) / 100
    : 0
  const myShare = totalAmount - (friendShare * splitPersonIds.length)

  function togglePerson(id: string) {
    setSplitPersonIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const contactsApiSupported = 'contacts' in navigator && 'ContactsManager' in window

  async function handleBulkImport() {
    if (!contactsApiSupported) {
      alert(
        'The native Contacts picker requires:\n' +
        '• Chrome on Android\n' +
        '• Safari on iOS 14.5+\n\n' +
        'Please use the "+ ADD" button to add contacts manually on this device.'
      )
      return
    }
    try {
      setSaving(true)
      // @ts-ignore
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true })
      if (contacts && contacts.length > 0) {
        const newIds: string[] = []
        for (const c of contacts) {
          const p = await addPerson({ name: c.name?.[0] || 'Unknown', phone: c.tel?.[0] || '' })
          newIds.push(p.id)
        }
        const updated = await getAllPeople()
        setPeople(updated)
        setSplitPersonIds(prev => [...new Set([...prev, ...newIds])])
      }
    } catch (err) {
      console.log('Contacts API failed:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || isNaN(totalAmount) || totalAmount <= 0) {
      setError('Enter a valid positive amount.')
      return
    }
    if (splitEnabled && splitPersonIds.length === 0) {
      setError('Select at least one friend to split with.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const tx = await addTransaction({
        type: 'expense',
        amount: totalAmount,
        category,
        description,
      })

      if (splitEnabled && splitPersonIds.length > 0 && friendShare > 0) {
        for (const pid of splitPersonIds) {
          await addDebt({
            person_id: pid,
            transaction_id: tx.id,
            amount: friendShare,
            category,
            note: description || category,
            settled: false,
          })
        }
      }

      onSuccess()
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden p-0 bg-background max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-xl">Add Expense</DialogTitle>
            <DialogDescription>
              Record a new expense and optionally split it.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <form id="add-transaction-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  autoFocus
                  required
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc"
                  type="text"
                  placeholder="e.g., lunch at mess, auto to college..."
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    max={todayISO()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(c => (
                        <SelectItem key={c.name} value={c.name} className="capitalize">
                          {c.icon} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Split Section */}
              <div className="mt-6 pt-4 border-t">
                <Button
                  type="button"
                  variant={splitEnabled ? 'secondary' : 'outline'}
                  className={`w-full justify-start ${splitEnabled ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 dark:hover:bg-indigo-500/20' : ''}`}
                  onClick={() => setSplit(!splitEnabled)}
                >
                  <SplitSquareHorizontal className="mr-2 h-4 w-4" />
                  Split with friends
                  {splitEnabled && totalAmount > 0 && splitPersonIds.length > 0 && (
                    <span className="ml-auto text-xs font-semibold bg-background/50 px-2 py-0.5 rounded-full">
                      Your share: ₹{myShare.toFixed(2)}
                    </span>
                  )}
                </Button>

                {splitEnabled && (
                  <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <Label>Select Friends</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-indigo-600 dark:text-indigo-400"
                          onClick={handleBulkImport}
                          disabled={saving || !contactsApiSupported}
                          title={contactsApiSupported ? 'Import from contacts' : 'Unsupported on this browser'}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Import
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-indigo-600 dark:text-indigo-400"
                          onClick={() => setShowAddPerson(true)}
                          disabled={saving}
                        >
                          <UserPlus className="mr-1 h-3 w-3" />
                          Add
                        </Button>
                      </div>
                    </div>

                    {people.length === 0 ? (
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg flex items-start gap-2">
                        <Users className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>No contacts yet. Add or import someone to split this expense.</p>
                      </div>
                    ) : (
                      <div className="bg-muted/30 border rounded-lg p-3 max-h-40 overflow-y-auto space-y-3">
                        {people.map(p => (
                          <div key={p.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`person-${p.id}`} 
                              checked={splitPersonIds.includes(p.id)}
                              onCheckedChange={() => togglePerson(p.id)}
                            />
                            <label
                              htmlFor={`person-${p.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              {p.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {totalAmount > 0 && splitPersonIds.length > 0 && (
                      <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-lg text-sm border border-indigo-100 dark:border-indigo-500/20">
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Your share</span>
                          <span className="font-semibold text-foreground">₹{myShare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-muted-foreground">Each friend owes you</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{friendShare.toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/80 mt-1 pt-2 border-t border-indigo-200 dark:border-indigo-500/20">
                          Debt will be added for {splitPersonIds.length} friend{splitPersonIds.length > 1 ? 's' : ''}.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}
            </form>
          </ScrollArea>

          <DialogFooter className="p-6 pt-4 border-t gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="add-transaction-form" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Saving...' : splitEnabled ? 'Save & Split' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showAddPerson && (
        <AddPersonModal
          onClose={() => setShowAddPerson(false)}
          onSuccess={() => {
            fetchPeople()
            setShowAddPerson(false)
          }}
        />
      )}
    </>
  )
}
