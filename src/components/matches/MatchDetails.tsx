import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameMode } from '@prisma/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { User } from 'lucide-react';
import React from 'react';
import { gameModeNames } from './MatchHeader';

interface Creator {
  id: string;
  name: string | null;
  image: string | null;
}

interface MatchDetailsProps {
  creator: Creator;
  createdAt: Date;
  mode: GameMode;
  isRated: boolean;
}

export const MatchDetails: React.FC<MatchDetailsProps> = ({
  creator,
  createdAt,
  mode,
  isRated,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Детали матча</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium">Создатель</div>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src={creator.image || ''} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span>{creator.name}</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">Дата создания</div>
            <div className="text-muted-foreground">
              {format(new Date(createdAt), 'd MMMM yyyy, HH:mm', {
                locale: ru,
              })}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">Режим игры</div>
            <div className="text-muted-foreground">{gameModeNames[mode]}</div>
          </div>
          <div>
            <div className="text-sm font-medium">Тип матча</div>
            <div className="text-muted-foreground">{isRated ? 'Рейтинговый' : 'Обычный'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
