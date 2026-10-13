import { useNavigate } from 'react-router-dom';
import type { Person, Expense, Settlement, Settings, Reminder } from '../../domain/types';
import { db } from '../../db/db';
import { formatMoney } from '../../lib/money';
import { sendWhatsAppReminder } from '../../lib/whatsapp';
import { Button } from '@/components/ui/button';
import {
  MessageCircle,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

interface PersonBalanceSummaryProps {
  person: Person;
  myId: string;
  currency: string;
  netBalance: number;
  isOwed: boolean;
  isOwing: boolean;
  totalTheyOweMeFromExpenses: number;
  totalIOweThemFromExpenses: number;
  totalSettledAmount?: number;
  amountToBeSettled?: number;
  activeSettlementsCount?: number;
  sharedExpenses: Expense[];
  sharedSettlements: Settlement[];
  settings?: Settings;
}

export function PersonBalanceSummary({
  person,
  myId,
  currency,
  netBalance,
  isOwed,
  isOwing,
  totalTheyOweMeFromExpenses,
  totalIOweThemFromExpenses,
  amountToBeSettled = Math.abs(netBalance),
  activeSettlementsCount = 0,
  sharedExpenses,
  sharedSettlements,
  settings,
}: PersonBalanceSummaryProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-2xl border p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Current Net Balance
          </h2>
          {isOwed && (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatMoney(netBalance, currency)}
              </span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                owes you
              </span>
            </div>
          )}
          {isOwing && (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                {formatMoney(Math.abs(netBalance), currency)}
              </span>
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                you owe
              </span>
            </div>
          )}
          {!isOwed && !isOwing && (
            <div className="flex items-center gap-2 text-xl font-bold text-muted-foreground">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <span>All settled up ({formatMoney(0, currency)})</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {isOwed
              ? `${person.name} owes you this balance.`
              : isOwing
              ? `You owe ${person.name} this balance.`
              : `You and ${person.name} are completely square.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {person.phone && (
            <Button
              variant="outline"
              className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              onClick={() => {
                if (settings) {
                  const openLink = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
                  const askSent = () => true;
                  const logReminder = async (rem: Reminder) => {
                    await db.reminders.add(rem);
                  };
                  const now = () => new Date().toISOString();
                  sendWhatsAppReminder(person, myId, sharedExpenses, sharedSettlements, settings, {
                    openLink,
                    askSent,
                    logReminder,
                    now,
                  });
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

      {/* Breakdown Subcards: What they owe you vs What you owe them vs Amount to be Settled */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t">
        {/* They owe you */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              They Owe You
            </p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {formatMoney(totalTheyOweMeFromExpenses, currency)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {activeSettlementsCount > 0 ? 'Since last settlement' : 'From shared expenses'}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
        </div>

        {/* You owe them */}
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
              You Owe Them
            </p>
            <p className="text-lg font-bold text-rose-700 dark:text-rose-300">
              {formatMoney(totalIOweThemFromExpenses, currency)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {activeSettlementsCount > 0 ? 'Since last settlement' : 'From shared expenses'}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        {/* Amount to be Settled */}
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300">
              Amount to be Settled
            </p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {formatMoney(amountToBeSettled, currency)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {netBalance > 0
                ? `${person.name} owes you`
                : netBalance < 0
                ? `You owe ${person.name}`
                : 'All settled up'}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonBalanceSummary;
