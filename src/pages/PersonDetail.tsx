import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { usePersonDetailData } from '../hooks/usePersonDetailData';
import PersonHeader from '../components/person/PersonHeader';
import PersonBalanceSummary from '../components/person/PersonBalanceSummary';
import PersonActivityFeed from '../components/person/PersonActivityFeed';
import { EditFriendModal } from '../components/EditFriendModal';
import AddRefundModal from '../components/AddRefundModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import type { Expense } from '../domain/types';

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRefundExpense, setSelectedRefundExpense] = useState<Expense | null>(null);

  const data = usePersonDetailData(id);

  if (data.isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-muted mb-4" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!data.person || data.person.deletedAt) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not found</AlertTitle>
          <AlertDescription>This person does not exist or was deleted.</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PersonHeader person={data.person} onEdit={() => setEditOpen(true)} />

      <PersonBalanceSummary
        person={data.person}
        myId={data.myId}
        currency={data.currency}
        netBalance={data.netBalance}
        isOwed={data.isOwed}
        isOwing={data.isOwing}
        totalTheyOweMeFromExpenses={data.totalTheyOweMeFromExpenses}
        totalIOweThemFromExpenses={data.totalIOweThemFromExpenses}
        totalSettledAmount={data.totalSettledAmount}
        amountToBeSettled={data.amountToBeSettled}
        activeSettlementsCount={data.activeSettlementsCount}
        sharedExpenses={data.sharedExpenses}
        sharedSettlements={data.sharedSettlements}
        settings={data.settings}
      />

      <PersonActivityFeed
        person={data.person}
        myId={data.myId}
        allPeople={data.allPeople}
        currency={data.currency}
        sharedExpenses={data.sharedExpenses}
        sharedSettlements={data.sharedSettlements}
        onSelectRefundExpense={(expense) => setSelectedRefundExpense(expense)}
      />

      {editOpen && <EditFriendModal person={data.person} onClose={() => setEditOpen(false)} />}
      {selectedRefundExpense && (
        <AddRefundModal
          expense={selectedRefundExpense}
          onClose={() => setSelectedRefundExpense(null)}
        />
      )}
    </div>
  );
}
