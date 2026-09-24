-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "coordinator_id" TEXT;

-- CreateTable
CREATE TABLE "tutoring_requests" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "student_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "instructor_name" TEXT,
    "course_name" TEXT,
    "case_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "routed_to_id" TEXT NOT NULL,
    "routed_to_role" TEXT NOT NULL,

    CONSTRAINT "tutoring_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tutoring_requests_student_id_idx" ON "tutoring_requests"("student_id");

-- CreateIndex
CREATE INDEX "tutoring_requests_routed_to_id_idx" ON "tutoring_requests"("routed_to_id");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutoring_requests" ADD CONSTRAINT "tutoring_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutoring_requests" ADD CONSTRAINT "tutoring_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutoring_requests" ADD CONSTRAINT "tutoring_requests_routed_to_id_fkey" FOREIGN KEY ("routed_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
