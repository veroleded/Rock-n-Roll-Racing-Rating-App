/*
  Warnings:

  - You are about to drop the column `money` on the `match_players` table. All the data in the column will be lost.
  - You are about to drop the column `game_file` on the `matches` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "match_players" DROP COLUMN "money",
ADD COLUMN     "armor_taken" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "damage_dealt" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "divisions" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "has_left" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mines_damage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "money_taken" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "matches" DROP COLUMN "game_file",
ADD COLUMN     "total_score" TEXT NOT NULL DEFAULT '0 - 0';
