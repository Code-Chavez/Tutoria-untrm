-- Certificación del docente tutor (corte 1: modelo de datos). Ver docs/levantamiento/17_DISENO_CERTIFICACION_DEMOSTRACION.md.
-- Aditiva: solo tablas nuevas; no toca filas existentes. Las reglas que no deben depender de la aplicación (estados válidos,
-- demostración sin firma ni entrega, numeración DEMO-, un trámite vigente por docente) se imponen aquí como restricciones.

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "period_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INICIADO',
    "is_demo" BOOLEAN NOT NULL DEFAULT true,
    "number" TEXT,
    "template_id" TEXT,
    "snapshot" JSONB,
    "unsigned_sha256" TEXT,
    "unsigned_storage_key" TEXT,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "voided_by_id" TEXT,
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_evidences" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificate_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ref" TEXT,
    "result" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "comment" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "certificate_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_sequences" (
    "scope" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "certificate_sequences_pkey" PRIMARY KEY ("scope","year")
);

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_demo" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_resolutions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issued_on" DATE NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "committee_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_number_key" ON "certificates"("number");

-- CreateIndex
CREATE INDEX "certificates_period_id_school_id_status_idx" ON "certificates"("period_id", "school_id", "status");

-- CreateIndex
CREATE INDEX "certificates_tutor_id_idx" ON "certificates"("tutor_id");

-- CreateIndex
CREATE INDEX "certificate_evidences_certificate_id_idx" ON "certificate_evidences"("certificate_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_templates_name_version_key" ON "certificate_templates"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "committee_resolutions_period_id_school_id_key" ON "committee_resolutions"("period_id", "school_id");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "cycle_tutor_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "certificate_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_evidences" ADD CONSTRAINT "certificate_evidences_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_evidences" ADD CONSTRAINT "certificate_evidences_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_resolutions" ADD CONSTRAINT "committee_resolutions_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_resolutions" ADD CONSTRAINT "committee_resolutions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_resolutions" ADD CONSTRAINT "committee_resolutions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Estados válidos del trámite y resultado de cada evidencia (el sistema no decide la conformidad: solo la guarda).
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_status_check" CHECK ("status" IN
  ('INICIADO','EN_REVISION','OBSERVADO','RECHAZADO','APROBADO','GENERADO_SIN_FIRMA','PENDIENTE_DE_FIRMA','FIRMADO_INCORPORADO','ENTREGADO','ANULADO'));
ALTER TABLE "certificate_evidences" ADD CONSTRAINT "certificate_evidences_result_check" CHECK ("result" IN ('PENDIENTE','CONFORME','OBSERVADA'));

-- Un certificado de demostración nunca llega a firmado ni entregado, y su número lleva el prefijo DEMO-; uno no demostrativo no.
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_demo_no_signature_check" CHECK
  (NOT "is_demo" OR "status" NOT IN ('PENDIENTE_DE_FIRMA','FIRMADO_INCORPORADO','ENTREGADO'));
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_number_demo_prefix_check" CHECK
  ("number" IS NULL OR ("is_demo" = ("number" LIKE 'DEMO-%')));

-- Un solo trámite vigente por docente, escuela y periodo; uno anulado o rechazado no impide iniciar otro.
CREATE UNIQUE INDEX "certificates_one_active_per_tutor_key" ON "certificates"("period_id", "school_id", "tutor_id")
  WHERE "status" NOT IN ('ANULADO','RECHAZADO');

-- Un anulado conserva su motivo y quién lo anuló.
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_void_reason_check" CHECK
  ("status" <> 'ANULADO' OR ("void_reason" IS NOT NULL AND "voided_by_id" IS NOT NULL));

ALTER TABLE "certificate_sequences" ADD CONSTRAINT "certificate_sequences_last_check" CHECK ("last" >= 0);
