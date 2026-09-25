-- CreateTable
CREATE TABLE "session_evidences" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,

    CONSTRAINT "session_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_evidences_session_id_idx" ON "session_evidences"("session_id");

-- AddForeignKey
ALTER TABLE "session_evidences" ADD CONSTRAINT "session_evidences_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_evidences" ADD CONSTRAINT "session_evidences_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
