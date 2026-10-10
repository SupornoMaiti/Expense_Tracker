import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import parsePhoneNumberFromString from 'libphonenumber-js';
import type { Person } from '../domain/types';

export function EditFriendModal({ person, onClose }: { person: Person, onClose: () => void }) {
  const settings = useLiveQuery(() => db.settings.get('user_settings'));

  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(person.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const normalizePhone = (p: string) => {
    try {
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

  const handleSave = async () => {
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
      if (normalizedPhone !== person.phone) {
        const existing = await db.people.where('phone').equals(normalizedPhone).first();
        if (existing) {
          setPhoneError('This phone number is already added');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      await db.people.update(person.id, {
        name: trimmedName,
        phone: normalizedPhone,
        updatedAt: new Date().toISOString()
      });
      toast.success('Friend updated successfully');
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update friend');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Friend</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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
            <Button onClick={handleSave} disabled={!name.trim() || isSubmitting}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
