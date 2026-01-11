/*
  Warnings:

  - You are about to drop the column `player_id` on the `queues` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "queues" DROP CONSTRAINT "queues_player_id_fkey";

-- DropIndex
DROP INDEX "queues_player_id_key";

-- AlterTable
ALTER TABLE "queues" DROP COLUMN "player_id";

-- CreateTable
CREATE TABLE "_QueuePlayers" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_QueuePlayers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_QueuePlayers_B_index" ON "_QueuePlayers"("B");

-- AddForeignKey
ALTER TABLE "_QueuePlayers" ADD CONSTRAINT "_QueuePlayers_A_fkey" FOREIGN KEY ("A") REFERENCES "queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QueuePlayers" ADD CONSTRAINT "_QueuePlayers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
