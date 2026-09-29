-- CreateTable
CREATE TABLE "tutor_evaluations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "student_id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "scores" TEXT[],
    "likes" TEXT,
    "dislikes" TEXT,

    CONSTRAINT "tutor_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutor_evaluations_student_id_period_id_key" ON "tutor_evaluations"("student_id", "period_id");

-- AddForeignKey
ALTER TABLE "tutor_evaluations" ADD CONSTRAINT "tutor_evaluations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_evaluations" ADD CONSTRAINT "tutor_evaluations_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_evaluations" ADD CONSTRAINT "tutor_evaluations_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
