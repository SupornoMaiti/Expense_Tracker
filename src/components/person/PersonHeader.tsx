import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Person } from '../../domain/types';
import { db } from '../../db/db';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreVertical, Edit2, Archive } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

interface PersonHeaderProps {
  person: Person;
  onEdit: () => void;
}

export function PersonHeader({ person, onEdit }: PersonHeaderProps) {
  const navigate = useNavigate();
  const [showConfirmArchive, setShowConfirmArchive] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchive = async () => {
    try {
      setIsArchiving(true);
      await db.people.update(person.id, {
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Friend archived');
      navigate('/friends');
    } catch (e) {
      console.error(e);
      toast.error('Failed to archive friend');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
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
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowConfirmArchive(true)}
                className="text-amber-600 focus:text-amber-600"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ConfirmDialog
        open={showConfirmArchive}
        onOpenChange={setShowConfirmArchive}
        title="Archive Friend"
        description="Are you sure you want to archive this friend? They will be hidden from the friends list."
        confirmText="Archive"
        variant="destructive"
        onConfirm={handleArchive}
        isLoading={isArchiving}
      />
    </>
  );
}

export default PersonHeader;
