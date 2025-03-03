import { GameMode, MatchResult } from "@prisma/client";
import { z } from "zod";

const playerKeySchema = z.enum(["player1", "player2", "player3", "player4", "player5", "player6"]);

// Создаем новую схему для данных дивизиона
const divisionDataSchema = z.object({
  scores: z.record(z.string(), z.number()),
  result: z.nativeEnum(MatchResult),
});

export type DivisionData = z.infer<typeof divisionDataSchema>;

export const statsDataSchema = z.object({
  damage: z.record(playerKeySchema, z.record(playerKeySchema, z.number())),
  scores: z.record(playerKeySchema, z.number()),
  mines_damage: z.record(playerKeySchema, z.number()),
  money_taken: z.record(playerKeySchema, z.number()),
  armor_taken: z.record(playerKeySchema, z.number()),
  wipeouts: z.record(playerKeySchema, z.number()),
  total_score: z.string(),
  divisions: z.record(playerKeySchema, divisionDataSchema),
});

export type StatsData = z.infer<typeof statsDataSchema>;

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
  statsData: statsDataSchema,
  creatorId: z.string(),
});

export type CreateMatchData = z.infer<typeof createMatchDataSchema>;

export const editMatchDataSchema = z.object({
  mode: z.nativeEnum(GameMode),
  players: z.array(createMatchPlayerSchema),
  statsData: statsDataSchema,
  creatorId: z.string(),
  editMatchId: z.string()
});

export type EditMatchDataSchema = z.infer<typeof editMatchDataSchema>

export const matchResultDataSchema = z.object({
  result: z.nativeEnum(MatchResult),
  ratingChange: z.number(),
});

export type MatchResultData = z.infer<typeof matchResultDataSchema>;
