-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "modality" TEXT NOT NULL DEFAULT 'PRESENCIAL',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "meeting_link" TEXT;
