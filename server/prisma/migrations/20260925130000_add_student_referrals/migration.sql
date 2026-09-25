-- CreateTable
CREATE TABLE "student_referrals" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "student_id" TEXT NOT NULL,
    "referred_by_id" TEXT NOT NULL,
    "checked_aspects" TEXT[],
    "reason" TEXT NOT NULL,
    "service" TEXT NOT NULL,

    CONSTRAINT "student_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_referrals_student_id_idx" ON "student_referrals"("student_id");

-- AddForeignKey
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
