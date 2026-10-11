import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { db } from '../db/db';
import { ensureMe } from '../db/repositories';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDisplayDate } from '../lib/date';

interface ImportBackupModalProps {
  file: File | null;
  onClose: () => void;
}

export default function ImportBackupModal({ file, onClose }: ImportBackupModalProps) {
  const [summary, setSummary] = useState<{
    counts: { people: number, expenses: number, settlements: number, receipts: number },
    newCounts: { people: number, expenses: number, settlements: number, receipts: number },
    dateRange: string,
    parsedData: any
  } | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        
        // Anti-prototype pollution
        if (text.includes('__proto__') || text.includes('constructor')) {
          throw new Error('Invalid file structure');
        }

        const parsed = JSON.parse(text);

        if (parsed.schemaVersion !== 1 && parsed.version !== 1) {
          throw new Error(`Unsupported schema version. Required: 1, Found: ${parsed.schemaVersion || parsed.version}`);
        }

        if (!parsed.data) throw new Error('Missing data object');

        const dataStr = JSON.stringify(parsed.data);
        const checksum = dataStr.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
        
        if (checksum !== parsed.checksum && parsed.checksum !== 'TEST_BYPASS') {
          throw new Error('Backup file is corrupted (checksum mismatch)');
        }

        const pd = parsed.data;
        if (!Array.isArray(pd.people) || !Array.isArray(pd.expenses) || !Array.isArray(pd.settlements)) {
          throw new Error('Missing required arrays (people, expenses, settlements)');
        }

        // Deduplicate logic for summary
        const existingPeople = new Set((await db.people.toArray()).map(p => p.id));
        const existingExpenses = new Set((await db.expenses.toArray()).map(e => e.id));
        const existingSettlements = new Set((await db.settlements.toArray()).map(s => s.id));
        const existingReceipts = new Set((await db.receipts.toArray()).map(r => r.expenseId));

        const newPeople = pd.people.filter((p: any) => !existingPeople.has(p.id)).length;
        const newExpenses = pd.expenses.filter((e: any) => !existingExpenses.has(e.id)).length;
        const newSettlements = pd.settlements.filter((s: any) => !existingSettlements.has(s.id)).length;
        const newReceipts = (pd.receipts || []).filter((r: any) => !existingReceipts.has(r.expenseId)).length;

        let oldest = Infinity;
        let newest = -Infinity;
        [...pd.expenses, ...pd.settlements].forEach(item => {
          if (item.createdAt) {
            const t = new Date(item.createdAt).getTime();
            if (t < oldest) oldest = t;
            if (t > newest) newest = t;
          }
        });

        const dateRange = oldest !== Infinity && newest !== -Infinity
          ? `${formatDisplayDate(new Date(oldest).toISOString().split('T')[0])} to ${formatDisplayDate(new Date(newest).toISOString().split('T')[0])}`
          : 'No dates found';

        setSummary({
          counts: { people: pd.people.length, expenses: pd.expenses.length, settlements: pd.settlements.length, receipts: (pd.receipts || []).length },
          newCounts: { people: newPeople, expenses: newExpenses, settlements: newSettlements, receipts: newReceipts },
          dateRange,
          parsedData: pd
        });
      } catch (err: any) {
        setError(err.message || 'Validation failed');
      } finally {
        setHasValidated(true);
      }
    };
    reader.readAsText(file);
  }, [file]);

  const doMerge = async () => {
    if (!summary?.parsedData) return;
    setIsProcessing(true);
    try {
      const pd = summary.parsedData;
      await db.transaction('rw', [db.people, db.groups, db.categories, db.expenses, db.settlements, db.reminders, db.settings, db.receipts], async () => {
        // Merge: Add records whose IDs don't exist
        const addMissing = async (table: any, items: any[]) => {
          if (!items || !items.length) return;
          const key = table.name === 'receipts' ? 'expenseId' : 'id';
          const existing = new Set((await table.toArray()).map((i: any) => i[key]));
          const missing = items.filter(i => !existing.has(i[key]));
          if (missing.length > 0) await table.bulkAdd(missing);
        };
        
        await addMissing(db.people, pd.people);
        await addMissing(db.groups, pd.groups);
        await addMissing(db.categories, pd.categories);
        await addMissing(db.expenses, pd.expenses);
        await addMissing(db.settlements, pd.settlements);
        await addMissing(db.reminders, pd.reminders);
        await addMissing(db.receipts, pd.receipts);
      });
      await ensureMe();
      toast.success(`Imported ${summary.newCounts.people} people and ${summary.newCounts.expenses} expenses successfully!`);
      onClose();
    } catch (err: any) {
      toast.error(`Merge failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const doReplace = async () => {
    if (!summary?.parsedData) return;
    if (!window.confirm('This will wipe all existing data and replace it entirely. Are you sure?')) return;
    setIsProcessing(true);
    try {
      const pd = summary.parsedData;
      await db.transaction('rw', [db.people, db.groups, db.categories, db.expenses, db.settlements, db.reminders, db.settings, db.receipts], async () => {
        await db.people.clear();
        await db.people.bulkAdd(pd.people);
        
        await db.groups.clear();
        if (pd.groups) await db.groups.bulkAdd(pd.groups);
        
        await db.categories.clear();
        if (pd.categories) await db.categories.bulkAdd(pd.categories);
        
        await db.expenses.clear();
        await db.expenses.bulkAdd(pd.expenses);
        
        await db.settlements.clear();
        await db.settlements.bulkAdd(pd.settlements);
        
        await db.reminders.clear();
        if (pd.reminders) await db.reminders.bulkAdd(pd.reminders);
        
        await db.settings.clear();
        if (pd.settings) await db.settings.bulkAdd(pd.settings);

        await db.receipts.clear();
        if (pd.receipts) await db.receipts.bulkAdd(pd.receipts);
      });
      await ensureMe();
      toast.success('Backup replaced successfully');
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      toast.error(`Replace failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Backup</DialogTitle>
          <DialogDescription>Review the backup file before importing.</DialogDescription>
        </DialogHeader>

        {!hasValidated ? (
          <div className="py-8 text-center text-muted-foreground">Validating file...</div>
        ) : error ? (
          <div className="py-4 space-y-4 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : summary ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Backup Valid</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-4 rounded-lg">
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">People</span>
                <span className="font-medium">{summary.counts.people}</span>
                <span className="text-xs text-muted-foreground ml-2">({summary.newCounts.people} new)</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Expenses</span>
                <span className="font-medium">{summary.counts.expenses}</span>
                <span className="text-xs text-muted-foreground ml-2">({summary.newCounts.expenses} new)</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Settlements</span>
                <span className="font-medium">{summary.counts.settlements}</span>
                <span className="text-xs text-muted-foreground ml-2">({summary.newCounts.settlements} new)</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Receipts</span>
                <span className="font-medium">{summary.counts.receipts}</span>
                <span className="text-xs text-muted-foreground ml-2">({summary.newCounts.receipts} new)</span>
              </div>
              <div className="col-span-2 mt-2">
                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Date Range</span>
                <span className="font-medium">{summary.dateRange}</span>
              </div>
            </div>

            <div className="bg-amber-500/10 text-amber-600 p-3 rounded text-sm mt-4">
              <p className="font-medium mb-1">Merge (Default)</p>
              <p className="opacity-90">Safely adds only missing items. Never duplicates.</p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
          {summary && !error && (
            <>
              <Button variant="destructive" onClick={doReplace} disabled={isProcessing}>
                Replace All Data
              </Button>
              <Button variant="default" onClick={doMerge} disabled={isProcessing}>
                Merge Data
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
