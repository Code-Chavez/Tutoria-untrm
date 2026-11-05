-- El pedido de lista puede ser de estudiantes o de docentes tutores.
ALTER TABLE "data_requests" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'ESTUDIANTES';
