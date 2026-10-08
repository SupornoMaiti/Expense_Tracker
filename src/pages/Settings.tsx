import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Download, Upload, HardDrive } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('user_settings'));
  const [storageInfo, setStorageInfo] = useState<{ quota: number; usage: number; persisted: boolean } | null>(null);

  useEffect(() => {
    async function checkStorage() {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const persisted = await navigator.storage.persisted();
        setStorageInfo({
          quota: estimate.quota || 0,
          usage: estimate.usage || 0,
          persisted
        });
      }
    }
    checkStorage();
  }, []);

  const requestPersist = async () => {
    if (navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persist();
      setStorageInfo(prev => prev ? { ...prev, persisted } : null);
      if (persisted) {
        toast.success('Storage persistence granted! Your data is safe from browser clearing.');
      } else {
        toast.error('Storage persistence denied. Please check site permissions.');
      }
    }
  };

  const handleExport = async () => {
    try {
      const exportData = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: {
          people: await db.people.toArray(),
          groups: await db.groups.toArray(),
          categories: await db.categories.toArray(),
          expenses: await db.expenses.toArray(),
          settlements: await db.settlements.toArray(),
          reminders: await db.reminders.toArray(),
          settings: await db.settings.toArray(),
          receipts: await db.receipts.toArray(),
        }
      };

      // Add a simple checksum
      const dataStr = JSON.stringify(exportData.data);
      const checksum = dataStr.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
      
      const finalExport = { ...exportData, checksum };
      
      const blob = new Blob([JSON.stringify(finalExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `splitlocal_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      if (settings) {
        await db.settings.update('user_settings', { lastBackupAt: new Date().toISOString() });
      }

      toast.success('Backup exported successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export backup');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.version !== 1) {
          throw new Error('Unsupported backup version');
        }

        const dataStr = JSON.stringify(parsed.data);
        const checksum = dataStr.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
        
        if (checksum !== parsed.checksum) {
          throw new Error('Backup file is corrupted (checksum mismatch)');
        }

        if (confirm('This will replace ALL existing data. Are you sure?')) {
          await db.transaction('rw', [db.people, db.groups, db.categories, db.expenses, db.settlements, db.reminders, db.settings, db.receipts], async () => {
            await db.people.clear();
            await db.people.bulkAdd(parsed.data.people);
            
            await db.groups.clear();
            await db.groups.bulkAdd(parsed.data.groups);
            
            await db.categories.clear();
            await db.categories.bulkAdd(parsed.data.categories);
            
            await db.expenses.clear();
            await db.expenses.bulkAdd(parsed.data.expenses);
            
            await db.settlements.clear();
            await db.settlements.bulkAdd(parsed.data.settlements);
            
            await db.reminders.clear();
            await db.reminders.bulkAdd(parsed.data.reminders);
            
            await db.settings.clear();
            await db.settings.bulkAdd(parsed.data.settings);

            await db.receipts.clear();
            if (parsed.data.receipts) {
              await db.receipts.bulkAdd(parsed.data.receipts);
            }
          });
          toast.success('Backup restored successfully');
          setTimeout(() => window.location.reload(), 1000);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          toast.error(`Import failed: ${err.message}`);
        } else {
          toast.error('Import failed due to an unknown error');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your app preferences and data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> Storage & Persistence</CardTitle>
          <CardDescription>Make sure your data isn't cleared by the browser</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {storageInfo ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usage:</span>
                <span className="font-medium">{formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                {storageInfo.persisted ? (
                  <span className="text-green-600 font-medium bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">Persisted</span>
                ) : (
                  <span className="text-orange-600 font-medium bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded">Temporary (At risk)</span>
                )}
              </div>
              {!storageInfo.persisted && (
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={requestPersist}>
                  Request Permanent Storage
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Checking storage...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Save className="h-5 w-5" /> Backup & Restore</CardTitle>
          <CardDescription>All data lives only on this device. Back it up regularly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.lastBackupAt ? (
            <p className="text-sm text-muted-foreground mb-4">Last backup: {new Date(settings.lastBackupAt).toLocaleString()}</p>
          ) : (
            <p className="text-sm text-orange-600 mb-4 font-medium">You have never backed up your data!</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleExport} className="w-full h-12" variant="default">
              <Download className="mr-2 h-4 w-4" /> Export Backup
            </Button>
            
            <div className="relative">
              <Input 
                type="file" 
                accept=".json" 
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="w-full h-12 pointer-events-none">
                <Upload className="mr-2 h-4 w-4" /> Restore Backup
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
