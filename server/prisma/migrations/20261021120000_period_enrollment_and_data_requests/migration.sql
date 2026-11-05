-- Matrícula por periodo, pedidos de listas por correo y correo de pedido por escuela.
ALTER TABLE "schools" ADD COLUMN "request_email" TEXT;

CREATE TABLE "period_enrollments" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL,
    CONSTRAINT "period_enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "period_enrollments_period_id_student_id_key" ON "period_enrollments"("period_id", "student_id");
CREATE INDEX "period_enrollments_period_id_idx" ON "period_enrollments"("period_id");
ALTER TABLE "period_enrollments" ADD CONSTRAINT "period_enrollments_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "period_enrollments" ADD CONSTRAINT "period_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "data_requests" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "cycles" INTEGER[],
    "note" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENVIADO',
    "error" TEXT,
    "received_at" TIMESTAMP(3),
    "received_by_id" TEXT,
    CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "data_requests_period_id_school_id_idx" ON "data_requests"("period_id", "school_id");
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Para que nadie pierda el acceso al actualizar: los estudiantes activos quedan matriculados en el periodo vigente.
INSERT INTO "period_enrollments" ("id", "period_id", "student_id", "school_id", "cycle")
SELECT gen_random_uuid()::text, p."id", s."id", s."school_id", s."cycle"
FROM "students" s CROSS JOIN "academic_periods" p
WHERE p."is_active" = true AND s."is_active" = true;
