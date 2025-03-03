/*
  Warnings:

  - You are about to drop the column `damage` on the `match_players` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "match_players" DROP COLUMN "damage",
ADD COLUMN     "damage_received" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "total_damage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_damage_received" INTEGER NOT NULL DEFAULT 0;
