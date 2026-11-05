-- Conserva el comportamiento anterior y los ciclos superiores ya utilizados.
ALTER TABLE "schools" ADD COLUMN "cycle_count" INTEGER NOT NULL DEFAULT 10;
UPDATE "schools" s SET "cycle_count" = GREATEST(10,
  COALESCE((SELECT MAX(st.cycle) FROM "students" st WHERE st.school_id = s.id), 0)
);
-- En una instalación limpia la tabla de asignaciones se crea en una migración posterior.
-- En instalaciones actualizadas ya existe y deben conservarse también sus ciclos.
DO $$
BEGIN
  IF to_regclass('public.cycle_tutor_assignments') IS NOT NULL THEN
    UPDATE "schools" s SET "cycle_count" = GREATEST(s."cycle_count",
      COALESCE((SELECT MAX(ct.cycle) FROM "cycle_tutor_assignments" ct WHERE ct.school_id = s.id), 0)
    );
  END IF;
END $$;
ALTER TABLE "schools" ADD CONSTRAINT "schools_cycle_count_check" CHECK ("cycle_count" BETWEEN 1 AND 14);
