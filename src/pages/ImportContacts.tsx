import { useState } from 'react';
import { db } from '../db/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Upload, Smartphone } from 'lucide-react';
import type { Person } from '../domain/types';

interface ImportedContact {
  id: string; // temp id
  name: string;
  phone: string;
  selected: boolean;
}

// Very basic E.164 normalizer
function normalizePhone(phone: string, defaultCountryCode: string = '+91') {
  // Remove all non-digit and non-plus characters
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    // If it's a 10 digit number, prepend default country code
    if (cleaned.length === 10) {
      cleaned = `${defaultCountryCode}${cleaned}`;
    } else {
      // Just a fallback
      cleaned = `+${cleaned}`;
    }
  }
  return cleaned;
}

export default function ImportContacts() {
  const navigate = useNavigate();
  const settings = useLiveQuery(() => db.settings.get('user_settings'));
  const [contacts, setContacts] = useState<ImportedContact[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if Contact Picker API is supported
  const supportsContactPicker = 'contacts' in navigator && 'ContactsManager' in window;

  const handleNativePicker = async () => {
    try {
      const props = ['name', 'tel'];
      // @ts-expect-error - Contact Picker API is not in standard DOM types yet
      const nativeContacts = await navigator.contacts.select(props, { multiple: true });
      
      const parsed: ImportedContact[] = nativeContacts.map((c: { name?: string[], tel?: string[] }) => {
        const phone = c.tel && c.tel.length > 0 ? c.tel[0] : '';
        return {
          id: crypto.randomUUID(),
          name: c.name && c.name.length > 0 ? c.name[0] : 'Unknown',
          phone: normalizePhone(phone, settings?.defaultCountryCode),
          selected: true
        };
      }).filter((c: ImportedContact) => c.phone); // Require phone

      setContacts(prev => [...prev, ...parsed]);
      toast.success(`Imported ${parsed.length} contacts from device.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to open contact picker or no contacts selected.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed: ImportedContact[] = [];

      if (file.name.endsWith('.csv')) {
        // Simple CSV parser: Name,Phone
        const lines = text.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const [name, phone] = line.split(',');
          if (name && phone) {
            parsed.push({
              id: crypto.randomUUID(),
              name: name.trim(),
              phone: normalizePhone(phone.trim(), settings?.defaultCountryCode),
              selected: true
            });
          }
        }
      } else if (file.name.endsWith('.vcf')) {
        // Simple VCF parser
        const cards = text.split('END:VCARD');
        for (const card of cards) {
          if (!card.includes('BEGIN:VCARD')) continue;
          
          let name = 'Unknown';
          let phone = '';
          
          const lines = card.split('\n');
          for (const line of lines) {
            if (line.startsWith('FN:')) name = line.substring(3).trim();
            else if (line.startsWith('TEL')) {
              const parts = line.split(':');
              if (parts.length > 1) phone = parts[1].trim();
            }
          }
          
          if (phone) {
            parsed.push({
              id: crypto.randomUUID(),
              name,
              phone: normalizePhone(phone, settings?.defaultCountryCode),
              selected: true
            });
          }
        }
      }

      setContacts(prev => [...prev, ...parsed]);
      toast.success(`Parsed ${parsed.length} contacts from file.`);
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  };

  const toggleContact = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const handlePhoneChange = (id: string, newPhone: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, phone: newPhone } : c));
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const selectedContacts = contacts.filter(c => c.selected);
      if (selectedContacts.length === 0) {
        toast.error('No contacts selected');
        setIsProcessing(false);
        return;
      }

      const existingPeople = await db.people.toArray();
      const existingPhones = new Set(existingPeople.map(p => p.phone).filter(Boolean));
      
      let addedCount = 0;
      let skippedCount = 0;

      const colors = ['#ef4444', '#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#f43f5e'];

      await db.transaction('rw', db.people, async () => {
        for (const contact of selectedContacts) {
          if (contact.phone && existingPhones.has(contact.phone)) {
            skippedCount++;
            continue;
          }

          const person: Person = {
            id: crypto.randomUUID(),
            name: contact.name,
            phone: contact.phone || null,
            avatarColor: colors[Math.floor(Math.random() * colors.length)],
            source: 'contact_picker',
            isMe: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            archivedAt: null,
            deletedAt: null,
          };

          await db.people.add(person);
          if (contact.phone) existingPhones.add(contact.phone);
          addedCount++;
        }
      });

      toast.success(`Added ${addedCount} contacts. ${skippedCount > 0 ? `Skipped ${skippedCount} duplicates.` : ''}`);
      navigate('/friends');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save contacts');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Contacts</h1>
        <p className="text-muted-foreground">Add friends quickly from your device or file</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {supportsContactPicker ? (
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={handleNativePicker}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-2 h-full">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full mb-2">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">Device Contacts</h3>
              <p className="text-sm text-muted-foreground">Select directly from your phone's contact book</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="opacity-50">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-2 h-full">
              <div className="p-3 bg-muted rounded-full mb-2">
                <Smartphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-muted-foreground">Device Contacts</h3>
              <p className="text-xs text-muted-foreground">Not supported on this browser/device (requires Chrome on Android via HTTPS)</p>
            </CardContent>
          </Card>
        )}

        <Card className="relative overflow-hidden hover:bg-muted/50 transition-colors">
          <Input 
            type="file" 
            accept=".csv,.vcf" 
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-2 h-full pointer-events-none">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full mb-2">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="font-semibold">Upload File</h3>
            <p className="text-sm text-muted-foreground">Import from .vcf or .csv files</p>
          </CardContent>
        </Card>
      </div>

      {contacts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Preview & Edit ({contacts.filter(c=>c.selected).length} selected)</CardTitle>
            <Button onClick={handleSave} disabled={isProcessing || contacts.filter(c=>c.selected).length === 0}>
              Save Selected
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[50vh] overflow-y-auto">
            {contacts.map(c => (
              <div key={c.id} className="flex items-center space-x-4 p-3 bg-muted/30 rounded-lg border">
                <Checkbox 
                  checked={c.selected} 
                  onCheckedChange={() => toggleContact(c.id)} 
                  id={`check-${c.id}`}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`check-${c.id}`} className="font-medium text-base cursor-pointer">{c.name}</Label>
                  <Input 
                    value={c.phone} 
                    onChange={(e) => handlePhoneChange(c.id, e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Phone number"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
