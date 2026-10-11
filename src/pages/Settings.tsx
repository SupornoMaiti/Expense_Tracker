import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { resetDatabase } from '../db/repositories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatDisplayDate } from '../lib/date';
import { toast } from 'sonner';
import { Save, Download, Upload, HardDrive, MessageCircle, Trash2, RefreshCw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import ImportBackupModal from '@/components/ImportBackupModal';
import CategoriesManager from '@/components/CategoriesManager';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('user_settings'));
  const [storageInfo, setStorageInfo] = useState<{ quota: number; usage: number; persisted: boolean } | null>(null);
  const [localWhatsappTemplate, setLocalWhatsappTemplate] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmFresh, setShowConfirmFresh] = useState(false);
  const [showConfirmSample, setShowConfirmSample] = useState(false);

  const displayTemplate = localWhatsappTemplate !== null 
    ? localWhatsappTemplate 
    : (settings?.whatsappTemplate || 'Hi {name}, here is our balance breakdown:\n\n{breakdown}\n\nTotal: {amount}');

  const savePreferences = async () => {
    if (!settings) return;
    await db.settings.update('user_settings', { whatsappTemplate: displayTemplate });
    toast.success('Preferences saved');
  };

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
        schemaVersion: 1,
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
      a.download = `splitlocal-backup-${new Date().toISOString().split('T')[0]}.json`;
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
    if (file) {
      setImportFile(file);
    }
    e.target.value = '';
  };

  const handleFreshReset = async () => {
    try {
      setIsResetting(true);
      await resetDatabase({ withSampleData: false });
      toast.success('All data wiped! Fresh empty database ready.');
    } catch {
      toast.error('Failed to reset database');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSampleReset = async () => {
    try {
      setIsResetting(true);
      await resetDatabase({ withSampleData: true });
      toast.success('Reset completed with fresh demo test data!');
    } catch {
      toast.error('Failed to reset database');
    } finally {
      setIsResetting(false);
    }
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
                <Button variant="outline" className="w-full mt-2 rounded-xl h-10 font-medium" onClick={requestPersist}>
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
          <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Preferences</CardTitle>
          <CardDescription>Customize your app experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp Reminder Template</label>
            <p className="text-xs text-muted-foreground">Available variables: {'{name}, {amount}, {breakdown}'}</p>
            <Textarea 
              value={displayTemplate} 
              onChange={e => setLocalWhatsappTemplate(e.target.value)} 
              placeholder="Hi {name}, here is your pending balance:&#10;&#10;{breakdown}&#10;&#10;Total pending: {amount}"
              rows={4}
              className="font-mono text-xs sm:text-sm rounded-xl leading-relaxed"
            />
          </div>
          <Button onClick={savePreferences} className="w-full">
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      <CategoriesManager />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Save className="h-5 w-5" /> Backup & Restore</CardTitle>
          <CardDescription>All data lives only on this device. Back it up regularly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Last backup: {settings?.lastBackupAt ? `${formatDisplayDate(settings.lastBackupAt)} ${new Date(settings.lastBackupAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'never'}
          </p>

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

      {/* Danger Zone: Testing & Reset Data */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Fresh Testing & Reset Data
          </CardTitle>
          <CardDescription>
            Clear all data to test freshly on Android or in the browser anytime
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use this whenever you want to test from scratch. It wipes all expenses, payments, and added contacts, resetting to a clean slate.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="destructive"
              className="flex-1 gap-2 h-11"
              onClick={() => setShowConfirmFresh(true)}
              disabled={isResetting}
            >
              <Trash2 className="h-4 w-4" />
              {isResetting ? 'Resetting...' : 'Wipe Clean (Empty App)'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 h-11 border-destructive/30 hover:bg-destructive/10 text-destructive dark:text-red-400"
              onClick={() => setShowConfirmSample(true)}
              disabled={isResetting}
            >
              <RefreshCw className="h-4 w-4" />
              {isResetting ? 'Resetting...' : 'Reset with Demo Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showConfirmFresh}
        onOpenChange={setShowConfirmFresh}
        title="Wipe Clean (Empty App)"
        description="Are you sure you want to delete ALL data and start completely fresh? This cannot be undone."
        confirmText="Delete All Data"
        variant="destructive"
        onConfirm={handleFreshReset}
        isLoading={isResetting}
      />

      <ConfirmDialog
        open={showConfirmSample}
        onOpenChange={setShowConfirmSample}
        title="Reset with Demo Data"
        description="Reset all data and load fresh sample demo data with friends and transactions?"
        confirmText="Reset with Demo Data"
        variant="destructive"
        onConfirm={handleSampleReset}
        isLoading={isResetting}
      />

      {importFile && (
        <ImportBackupModal 
          file={importFile} 
          onClose={() => setImportFile(null)} 
        />
      )}
    </div>
  );
}
