import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPerson } from '../db/repositories';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import parsePhoneNumberFromString from 'libphonenumber-js';
import { Smartphone, Upload } from 'lucide-react';
import { generateId } from '../lib/utils';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

export function AddFriendModal({ onClose }: { onClose: () => void }) {
  const settings = useLiveQuery(() => db.settings.get('user_settings'));

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const [contacts, setContacts] = useState<{id:string; name:string; phone:string; selected:boolean}[]>([]);
  const supportsContactPicker = 'contacts' in navigator && 'ContactsManager' in window;

  const normalizePhone = (p: string) => {
    try {
      // In libphonenumber-js, you can parse with a default country (like 'IN')
      // but since we only have settings.defaultCountryCode (e.g. "+91"), we can just prepend it if there's no plus
      let toParse = p;
      if (!toParse.startsWith('+')) {
        toParse = (settings?.defaultCountryCode || '+91') + toParse;
      }
      const phoneNumber = parsePhoneNumberFromString(toParse);
      if (phoneNumber?.isValid()) {
        return phoneNumber.format('E.164');
      }
    } catch {
      // ignore
    }
    return null;
  };

  const handleManualSave = async () => {
    setPhoneError('');
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (trimmedName.length > 60) {
      toast.error('Name must be 60 characters or less');
      return;
    }

    let normalizedPhone: string | null = null;
    if (phone.trim()) {
      normalizedPhone = normalizePhone(phone.trim());
      if (!normalizedPhone) {
        setPhoneError('Invalid phone number format');
        return;
      }
      const existing = await db.people.where('phone').equals(normalizedPhone).first();
      if (existing) {
        setPhoneError('This phone number is already added');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      await createPerson({
        id: generateId(),
        name: trimmedName,
        phone: normalizedPhone,
        avatarColor: color,
        source: 'manual',
        isMe: false,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        deletedAt: null
      });
      toast.success('Friend added successfully');
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save friend');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNativePicker = async () => {
    try {
      const props = ['name', 'tel'];
      // @ts-expect-error - Contact Picker API
      const nativeContacts = await navigator.contacts.select(props, { multiple: true });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = nativeContacts.map((c: any) => {
        const p = c.tel && c.tel.length > 0 ? c.tel[0] : '';
        return {
          id: generateId(),
          name: c.name && c.name.length > 0 ? c.name[0] : 'Unknown',
          phone: p,
          selected: true
        };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).filter((c: any) => c.phone);
      
      setContacts(prev => [...prev, ...parsed]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to open contact picker');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed: any[] = [];

      if (file.name.endsWith('.csv')) {
        const lines = text.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const [n, p] = line.split(',');
          if (n && p) {
            parsed.push({ id: generateId(), name: n.trim(), phone: p.trim(), selected: true });
          }
        }
      } else if (file.name.endsWith('.vcf')) {
        const cards = text.split('END:VCARD');
        for (const card of cards) {
          if (!card.includes('BEGIN:VCARD')) continue;
          let n = 'Unknown';
          let p = '';
          const lines = card.split('\n');
          for (const line of lines) {
            if (line.startsWith('FN:')) n = line.substring(3).trim();
            else if (line.startsWith('TEL')) {
              const parts = line.split(':');
              if (parts.length > 1) p = parts[1].trim();
            }
          }
          if (p) parsed.push({ id: generateId(), name: n, phone: p, selected: true });
        }
      }

      setContacts(prev => [...prev, ...parsed]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportSave = async () => {
    setIsSubmitting(true);
    try {
      const selected = contacts.filter(c => c.selected);
      if (selected.length === 0) return toast.error('No contacts selected');

      const existingPeople = await db.people.toArray();
      const existingPhones = new Set(existingPeople.map(p => p.phone).filter(Boolean));
      
      let added = 0;
      let skipped = 0;
      let invalid = 0;

      await db.transaction('rw', db.people, async () => {
        for (const contact of selected) {
          const nPhone = normalizePhone(contact.phone);
          if (!nPhone) {
            invalid++;
            continue;
          }
          if (existingPhones.has(nPhone)) {
            skipped++;
            continue;
          }
          
          const now = new Date().toISOString();
          await db.people.add({
            id: generateId(),
            name: contact.name.substring(0, 60),
            phone: nPhone,
            avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
            source: 'contact_picker',
            isMe: false,
            createdAt: now,
            updatedAt: now,
            archivedAt: null,
            deletedAt: null,
          });
          existingPhones.add(nPhone);
          added++;
        }
      });

      toast.success(`Imported ${added} contacts. ${skipped > 0 ? `Skipped ${skipped} duplicates.` : ''} ${invalid > 0 ? `${invalid} invalid numbers.` : ''}`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to import contacts');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="manual" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} maxLength={60} autoFocus />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input id="phone" type="tel" placeholder="+91 9876543210" value={phone} onChange={e => {setPhone(e.target.value); setPhoneError('');}} />
              {phoneError && <p className="text-sm text-red-500">{phoneError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleManualSave} disabled={!name.trim() || isSubmitting}>Save</Button>
            </div>
          </TabsContent>
          
          <TabsContent value="import" className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {supportsContactPicker && (
                <Button variant="outline" className="flex flex-col h-auto py-4" onClick={handleNativePicker}>
                  <Smartphone className="mb-2 h-5 w-5" />
                  <span>Device</span>
                </Button>
              )}
              <div className="relative">
                <Input type="file" accept=".csv,.vcf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Button variant="outline" className="w-full flex flex-col h-auto py-4 pointer-events-none">
                  <Upload className="mb-2 h-5 w-5" />
                  <span>File (.csv/.vcf)</span>
                </Button>
              </div>
            </div>

            {contacts.length > 0 && (
              <div className="space-y-2 border rounded-md p-2">
                <div className="flex items-center justify-between px-2 pb-2 border-b">
                  <span className="text-sm font-medium">{contacts.filter(c => c.selected).length} selected</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pt-2">
                  {contacts.map(c => (
                    <div key={c.id} className="flex items-center space-x-2">
                      <Checkbox checked={c.selected} onCheckedChange={() => setContacts(prev => prev.map(p => p.id === c.id ? {...p, selected: !p.selected} : p))} />
                      <div className="flex-1 flex flex-col">
                        <span className="text-sm font-medium leading-none">{c.name}</span>
                        <Input value={c.phone} onChange={e => setContacts(prev => prev.map(p => p.id === c.id ? {...p, phone: e.target.value} : p))} className="h-6 mt-1 text-xs" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={handleImportSave} disabled={isSubmitting || contacts.filter(c => c.selected).length === 0}>Import Selected</Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
