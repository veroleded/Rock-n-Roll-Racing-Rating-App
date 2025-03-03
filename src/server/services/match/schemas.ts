import { GameMode, MatchResult } from "@prisma/client";
import { z } from "zod";

const playerKeySchema = z.enum(["player1", "player2", "player3", "player4", "player5", "player6"]);

export const createStatsDataSchema = z.object({
   damage: z.record(playerKeySchema, z.record(playerKeySchema, z.number())),
  scores: z.record(playerKeySchema, z.number()),
  mines_damage: z.record(playerKeySchema, z.number()),
  money_taken: z.record(playerKeySchema, z.number()),
  armor_taken: z.record(playerKeySchema, z.number()),
  wipeouts: z.record(playerKeySchema, z.number()),
  total_score: z.string(),
  divisions: z.record(z.string(), z.record(playerKeySchema, z.number())),
});

export type CreateStatsData = z.infer<typeof createStatsDataSchema>;


// Создаем новую схему для данных дивизиона
const databaseDivisionDataSchema = z.object({
  scores: z.number(),
  result: z.nativeEnum(MatchResult),
});

export type DatabaseDivisionData = z.infer<typeof databaseDivisionDataSchema>;

export const normalizedDivisionDataSchema = z.record(z.string(), z.record(z.string(), databaseDivisionDataSchema));

export type NormalizedDivisionData = z.infer<typeof normalizedDivisionDataSchema>;

export const normalizedStatsDataSchema = z.object({
  damage: z.record(z.string(), z.record(z.string(), z.number())),
  scores: z.record(z.string(), z.number()),
  mines_damage: z.record(z.string(), z.number()),
  money_taken: z.record(z.string(), z.number()),
  armor_taken: z.record(z.string(), z.number()),
  wipeouts: z.record(z.string(), z.number()),
  total_score: z.string(),
  divisions: normalizedDivisionDataSchema,
});

export type NormalizedStatsData = z.infer<typeof normalizedStatsDataSchema>;

export const createMatchPlayerSchema = z.object({
  userId: z.string(),
  team: z.number(),
  position: z.number(),
  hasLeft: z.boolean(),
});

export type CreateMatchPlayer = z.infer<typeof createMatchPlayerSchema>;

export const createMatchDataSchema = z.object({
  mode: z.nativeEnum(GameMode),
  players: z.array(createMatchPlayerSchema),
  statsData: createStatsDataSchema,
  creatorId: z.string(),
});

export type CreateMatchData = z.infer<typeof createMatchDataSchema>;

export const damageSchema = z.object({
  isAlly: z.boolean(),
  damage: z.number(),
});

export type Damage = z.infer<typeof damageSchema>;

export const damagesSchema = z.record(z.string(), damageSchema);

export type Damages = z.infer<typeof damagesSchema>;
export const editMatchDataSchema = z.object({
  mode: z.nativeEnum(GameMode),
  players: z.array(createMatchPlayerSchema),
  statsData: createStatsDataSchema,
  creatorId: z.string(),
  editMatchId: z.string()
});

export type EditMatchDataSchema = z.infer<typeof editMatchDataSchema>

export const matchResultDataSchema = z.object({
  result: z.nativeEnum(MatchResult),
  ratingChange: z.number(),
});

export type MatchResultData = z.infer<typeof matchResultDataSchema>;
