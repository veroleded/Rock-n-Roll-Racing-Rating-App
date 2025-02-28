-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('WIN', 'LOSS', 'DRAW');

-- AlterTable
ALTER TABLE "match_players" ADD COLUMN     "result" "MatchResult" NOT NULL DEFAULT 'LOSS';
