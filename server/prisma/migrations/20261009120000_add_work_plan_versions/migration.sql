-- AlterTable
ALTER TABLE "work_plans" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "work_plan_versions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "work_plan_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "resolution_file_name" TEXT NOT NULL,
    "resolution_file_size" INTEGER NOT NULL,
    "resolution_storage_key" TEXT NOT NULL,
    "resolution_uploaded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_plan_versions_work_plan_id_revision_key" ON "work_plan_versions"("work_plan_id", "revision");

-- AddForeignKey
ALTER TABLE "work_plan_versions" ADD CONSTRAINT "work_plan_versions_work_plan_id_fkey" FOREIGN KEY ("work_plan_id") REFERENCES "work_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
