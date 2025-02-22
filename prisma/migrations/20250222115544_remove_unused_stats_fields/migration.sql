/*
  Warnings:

  - You are about to drop the column `total_damage` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `total_money` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `wipeouts` on the `stats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stats" DROP COLUMN "total_damage",
DROP COLUMN "total_money",
DROP COLUMN "wipeouts";
