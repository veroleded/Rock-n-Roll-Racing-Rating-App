import { GameMode, MatchResult } from "@prisma/client";
import { z } from "zod";

export const statsDataSchema = z.object({
  damage: z.record(z.string(), z.record(z.string(), z.number())),
  scores: z.record(z.string(), z.number()),
  mines_damage: z.record(z.string(), z.number()),
  money_taken: z.record(z.string(), z.number()),
  armor_taken: z.record(z.string(), z.number()),
  wipeouts: z.record(z.string(), z.number()),
  total_score: z.string(),
  divisions: z.record(z.string(), z.record(z.string(), z.number())),
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

export const matchResultDataSchema = z.object({
  result: z.nativeEnum(MatchResult),
  ratingChange: z.number(),
});

export type MatchResultData = z.infer<typeof matchResultDataSchema>;
