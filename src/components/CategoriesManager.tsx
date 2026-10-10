import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { generateId } from '../lib/utils';
import { DEFAULT_CATEGORIES } from '../db/repositories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trash2, Plus, Edit2, Check, X, RotateCcw } from 'lucide-react';
import { Label } from '@/components/ui/label';

const EMOJI_PRESETS = ['🍔', '🛒', '🚗', '🎬', '🛍️', '💡', '💊', '✈️', '☕', '🏠', '🎮', '📦', '🎁', '📚', '🏋️'];
const COLOR_PRESETS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#eab308', '#ef4444', '#06b6d4', '#64748b'];

export default function CategoriesManager() {
  const categories = useLiveQuery(() => db.categories.filter(c => !c.deletedAt).toArray()) || [];
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🍔');
  const [newCatColor, setNewCatColor] = useState('#f97316');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');

  const addCategory = async () => {
    if (!newCatName.trim()) {
      toast.error('Category name required');
      return;
    }
    
    await db.categories.add({
      id: generateId(),
      name: newCatName.trim(),
      icon: newCatIcon.trim() || '📦',
      color: newCatColor || '#3b82f6',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    });
    setNewCatName('');
    toast.success('Category added');
  };

  const startEdit = (cat: { id: string; name: string; icon: string; color: string }) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setEditColor(cat.color);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editName.trim()) {
      toast.error('Category name required');
      return;
    }
    await db.categories.update(editingId, {
      name: editName.trim(),
      icon: editIcon.trim() || '📦',
      color: editColor || '#3b82f6',
      updatedAt: new Date().toISOString()
    });
    setEditingId(null);
    toast.success('Category updated');
  };

  const deleteCategory = async (id: string) => {
    await db.categories.update(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    toast.success('Category deleted');
  };

  const restoreDefaults = async () => {
    const existing = await db.categories.filter(c => !c.deletedAt).toArray();
    const existingNames = new Set(existing.map(c => c.name.toLowerCase()));
    const now = new Date().toISOString();
    let addedCount = 0;

    for (const def of DEFAULT_CATEGORIES) {
      if (!existingNames.has(def.name.toLowerCase())) {
        await db.categories.add({
          id: generateId(),
          name: def.name,
          icon: def.icon,
          color: def.color,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
        addedCount++;
      }
    }
    if (addedCount > 0) {
      toast.success(`Restored ${addedCount} default categories`);
    } else {
      toast.info('All default categories already present');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">Categories</CardTitle>
          <CardDescription>Manage expense categories with emojis and colors</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={restoreDefaults} className="h-8 text-xs">
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Defaults
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Creation Form */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-xl border">
          <div className="flex gap-2">
            <div className="w-14 shrink-0">
              <Label className="sr-only">Emoji</Label>
              <Input 
                value={newCatIcon} 
                onChange={e => setNewCatIcon(e.target.value)} 
                placeholder="🍔" 
                className="text-center text-xl h-10 px-1"
              />
            </div>
            <div className="flex-1">
              <Label className="sr-only">Name</Label>
              <Input 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)} 
                placeholder="e.g. Dining Out" 
                className="h-10"
              />
            </div>
            <div className="w-12 shrink-0">
              <Label className="sr-only">Color</Label>
              <Input 
                type="color"
                value={newCatColor} 
                onChange={e => setNewCatColor(e.target.value)} 
                className="p-1 h-10 w-12 cursor-pointer rounded-md"
              />
            </div>
            <Button onClick={addCategory} className="h-10 px-3">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {/* Quick Emoji Presets */}
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">Quick emoji presets:</div>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_PRESETS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewCatIcon(emoji)}
                  className={`text-lg p-1 rounded-md hover:bg-muted transition-colors ${newCatIcon === emoji ? 'bg-primary/20 ring-1 ring-primary' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Color Presets */}
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">Color presets:</div>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCatColor(color)}
                  className={`w-5 h-5 rounded-full border transition-transform ${newCatColor === color ? 'scale-125 ring-2 ring-primary ring-offset-1' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Existing Categories List */}
        <div className="space-y-2 mt-4 max-h-[350px] overflow-y-auto pr-1">
          {categories.map(c => {
            const isEditing = editingId === c.id;

            if (isEditing) {
              return (
                <div key={c.id} className="flex items-center gap-2 p-2 bg-muted/80 rounded-lg border">
                  <Input 
                    value={editIcon} 
                    onChange={e => setEditIcon(e.target.value)} 
                    className="w-12 text-center text-lg h-9 px-1"
                  />
                  <Input 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className="flex-1 h-9"
                  />
                  <Input 
                    type="color"
                    value={editColor} 
                    onChange={e => setEditColor(e.target.value)} 
                    className="w-9 h-9 p-0.5 cursor-pointer rounded"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={saveEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            }

            return (
              <div key={c.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xl shadow-xs"
                    style={{ backgroundColor: `${c.color}25`, border: `1px solid ${c.color}50` }}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <span className="font-medium text-sm block">{c.name}</span>
                    {c.isDefault && <span className="text-[10px] text-muted-foreground">Default</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-4 h-4 rounded-full border mr-2 shrink-0" 
                    style={{ backgroundColor: c.color }}
                    title={c.color}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => startEdit(c)}
                    title="Edit category"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" 
                    onClick={() => deleteCategory(c.id)}
                    title="Delete category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
