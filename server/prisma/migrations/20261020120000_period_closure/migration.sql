-- Cierre explícito del periodo académico: quién, cuándo y el resumen de lo ocurrido.
ALTER TABLE "academic_periods" ADD COLUMN "closed_at" TIMESTAMP(3),
ADD COLUMN "closed_by_id" TEXT,
ADD COLUMN "closure_summary" JSONB;

-- Los periodos que ya no están vigentes y tienen corte de matrícula se consideran cerrados desde su última referencia.
UPDATE "academic_periods" SET "closed_at" = "end_date" WHERE "is_active" = false AND "closed_at" IS NULL AND EXISTS (SELECT 1 FROM "student_period_snapshots" s WHERE s."period_id" = "academic_periods"."id");
