import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

interface MatchActionButtonsProps {
  matchId: string;
  isDeleting: boolean;
  onDelete: () => void;
}

export const MatchActionButtons: React.FC<MatchActionButtonsProps> = ({
  matchId,
  isDeleting,
  onDelete,
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className="text-xs sm:text-sm">
        <Link
          onClick={(e) => {
            e.stopPropagation();
          }}
          href={`${matchId}/edit`}
        >
          Изменить
        </Link>
      </Button>
      <Button variant="destructive" size="sm" onClick={onDelete} disabled={isDeleting} className="text-xs sm:text-sm">
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        <span className="ml-1 sm:ml-2 hidden sm:inline">Удалить матч</span>
        <span className="ml-1 sm:hidden">Удалить</span>
      </Button>
    </div>
  );
};
