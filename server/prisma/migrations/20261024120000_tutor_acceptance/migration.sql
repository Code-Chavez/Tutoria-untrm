-- Aceptación del tutor por ciclo (fase 4): correo con enlace de un solo uso; el docente acepta (con su disponibilidad) o rechaza.
ALTER TABLE "cycle_tutor_assignments"
  ADD COLUMN "acceptance_status" TEXT NOT NULL DEFAULT 'SIN_SOLICITAR',
  ADD COLUMN "acceptance_token_hash" TEXT,
  ADD COLUMN "acceptance_expires_at" TIMESTAMP(3),
  ADD COLUMN "requested_at" TIMESTAMP(3),
  ADD COLUMN "responded_at" TIMESTAMP(3),
  ADD COLUMN "decline_reason" TEXT,
  ADD COLUMN "availability" JSONB;
CREATE UNIQUE INDEX "cycle_tutor_assignments_acceptance_token_hash_key" ON "cycle_tutor_assignments"("acceptance_token_hash");
