import { useState } from 'react'
import { useDebts } from '../hooks/useDebts'
import PersonCard from '../components/PersonCard'
import AddPersonModal from '../components/AddPersonModal'
import { addPerson } from '../lib/db'
import { Button } from '@/components/ui/button'
import { Download, UserPlus, Users, Loader2 } from 'lucide-react'

export default function Contacts() {
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [importing, setImporting] = useState(false)
  const { people, loading, refresh } = useDebts()

  const contactsApiSupported = 'contacts' in navigator && 'ContactsManager' in window

  async function handleBulkImport() {
    if (!contactsApiSupported) {
      alert(
        'The native Contacts picker requires:\n' +
        '• Chrome on Android\n' +
        '• Safari on iOS 14.5+\n\n' +
        'Please use the "+ Add" button to add contacts manually on this device.'
      )
      return
    }
    setImporting(true)
    try {
      // @ts-ignore - Web Contacts API
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true })
      if (contacts && contacts.length > 0) {
        for (const c of contacts) {
          await addPerson({ name: c.name?.[0] || 'Unknown', phone: c.tel?.[0] || '' })
        }
        refresh()
      }
    } catch (err) {
      console.log('Contacts API failed:', err)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage people you split bills with</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={handleBulkImport}
            disabled={importing || !contactsApiSupported}
            className={contactsApiSupported ? 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300' : 'text-muted-foreground'}
            title={contactsApiSupported ? 'Import from phone contacts' : 'Requires Android Chrome or iOS Safari'}
          >
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Import
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setShowAddPerson(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="text-sm font-medium text-muted-foreground">
        {people.length} contact{people.length !== 1 ? 's' : ''}
      </div>

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
            Add a friend to start tracking shared expenses and splitting bills.
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

      {showAddPerson && (
        <AddPersonModal
          onClose={() => setShowAddPerson(false)}
          onSuccess={() => { refresh(); setShowAddPerson(false) }}
        />
      )}
    </div>
  )
}
