-- CreateTable
CREATE TABLE "signed_documents" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "referral_id" TEXT,
    "student_id" TEXT,
    "period_id" TEXT,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,

    CONSTRAINT "signed_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signed_documents_referral_id_idx" ON "signed_documents"("referral_id");
CREATE INDEX "signed_documents_student_id_period_id_idx" ON "signed_documents"("student_id", "period_id");

-- AddForeignKey
ALTER TABLE "signed_documents" ADD CONSTRAINT "signed_documents_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "student_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signed_documents" ADD CONSTRAINT "signed_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signed_documents" ADD CONSTRAINT "signed_documents_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signed_documents" ADD CONSTRAINT "signed_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
