import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type PlayerData = {
  id: string;
  name: string;
  score: number;
  rating: number;
  ratingChange: number;
  damage: number;
  money: number;
  medkits: number;
  powerups: number;
  playerDamage: { [key: string]: number };
};

type TeamData = {
  id: string;
  players: PlayerData[];
  totalScore: number;
};

interface PlayerStatsProps {
  teams: TeamData[];
  totalTeamScore?: number;
}

export const PlayerStats = ({ teams }: PlayerStatsProps) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team) => (
          <TeamStatsCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
};

const TeamStatsCard = ({ team }: { team: TeamData }) => {
  return (
    <Card className="overflow-hidden">
      <div className="bg-primary/10 p-4 flex justify-between items-center">
        <h3 className="font-bold text-xl">Игрок_{team.players[0].name}</h3>
        <div className="flex flex-col items-end">
          <div className="font-bold text-xl">{team.players[0].score}</div>
          <div
            className={cn(
              'text-sm font-medium',
              team.players[0].ratingChange > 0 ? 'text-green-500' : 'text-red-500'
            )}
          >
            {team.players[0].ratingChange > 0 ? '+' : ''}
            {team.players[0].ratingChange}
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="space-y-4">
          <StatsSection
            title="Урон по игрокам:"
            items={Object.entries(team.players[0].playerDamage).map(([player, damage]) => ({
              label: `Игрок_${player}:`,
              value: damage,
            }))}
          />

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <StatCard label="Урон" value={team.players[0].damage.toLocaleString()} />
            <StatCard
              label="Деньги"
              value={`$${team.players[0].money.toLocaleString()}`}
              valueClassName="text-green-500"
            />
            <StatCard label="Аптечки" value={team.players[0].medkits.toString()} />
            <StatCard label="Вайпауты" value={team.players[0].powerups.toString()} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StatsSection = ({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number }[];
}) => {
  return (
    <div>
      <h4 className="font-medium mb-2">{title}</h4>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span>{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => {
  return (
    <div className="bg-muted rounded-lg p-3">
      <div className="text-sm font-medium">{label}</div>
      <div className={cn('text-xl font-bold mt-1', valueClassName)}>{value}</div>
    </div>
  );
};
