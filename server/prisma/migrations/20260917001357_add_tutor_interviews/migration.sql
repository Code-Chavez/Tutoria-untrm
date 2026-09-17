-- CreateTable
CREATE TABLE "tutor_interviews" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "student_id" TEXT NOT NULL,
    "conducted_by_id" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3),
    "origin_place" TEXT,
    "age" INTEGER,
    "religion" TEXT,
    "marital_status" TEXT,
    "siblings_order" TEXT,
    "address" TEXT,
    "admission_year" INTEGER,
    "motive_academic" BOOLEAN NOT NULL DEFAULT false,
    "motive_personal_emotional" BOOLEAN NOT NULL DEFAULT false,
    "motive_vocational" BOOLEAN NOT NULL DEFAULT false,
    "motive_detail" TEXT,
    "aspects_discussed" TEXT NOT NULL,
    "agreements" TEXT NOT NULL,

    CONSTRAINT "tutor_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tutor_interviews_student_id_idx" ON "tutor_interviews"("student_id");

-- AddForeignKey
ALTER TABLE "tutor_interviews" ADD CONSTRAINT "tutor_interviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_interviews" ADD CONSTRAINT "tutor_interviews_conducted_by_id_fkey" FOREIGN KEY ("conducted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
