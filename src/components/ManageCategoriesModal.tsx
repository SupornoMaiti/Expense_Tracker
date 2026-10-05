import React, { useState } from 'react'
import { addCategory, deleteCategory } from '../lib/db'
import { useCategories, DEFAULT_CATEGORIES } from '../hooks/useCategories'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tags, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Props {
  onClose: () => void
}

export default function ManageCategoriesModal({ onClose }: Props) {
  const { categories, refresh } = useCategories()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📌')
  const [color, setColor] = useState('#10b981')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const customCategories = categories.filter(c => 
    !DEFAULT_CATEGORIES.some(dc => dc.name === c.name)
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const safeName = name.trim().toLowerCase()
    if (!safeName || !icon) {
      setError('Name and Emoji are required')
      return
    }
    if (categories.some(c => c.name === safeName)) {
      setError('Category already exists')
      return
    }
    setError('')
    setSaving(true)
    try {
      await addCategory({ name: safeName, icon, color })
      setName('')
      setIcon('📌')
      refresh()
    } catch (err) {
      setError('Failed to add category')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Past transactions will fall back to "other" visually.')) return
    try {
      await deleteCategory(id)
      refresh()
    } catch (err) {
      alert('Failed to delete category')
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-indigo-600" />
            <DialogTitle className="text-xl">Manage Categories</DialogTitle>
          </div>
          <DialogDescription>
            Add or remove custom categories for your transactions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAdd} className="mt-4 bg-muted/20 border p-4 rounded-xl space-y-4">
          <div className="text-sm font-semibold text-foreground">Add Custom Category</div>
          
          <div className="flex gap-3 items-end">
            <div className="space-y-2 w-16 shrink-0">
              <Label>Emoji</Label>
              <Input 
                className="text-center text-lg h-10 px-1" 
                maxLength={2} 
                value={icon} 
                onChange={e => setIcon(e.target.value)} 
                required 
              />
            </div>
            
            <div className="space-y-2 flex-1 min-w-0">
              <Label>Name</Label>
              <Input 
                placeholder="e.g. beer" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                maxLength={20} 
                className="h-10"
                required 
              />
            </div>
            
            <div className="space-y-2 w-12 shrink-0">
              <Label>Color</Label>
              <Input 
                type="color" 
                className="p-1 h-10 cursor-pointer w-full" 
                value={color} 
                onChange={e => setColor(e.target.value)} 
                required 
              />
            </div>
          </div>
          
          {error && <div className="text-sm text-destructive font-medium">{error}</div>}
          
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving}>
            {saving ? 'Adding...' : 'Add Category'}
          </Button>
        </form>

        <div className="mt-6">
          <div className="text-sm font-medium text-muted-foreground mb-3">Custom Categories</div>
          
          <ScrollArea className="h-[200px] pr-4">
            {customCategories.length === 0 ? (
              <div className="text-muted-foreground text-sm italic py-4 text-center bg-muted/20 rounded-lg border border-dashed">
                No custom categories yet.
              </div>
            ) : (
              <div className="space-y-2">
                {customCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div className="flex items-center gap-3">
                      <span className="text-xl leading-none">{c.icon}</span>
                      <span className="capitalize font-semibold text-sm" style={{ color: c.color }}>{c.name}</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
