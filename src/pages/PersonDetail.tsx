import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getActiveExpenses, getActiveSettlements, softDeleteExpense, softDeleteSettlement, restoreExpense, restoreSettlement } from '../db/repositories';
import { computePairwiseBalance } from '../domain/ledger';
import { formatMoney } from '../lib/money';
import { sendWhatsAppReminder } from '../lib/whatsapp';
import type { Reminder } from '../domain/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, AlertCircle, Clock, MoreVertical, Edit2, Archive, Trash2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { EditFriendModal } from '../components/EditFriendModal';
import AddRefundModal from '../components/AddRefundModal';
import { toast } from 'sonner';

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'settlement'>('all');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedRefundExpense, setSelectedRefundExpense] = useState<any>(null);

  const person = useLiveQuery(() => id ? db.people.get(id) : undefined, [id]);
  const me = useLiveQuery(() => db.people.filter(p => p.isMe).first());
  const expenses = useLiveQuery(() => getActiveExpenses());
  const settlements = useLiveQuery(() => getActiveSettlements());
  const settingsArray = useLiveQuery(() => db.settings.toArray());

  if (person === undefined || me === undefined || expenses === undefined || settlements === undefined || settingsArray === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-muted mb-4" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!person || person.deletedAt) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not found</AlertTitle>
          <AlertDescription>This person does not exist or was deleted.</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const settings = settingsArray[0];
  const currency = settings?.defaultCurrency || 'INR';

  // Compute shared activities
  const myId = me.id;
  const friendId = person.id;

  const sharedExpenses = expenses.filter(e => e.participantIds.includes(myId) && e.participantIds.includes(friendId));
  const sharedSettlements = settlements.filter(s => (s.fromId === myId && s.toId === friendId) || (s.fromId === friendId && s.toId === myId));

  const activity = [...sharedExpenses, ...sharedSettlements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filteredActivity = activity.filter(item => {
    if (typeFilter === 'expense') return 'description' in item;
    if (typeFilter === 'settlement') return !('description' in item);
    return true;
  });

  const netBalance = computePairwiseBalance(expenses, settlements, myId, friendId, currency);
  const isOwed = netBalance > 0;
  const isOwing = netBalance < 0;

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this friend? They will be hidden from the friends list.')) return;
    try {
      await db.people.update(person.id, {
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast.success('Friend archived');
      navigate('/friends');
    } catch (e) {
      console.error(e);
      toast.error('Failed to archive friend');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDeleteItem = async (item: any) => {
    const isExpense = 'description' in item;
    const title = isExpense ? item.description : 'Payment';
    try {
      if (isExpense) {
        const result = await softDeleteExpense(item.id);
        const msg = result.deletedRefundCount > 0
          ? `Deleted "${title}" and ${result.deletedRefundCount} linked refund${result.deletedRefundCount > 1 ? 's' : ''}`
          : `Deleted "${title}"`;
        toast.success(msg, {
          action: { label: 'Undo', onClick: () => restoreExpense(item.id) },
        });
      } else {
        const result = await softDeleteSettlement(item.id);
        const msg = result.deletedRefundCount > 0
          ? `Deleted payment and ${result.deletedRefundCount} linked refund${result.deletedRefundCount > 1 ? 's' : ''}`
          : 'Deleted payment';
        toast.success(msg, {
          action: { label: 'Undo', onClick: () => restoreSettlement(item.id) },
        });
      }
    } catch {
      toast.error('Failed to delete transaction');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div 
            className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
            style={{ backgroundColor: person.avatarColor }}
          >
            {person.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{person.name}</h1>
            {person.phone && <p className="text-sm text-muted-foreground">{person.phone}</p>}
          </div>
        </div>

        {!person.isMe && (
          <DropdownMenu>
            <DropdownMenuTrigger>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive} className="text-amber-600 focus:text-amber-600">
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="bg-card p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-1">Balance</h2>
          {isOwed && (
            <div>
              <span className="text-sm text-green-600 font-medium mr-2">Owes you</span>
              <span className="text-3xl font-bold text-green-600">{formatMoney(netBalance)}</span>
            </div>
          )}
          {isOwing && (
            <div>
              <span className="text-sm text-red-600 font-medium mr-2">You owe</span>
              <span className="text-3xl font-bold text-red-600">{formatMoney(Math.abs(netBalance))}</span>
            </div>
          )}
          {!isOwed && !isOwing && (
            <div className="text-xl font-medium text-muted-foreground">Settled up</div>
          )}
        </div>
        
        <div className="flex gap-2">
          {person.phone && (
            <Button 
              variant="outline" 
              className="text-green-600 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => {
                if (settings) {
                  const openLink = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
                  const askSent = () => true;
                  const logReminder = async (rem: Reminder) => { await db.reminders.add(rem); };
                  const now = () => new Date().toISOString();
                  sendWhatsAppReminder(person, myId, expenses, settlements, settings, { openLink, askSent, logReminder, now });
                }
              }}
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Remind
            </Button>
          )}
          {netBalance !== 0 ? (
            <Button onClick={() => navigate(`/settle?friendId=${person.id}`)}>
              Settle Up
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate(`/settle?friendId=${person.id}`)}>
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold">Activity with {person.name}</h2>
          <div className="flex gap-2">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('all')}
              className="rounded-full text-xs h-7"
            >
              All ({activity.length})
            </Button>
            <Button
              variant={typeFilter === 'expense' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('expense')}
              className="rounded-full text-xs h-7"
            >
              Expenses ({sharedExpenses.length})
            </Button>
            <Button
              variant={typeFilter === 'settlement' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('settlement')}
              className="rounded-full text-xs h-7"
            >
              Settlements ({sharedSettlements.length})
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {filteredActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-xl border border-dashed">
              <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">No activity found</p>
            </div>
          ) : (
            filteredActivity.map((item) => {
              const isExpense = 'description' in item;
              const isRefundItem = isExpense && (!!item.isRefund || !!item.refundOfId);

              return (
                <div key={item.id} className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-sm">
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium truncate">
                        {isExpense ? item.description : 'Payment'}
                      </p>
                      {isRefundItem && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          Refund
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="font-semibold text-right">
                      {formatMoney(item.amountMinor)}
                    </div>
                    {isExpense && !isRefundItem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => setSelectedRefundExpense(item)}
                        title="Record refund for this expense"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteItem(item)}
                      title="Delete transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {editOpen && <EditFriendModal person={person} onClose={() => setEditOpen(false)} />}
      {selectedRefundExpense && (
        <AddRefundModal
          expense={selectedRefundExpense}
          onClose={() => setSelectedRefundExpense(null)}
        />
      )}
    </div>
  );
}
