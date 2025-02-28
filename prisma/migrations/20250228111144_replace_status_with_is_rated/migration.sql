/*
  Warnings:

  - You are about to drop the column `status` on the `matches` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "matches" DROP COLUMN "status",
ADD COLUMN     "is_rated" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "MatchStatus";
