import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getActiveExpenses, getActiveSettlements, getActivePeople } from '../db/repositories';
import { computeBalances, simplifyDebts } from '../domain/ledger';
import { getWhatsAppLink } from '../lib/whatsapp';
import { formatMoney } from '../lib/money';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, UserPlus, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Friends() {
  const navigate = useNavigate();
  const people = useLiveQuery(() => getActivePeople()) || [];
  const expenses = useLiveQuery(() => getActiveExpenses()) || [];
  const settlements = useLiveQuery(() => getActiveSettlements()) || [];
  const settingsArray = useLiveQuery(() => db.settings.toArray()) || [];
  
  const settings = settingsArray[0];
  const me = people.find(p => p.isMe);
  const myId = me?.id || '';
  const friends = people.filter(p => !p.isMe);

  const balances = computeBalances(expenses, settlements).filter(b => b.currency === (settings?.defaultCurrency || 'INR'));
  const debts = simplifyDebts(balances, settings?.defaultCurrency || 'INR');

  // Map each friend to their net balance with me
  const friendBalances = friends.map(friend => {
    let owedToMe = 0;
    let iOwe = 0;
    
    for (const d of debts) {
      if (d.fromId === friend.id && d.toId === myId) owedToMe += d.amountMinor;
      if (d.fromId === myId && d.toId === friend.id) iOwe += d.amountMinor;
    }
    
    return {
      ...friend,
      netBalance: owedToMe - iOwe
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
          <Button onClick={() => navigate('/import-contacts')} variant="outline">
            Import Contacts
          </Button>
          <Button onClick={() => alert('TODO: Add Friend Modal')}>
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
          <Button onClick={() => navigate('/import-contacts')}>Import from Contacts</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {friendBalances.map(friend => {
            const isOwed = friend.netBalance > 0;
            const isOwing = friend.netBalance < 0;
            const waLink = isOwed && settings ? getWhatsAppLink(friend, friend.netBalance, settings.defaultCurrency, settings) : null;

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
                    
                    <div className="ml-4 flex-1">
                      <Link to={`/friends/${friend.id}`} className="font-medium hover:underline block">
                        {friend.name}
                      </Link>
                      {friend.phone && <p className="text-xs text-muted-foreground">{friend.phone}</p>}
                    </div>

                    <div className="flex flex-col items-end mr-4">
                      {isOwed && (
                        <>
                          <span className="text-xs text-green-600 font-medium">Owes you</span>
                          <span className="font-bold text-green-600">{formatMoney(friend.netBalance)}</span>
                        </>
                      )}
                      {isOwing && (
                        <>
                          <span className="text-xs text-red-600 font-medium">You owe</span>
                          <span className="font-bold text-red-600">{formatMoney(Math.abs(friend.netBalance))}</span>
                        </>
                      )}
                      {!isOwed && !isOwing && (
                        <span className="text-sm text-muted-foreground">Settled up</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-l pl-4">
                      {isOwed && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/50"
                          disabled={!friend.phone}
                          title={friend.phone ? "Remind on WhatsApp" : "No phone number added"}
                          onClick={() => {
                            if (waLink) window.open(waLink, '_blank', 'noopener,noreferrer');
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
    </div>
  );
}
