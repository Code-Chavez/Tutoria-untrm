-- AlterTable
ALTER TABLE "students" ADD COLUMN     "assigned_at" TIMESTAMP(3),
ADD COLUMN     "tutor_id" TEXT;

-- CreateIndex
CREATE INDEX "students_tutor_id_idx" ON "students"("tutor_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
