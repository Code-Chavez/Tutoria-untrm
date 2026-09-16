-- CreateTable
CREATE TABLE "tutor_assignment_history" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "previous_tutor_id" TEXT,
    "new_tutor_id" TEXT NOT NULL,
    "reassigned_by_id" TEXT NOT NULL,

    CONSTRAINT "tutor_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tutor_assignment_history_student_id_idx" ON "tutor_assignment_history"("student_id");

-- AddForeignKey
ALTER TABLE "tutor_assignment_history" ADD CONSTRAINT "tutor_assignment_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_assignment_history" ADD CONSTRAINT "tutor_assignment_history_previous_tutor_id_fkey" FOREIGN KEY ("previous_tutor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_assignment_history" ADD CONSTRAINT "tutor_assignment_history_new_tutor_id_fkey" FOREIGN KEY ("new_tutor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_assignment_history" ADD CONSTRAINT "tutor_assignment_history_reassigned_by_id_fkey" FOREIGN KEY ("reassigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
