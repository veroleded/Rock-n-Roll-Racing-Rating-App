/*
  Warnings:

  - You are about to drop the column `total_damage` on the `match_players` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "match_players" DROP COLUMN "total_damage",
ADD COLUMN     "total_damage_dealt" INTEGER NOT NULL DEFAULT 0;
