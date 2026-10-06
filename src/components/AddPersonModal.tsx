import React, { useState } from 'react'
import { addPerson } from '../lib/db'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download } from 'lucide-react'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function AddPersonModal({ onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const contactsApiSupported = 'contacts' in navigator && 'ContactsManager' in window

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await addPerson({ name: name.trim(), phone: phone.trim() })
      onSuccess()
      onClose()
    } catch {
      setError('Failed to save person.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between mt-2">
            <div>
              <DialogTitle className="text-xl">Add Contact</DialogTitle>
              <DialogDescription className="mt-1">
                Add a new friend to split bills with.
              </DialogDescription>
            </div>
            {contactsApiSupported && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                onClick={async () => {
                  try {
                    setSaving(true)
                    // @ts-ignore - Contacts API is not in standard lib dom yet
                    const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true })
                    if (contacts && contacts.length > 0) {
                      for (const c of contacts) {
                        const cName = c.name?.[0] || 'Unknown'
                        const cPhone = c.tel?.[0] || ''
                        await addPerson({ name: cName, phone: cPhone })
                      }
                      onSuccess()
                      onClose()
                    } else {
                      setSaving(false)
                    }
                  } catch (err) {
                    console.log('Contacts API failed:', err)
                    setSaving(false)
                  }
                }}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Import
              </Button>
            )}
          </div>
        </DialogHeader>

        <form id="add-person-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="person-name">Name</Label>
            <Input
              id="person-name"
              type="text"
              placeholder="e.g., Rahul"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="person-phone">
              Phone <span className="text-muted-foreground font-normal">(optional — for WhatsApp)</span>
            </Label>
            <Input
              id="person-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="add-person-form" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {saving ? 'Saving...' : 'Add Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
