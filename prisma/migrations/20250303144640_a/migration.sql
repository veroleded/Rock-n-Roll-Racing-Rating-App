-- AlterTable
ALTER TABLE "stats" ADD COLUMN     "draws_divisions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "losses_divisions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_divisions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wins_divisions" INTEGER NOT NULL DEFAULT 0;
