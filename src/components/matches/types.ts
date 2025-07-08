import { GameMode, Role } from '@prisma/client';

export type DamageDealt = Record<string, { isAlly: boolean; damage: number }>;
export type DamageReceived = Record<string, { isAlly: boolean; damage: number }>;
export type Divisions = Record<string, { scores: number; result: 'WIN' | 'LOSS' | 'DRAW' }>;

// Тип для игрока в матче
export interface MatchPlayer {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    emailVerified: Date | null;
    image: string | null;
    role: Role;
    hasJoinedBot: boolean;
  };
  score: number;
  team: number;
  result: 'WIN' | 'LOSS' | 'DRAW';
  hasLeft: boolean;
  ratingChange: number;
  damageDealt: DamageDealt;
  damageReceived: DamageReceived;
  totalDamageDealt: number;
  totalDamageReceived: number;
  moneyTaken: number;
  armorTaken: number;
  minesDamage: number;
  wipeouts: number;
  divisions: Divisions;
  createdAt: Date;
  updatedAt: Date;
}

// Тип для создателя матча
export interface MatchCreator {
  id: string;
  name: string | null;
  image: string | null;
}

// Тип для общих данных матча
export interface MatchData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  creator: MatchCreator;
  isRated: boolean;
  isLast: boolean;
  mode: GameMode;
  totalScore: string;
  players: MatchPlayer[];
}
