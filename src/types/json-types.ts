export type DamageDealt = Record<
  string,
  {
    isAlly: boolean;
    damage: number;
  }
>;

export type DamageReceived = Record<
  string,
  {
    isAlly: boolean;
    damage: number;
  }
>;

export type Divisions = Record<
  string,
  {
    scores: number;
    result: 'WIN' | 'LOSS' | 'DRAW';
  }
>;

declare module '@prisma/client' {
  interface PrismaJsonTypes {
    damageDealt: DamageDealt;
    damageReceived: DamageReceived;
    divisions: Divisions;
  }
}
