-- AlterTable
ALTER TABLE "session_attendances"
  ADD COLUMN "tutor_id" TEXT,
  ADD COLUMN "student_id" TEXT,
  ADD COLUMN "period_id" TEXT;

-- Backfill: tutor, tutorado (solo sesiones individuales) y periodo que contiene la fecha de la sesión.
UPDATE "session_attendances" a SET "tutor_id" = s."tutor_id"
FROM "sessions" s WHERE s."id" = a."session_id";

UPDATE "session_attendances" a SET "student_id" = p."student_id"
FROM "session_participants" p
WHERE p."session_id" = a."session_id"
  AND (SELECT count(*) FROM "session_participants" x WHERE x."session_id" = a."session_id") = 1;

UPDATE "session_attendances" a SET "period_id" = ap."id"
FROM "sessions" s, "academic_periods" ap
WHERE s."id" = a."session_id"
  AND s."scheduled_at" >= ap."start_date"
  AND s."scheduled_at" < ap."end_date" + interval '1 day';

-- La numeración histórica corría sobre todo el historial del par; ahora corre dentro de cada semestre.
WITH ranked AS (
  SELECT "id",
         row_number() OVER (
           PARTITION BY "tutor_id", "student_id", "period_id"
           ORDER BY "confirmed_at", "created_at", "id"
         ) AS n
  FROM "session_attendances"
  WHERE "period_id" IS NOT NULL AND "student_id" IS NOT NULL
)
UPDATE "session_attendances" a SET "sequence_number" = ranked.n
FROM ranked WHERE ranked."id" = a."id";

-- CreateIndex
CREATE UNIQUE INDEX "session_attendances_tutor_id_student_id_period_id_sequence_n_key"
  ON "session_attendances"("tutor_id", "student_id", "period_id", "sequence_number");
