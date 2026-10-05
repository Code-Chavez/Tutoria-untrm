-- CreateTable
CREATE TABLE "tutor_semester_reports" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "period_id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "program_name" TEXT NOT NULL,
    "faculty" TEXT NOT NULL,
    "teacher_category" TEXT NOT NULL,
    "tutoring_cycles" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "individual" JSONB NOT NULL,
    "group" JSONB NOT NULL,

    CONSTRAINT "tutor_semester_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutor_semester_reports_period_id_tutor_id_key" ON "tutor_semester_reports"("period_id", "tutor_id");

-- AddForeignKey
ALTER TABLE "tutor_semester_reports" ADD CONSTRAINT "tutor_semester_reports_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_semester_reports" ADD CONSTRAINT "tutor_semester_reports_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
