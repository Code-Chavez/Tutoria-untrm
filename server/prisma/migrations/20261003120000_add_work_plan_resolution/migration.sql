-- AlterTable
ALTER TABLE "work_plans"
    ADD COLUMN "resolution_file_name" TEXT,
    ADD COLUMN "resolution_file_size" INTEGER,
    ADD COLUMN "resolution_storage_key" TEXT,
    ADD COLUMN "resolution_uploaded_at" TIMESTAMP(3);
