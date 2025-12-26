-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('GAME', 'EMULATOR');

-- CreateTable
CREATE TABLE "download_files" (
    "id" TEXT NOT NULL,
    "type" "FileType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT NOT NULL,

    CONSTRAINT "download_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "download_files_type_key" ON "download_files"("type");

