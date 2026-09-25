-- CreateTable
CREATE TABLE "tutor_follow_ups" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "student_id" TEXT NOT NULL,
    "conducted_by_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "agreements" TEXT NOT NULL,
    "instructor_name" TEXT,
    "course_name" TEXT,
    "course_cycle" INTEGER,

    CONSTRAINT "tutor_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tutor_follow_ups_student_id_idx" ON "tutor_follow_ups"("student_id");

-- AddForeignKey
ALTER TABLE "tutor_follow_ups" ADD CONSTRAINT "tutor_follow_ups_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_follow_ups" ADD CONSTRAINT "tutor_follow_ups_conducted_by_id_fkey" FOREIGN KEY ("conducted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
