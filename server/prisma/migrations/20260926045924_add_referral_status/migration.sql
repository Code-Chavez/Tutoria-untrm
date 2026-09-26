-- AlterTable
ALTER TABLE "student_referrals" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ENVIADO';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "service" TEXT;

-- CreateTable
CREATE TABLE "referral_status_history" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referral_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "changed_by_id" TEXT NOT NULL,

    CONSTRAINT "referral_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referral_status_history_referral_id_idx" ON "referral_status_history"("referral_id");

-- AddForeignKey
ALTER TABLE "referral_status_history" ADD CONSTRAINT "referral_status_history_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "student_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_status_history" ADD CONSTRAINT "referral_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
