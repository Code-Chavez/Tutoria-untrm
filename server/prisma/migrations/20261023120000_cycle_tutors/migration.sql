-- Tutor por ciclo (fase 3b): un tutor por (periodo, escuela, ciclo); la excepción de un segundo ciclo queda registrada con su motivo.
CREATE TABLE "cycle_tutor_assignments" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "is_exception" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "assigned_by_id" TEXT NOT NULL,
    CONSTRAINT "cycle_tutor_assignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cycle_tutor_assignments_period_id_school_id_cycle_key" ON "cycle_tutor_assignments"("period_id", "school_id", "cycle");
CREATE INDEX "cycle_tutor_assignments_period_id_tutor_id_idx" ON "cycle_tutor_assignments"("period_id", "tutor_id");
ALTER TABLE "cycle_tutor_assignments" ADD CONSTRAINT "cycle_tutor_assignments_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cycle_tutor_assignments" ADD CONSTRAINT "cycle_tutor_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cycle_tutor_assignments" ADD CONSTRAINT "cycle_tutor_assignments_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
