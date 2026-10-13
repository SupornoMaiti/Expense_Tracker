import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateId } from '../lib/utils';
import { db } from '../db/db';
import { createSettlement, getActiveExpenses, getActiveSettlements } from '../db/repositories';
import { computePairwiseBalance } from '../domain/ledger';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/DatePicker';
import { formatMoney, parseDecimalToMinor } from '../lib/money';
import { getTodayISODate } from '../lib/date';
import { toast } from 'sonner';

const METHOD_LABELS: Record<'cash' | 'upi' | 'bank' | 'other', string> = {
  upi: 'UPI (Google Pay / PhonePe / Paytm)',
  cash: 'Cash',
  bank: 'Bank Transfer / IMPS',
  other: 'Other',
};

export default function SettleUp() {
  const [searchParams] = useSearchParams();
  const friendId = searchParams.get('friendId');
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const person = useLiveQuery(() => friendId ? db.people.get(friendId) : undefined, [friendId]);
  const me = useLiveQuery(() => db.people.filter(p => p.isMe).first());
  const expenses = useLiveQuery(() => getActiveExpenses());
  const settlements = useLiveQuery(() => getActiveSettlements());
  const settingsArray = useLiveQuery(() => db.settings.toArray());

  const settings = settingsArray?.[0];
  const currency = settings?.defaultCurrency || 'INR';

  // Compute pairwise net balance directly between me and friend
  const netBalance = (expenses && settlements && me && person)
    ? computePairwiseBalance(expenses, settlements, me.id, person.id, currency)
    : 0;

  const [method, setMethod] = useState<'cash' | 'upi' | 'bank' | 'other'>('upi');
  const [userPayerType, setUserPayerType] = useState<'friend' | 'me' | null>(null);
  const [userAmountStr, setUserAmountStr] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState<string>(() => getTodayISODate());
  const [notes, setNotes] = useState<string>('');

  const payerType = userPayerType ?? (netBalance < 0 ? 'me' : 'friend');
  const amountStr = userAmountStr ?? (netBalance !== 0 ? (Math.abs(netBalance) / 100).toFixed(2) : '');

  if (person === undefined || me === undefined || expenses === undefined || settlements === undefined || settingsArray === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-8 animate-pulse">
        Loading...
      </div>
    );
  }

  if (!friendId || !person || !me) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Invalid friend selected for settlement.</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const isOwed = netBalance > 0;
  const isOwing = netBalance < 0;
  const fullOutstandingMinor = Math.abs(netBalance);

  const fromId = payerType === 'friend' ? person.id : me.id;
  const toId = payerType === 'friend' ? me.id : person.id;
  const payerName = payerType === 'friend' ? person.name : 'You';
  const recipientName = payerType === 'friend' ? 'You' : person.name;

  const handleSettle = async () => {
    const minor = parseDecimalToMinor(amountStr);

    if (isNaN(minor) || minor <= 0) {
      toast.error('Settlement amount must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSettlement({
        id: generateId(),
        groupId: null,
        fromId,
        toId,
        amountMinor: minor,
        currency,
        date: dateStr || getTodayISODate(),
        method,
        notes: notes.trim()
      });
      toast.success(`Settlement of ${formatMoney(minor, currency)} recorded`);
      navigate(-1);
    } catch (err) {
      console.error(err);
      toast.error('Failed to record settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Record Payment</h1>
      </div>

      {/* Outstanding Balance Banner */}
      <div className="p-4 rounded-xl border bg-card shadow-xs">
        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
          Current Balance
        </div>
        <div className="flex items-center justify-between">
          <div>
            {isOwed && (
              <p className="text-lg font-bold text-green-600">
                {person.name} owes you {formatMoney(netBalance, currency)}
              </p>
            )}
            {isOwing && (
              <p className="text-lg font-bold text-red-600">
                You owe {person.name} {formatMoney(fullOutstandingMinor, currency)}
              </p>
            )}
            {!isOwed && !isOwing && (
              <p className="text-lg font-bold text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-600" /> All settled up ({formatMoney(0, currency)})
              </p>
            )}
          </div>
          {fullOutstandingMinor > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isOwed) setUserPayerType('friend');
                if (isOwing) setUserPayerType('me');
                setUserAmountStr((fullOutstandingMinor / 100).toFixed(2));
              }}
              className="text-xs h-7"
            >
              Full balance
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border space-y-5">
        {/* Payer Toggle */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">Who Paid?</Label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-lg border">
            <button
              type="button"
              onClick={() => setUserPayerType('friend')}
              className={`py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                payerType === 'friend'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div
                className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: person.avatarColor }}
              >
                {person.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{person.name} paid</span>
            </button>
            <button
              type="button"
              onClick={() => setUserPayerType('me')}
              className={`py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                payerType === 'me'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div
                className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: me.avatarColor }}
              >
                {me.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">You paid</span>
            </button>
          </div>
        </div>

        {/* Visual Payment Flow */}
        <div className="flex items-center justify-center gap-3 p-3 bg-muted/20 rounded-lg border border-dashed">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: payerType === 'friend' ? person.avatarColor : me.avatarColor }}
            >
              {payerName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{payerName}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: payerType === 'friend' ? me.avatarColor : person.avatarColor }}
            >
              {recipientName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{recipientName}</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="settle-amount" className="text-sm font-medium">Amount ({currency})</Label>
          <div className="relative">
            <Input
              id="settle-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amountStr}
              onChange={e => setUserAmountStr(e.target.value)}
              className="text-lg font-bold h-12"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Payment Method</Label>
          <Select
            value={method}
            onValueChange={(v) => v && setMethod(v as 'cash' | 'upi' | 'bank' | 'other')}
            items={METHOD_LABELS}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select method">
                {(v) => METHOD_LABELS[v as keyof typeof METHOD_LABELS] || v}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upi">UPI (Google Pay / PhonePe / Paytm)</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank">Bank Transfer / IMPS</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="settle-date" className="text-sm font-medium">Date</Label>
          <DatePicker
            id="settle-date"
            value={dateStr}
            onChange={setDateStr}
            className="h-10 text-sm font-medium"
          />
        </div>

        {/* Notes (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="settle-notes" className="text-sm font-medium">Notes (Optional)</Label>
          <Input
            id="settle-notes"
            placeholder="e.g. Sent via UPI"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="h-10"
          />
        </div>

        <Button
          className="w-full mt-4 h-11 text-base font-semibold"
          onClick={handleSettle}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Recording...' : 'Confirm Settlement'}
        </Button>
      </div>
    </div>
  );
}
