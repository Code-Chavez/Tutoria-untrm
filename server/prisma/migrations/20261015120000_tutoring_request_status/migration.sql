-- Atención de las solicitudes de tutoría (R01): estado, respuesta y quién la atendió.
ALTER TABLE "tutoring_requests"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN "response_note" TEXT,
  ADD COLUMN "handled_by_id" TEXT,
  ADD COLUMN "handled_at" TIMESTAMP(3),
  ADD COLUMN "session_id" TEXT;

-- Avisos de solicitudes de tutoría.
ALTER TABLE "notifications" ADD COLUMN "tutoring_request_id" TEXT;
