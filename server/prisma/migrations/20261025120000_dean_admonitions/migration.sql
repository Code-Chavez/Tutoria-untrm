-- Rol Decano y amonestaciones (fase 5): el Decano pertenece a una facultad y amonesta a los docentes tutores de ella.
ALTER TABLE "users" ADD COLUMN "faculty_id" TEXT;
CREATE INDEX "users_faculty_id_idx" ON "users"("faculty_id");
ALTER TABLE "users" ADD CONSTRAINT "users_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "admonitions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tutor_id" TEXT NOT NULL,
    "issued_by_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "issued_on" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "file_name" TEXT,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "storage_key" TEXT,
    "sha256" TEXT,
    CONSTRAINT "admonitions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admonitions_faculty_id_issued_on_idx" ON "admonitions"("faculty_id", "issued_on");
CREATE INDEX "admonitions_tutor_id_idx" ON "admonitions"("tutor_id");
ALTER TABLE "admonitions" ADD CONSTRAINT "admonitions_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admonitions" ADD CONSTRAINT "admonitions_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
