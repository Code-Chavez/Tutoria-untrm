-- CreateTable
CREATE TABLE "student_period_snapshots" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL,
    "tutor_id" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "is_at_risk" BOOLEAN NOT NULL,

    CONSTRAINT "student_period_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_period_snapshots_period_id_student_id_key" ON "student_period_snapshots"("period_id", "student_id");
CREATE INDEX "student_period_snapshots_period_id_idx" ON "student_period_snapshots"("period_id");

-- AddForeignKey
ALTER TABLE "student_period_snapshots" ADD CONSTRAINT "student_period_snapshots_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_period_snapshots" ADD CONSTRAINT "student_period_snapshots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Los semestres que ya están cerrados congelan hoy la matrícula vigente: es lo más cercano
-- al corte real que se puede reconstruir y evita que sigan variando desde ahora.
INSERT INTO "student_period_snapshots" ("id", "period_id", "student_id", "school_id", "cycle", "tutor_id", "is_active", "is_at_risk")
SELECT gen_random_uuid()::text, p."id", s."id", s."school_id", s."cycle", s."tutor_id", s."is_active", s."is_at_risk"
FROM "academic_periods" p CROSS JOIN "students" s
WHERE p."is_active" = false;
