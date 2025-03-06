-- CreateTable
CREATE TABLE "queues" (
    "id" SERIAL NOT NULL,
    "gameType" "GameMode" NOT NULL,
    "player_id" TEXT NOT NULL,
    "botsCount" INTEGER NOT NULL DEFAULT 0,
    "lastAdded" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "queues_player_id_key" ON "queues"("player_id");

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
