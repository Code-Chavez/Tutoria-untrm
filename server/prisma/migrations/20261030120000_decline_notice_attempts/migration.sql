-- Aviso a la coordinación del rechazo de un docente (LEV-R05): un registro por INTENTO y un resumen en la designación.
-- Aditiva. Los rechazos anteriores quedan con el resumen en NULL = «sin registro de si se avisó»: NO se les atribuye ningún
-- resultado (ni enviado ni fallido), porque no se conoce. El rechazo mismo no cambia.
ALTER TABLE "cycle_tutor_assignments" ADD COLUMN "decline_notice_status" TEXT;
ALTER TABLE "cycle_tutor_assignments" ADD COLUMN "decline_notice_attempt_id" TEXT;

CREATE TABLE "decline_notice_attempts" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignment_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EN_COLA',
    "tutor_id" TEXT NOT NULL,
    "declined_at" TIMESTAMP(3) NOT NULL,
    "operation_id" TEXT,
    "requested_by_id" TEXT,
    "reason" TEXT,
    "previous_attempt_id" TEXT,
    "recipient_user_id" TEXT,
    "recipient_email" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "error_code" TEXT,

    CONSTRAINT "decline_notice_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "decline_notice_attempts_requested_by_id_operation_id_key" ON "decline_notice_attempts"("requested_by_id", "operation_id");
CREATE INDEX "decline_notice_attempts_status_created_at_idx" ON "decline_notice_attempts"("status", "created_at");
CREATE INDEX "decline_notice_attempts_assignment_id_created_at_idx" ON "decline_notice_attempts"("assignment_id", "created_at");

ALTER TABLE "decline_notice_attempts" ADD CONSTRAINT "decline_notice_attempts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "cycle_tutor_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "decline_notice_attempts" ADD CONSTRAINT "decline_notice_attempts_previous_attempt_id_fkey" FOREIGN KEY ("previous_attempt_id") REFERENCES "decline_notice_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
