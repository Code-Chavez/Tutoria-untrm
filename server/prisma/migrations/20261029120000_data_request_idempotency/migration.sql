-- Idempotencia y advertencia de equivalencia de los pedidos de lista (LEV-R04), y dos estados de envío nuevos (PENDIENTE, INCIERTO).
-- Aditiva: los pedidos históricos conservan todo lo que tenían y reciben NULL en las columnas nuevas. No se les atribuye ningún
-- identificador de operación ni relación de reenvío, porque no se pueden acreditar; sus estados (ENVIADO, FALLIDO) no cambian.
ALTER TABLE "data_requests" ADD COLUMN "operation_id" TEXT;
ALTER TABLE "data_requests" ADD COLUMN "content_hash" TEXT;
ALTER TABLE "data_requests" ADD COLUMN "equivalence_key" TEXT;
ALTER TABLE "data_requests" ADD COLUMN "resend_of_id" TEXT;
ALTER TABLE "data_requests" ADD COLUMN "attempt_started_at" TIMESTAMP(3);

-- Un mismo identificador de operación solo puede repetirse para la misma persona; los NULL (históricos) no chocan entre sí.
CREATE UNIQUE INDEX "data_requests_requested_by_id_operation_id_key" ON "data_requests"("requested_by_id", "operation_id");
CREATE INDEX "data_requests_equivalence_key_created_at_idx" ON "data_requests"("equivalence_key", "created_at");

ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_resend_of_id_fkey" FOREIGN KEY ("resend_of_id") REFERENCES "data_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
