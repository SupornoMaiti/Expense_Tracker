import { useLiveQuery } from 'dexie-react-hooks';
import type { Reminder } from '../domain/types';
import { db } from '../db/db';
import { getActiveExpenses, getActiveSettlements, getActivePeople } from '../db/repositories';
import { computePairwiseBalance } from '../domain/ledger';
import { sendWhatsAppReminder } from '../lib/whatsapp';
import { formatMoney } from '../lib/money';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, UserPlus, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { AddFriendModal } from '../components/AddFriendModal';

export default function Friends() {
  const navigate = useNavigate();
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const people = useLiveQuery(() => getActivePeople()) || [];
  const expenses = useLiveQuery(() => getActiveExpenses()) || [];
  const settlements = useLiveQuery(() => getActiveSettlements()) || [];
  const settingsArray = useLiveQuery(() => db.settings.toArray()) || [];
  
  const settings = settingsArray[0];
  const me = people.find(p => p.isMe);
  const myId = me?.id || '';
  const friends = people.filter(p => !p.isMe);

  const currency = settings?.defaultCurrency || 'INR';

  // Detect non-default currencies
  const otherCurrencies = Array.from(new Set([
    ...expenses.filter(e => e.currency && e.currency !== currency).map(e => e.currency),
    ...settlements.filter(s => s.currency && s.currency !== currency).map(s => s.currency)
  ]));

  // Map each friend to their net balance with me
  const friendBalances = friends.map(friend => {
    const netBalance = computePairwiseBalance(expenses, settlements, myId, friend.id, currency);
    const nonDefaultBalances = otherCurrencies
      .map(c => ({
        currency: c,
        balance: computePairwiseBalance(expenses, settlements, myId, friend.id, c)
      }))
      .filter(b => b.balance !== 0);

    return {
      ...friend,
      netBalance,
      nonDefaultBalances
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
          <p className="text-muted-foreground">Manage your connections and balances</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddFriendOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Friend
          </Button>
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-xl border border-dashed">
          <UserPlus className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No friends yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Add your friends to start tracking expenses.</p>
          <Button onClick={() => setAddFriendOpen(true)}>Add or Import Friends</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {friendBalances.map(friend => {
            const isOwed = friend.netBalance > 0;
            const isOwing = friend.netBalance < 0;

            return (
              <Card key={friend.id} className="overflow-hidden hover:bg-muted/50 transition-colors">
                <CardContent className="p-0">
                  <div className="flex items-center p-4">
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                      style={{ backgroundColor: friend.avatarColor }}
                    >
                      {friend.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="ml-4 flex-1 min-w-0">
                      <Link to={`/friends/${friend.id}`} className="font-medium hover:underline block truncate">
                        {friend.name}
                      </Link>
                      {friend.phone && <p className="text-xs text-muted-foreground">{friend.phone}</p>}
                      {friend.nonDefaultBalances.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {friend.nonDefaultBalances.map(nb => (
                            <span
                              key={nb.currency}
                              className={`text-[10px] px-1.5 py-0.5 rounded-sm font-semibold border ${
                                nb.balance > 0
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {nb.currency} {nb.balance > 0 ? `+${formatMoney(nb.balance, nb.currency)}` : `-${formatMoney(Math.abs(nb.balance), nb.currency)}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end mr-4 shrink-0">
                      {isOwed && (
                        <>
                          <span className="text-xs text-green-600 font-medium">Owes you</span>
                          <span className="font-bold text-green-600">{formatMoney(friend.netBalance, currency)}</span>
                        </>
                      )}
                      {isOwing && (
                        <>
                          <span className="text-xs text-red-600 font-medium">You owe</span>
                          <span className="font-bold text-red-600">{formatMoney(Math.abs(friend.netBalance), currency)}</span>
                        </>
                      )}
                      {!isOwed && !isOwing && (
                        <span className="text-sm text-muted-foreground">Settled up</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-l pl-4 shrink-0">
                      {friend.phone && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/50"
                          title="Remind on WhatsApp"
                          onClick={() => {
                            if (settings) {
                              const openLink = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
                              const askSent = () => true; // No longer used, handled directly in sendWhatsAppReminder
                              const logReminder = async (rem: Reminder) => { await db.reminders.add(rem); };
                              const now = () => new Date().toISOString();
                              sendWhatsAppReminder(friend, myId, expenses, settlements, settings, { openLink, askSent, logReminder, now });
                            }
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/friends/${friend.id}`)}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}


      {addFriendOpen && <AddFriendModal onClose={() => setAddFriendOpen(false)} />}
    </div>
  );
}
