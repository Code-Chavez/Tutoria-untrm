-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancel_reason" TEXT;

-- CreateTable
CREATE TABLE "session_change_history" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "previous_scheduled_at" TIMESTAMP(3),
    "new_scheduled_at" TIMESTAMP(3),
    "changed_by_id" TEXT NOT NULL,

    CONSTRAINT "session_change_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_change_history_session_id_idx" ON "session_change_history"("session_id");

-- AddForeignKey
ALTER TABLE "session_change_history" ADD CONSTRAINT "session_change_history_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_change_history" ADD CONSTRAINT "session_change_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
