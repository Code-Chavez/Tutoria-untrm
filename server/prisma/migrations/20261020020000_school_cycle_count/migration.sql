-- Conserva el comportamiento anterior y tambi?n los ciclos superiores ya usados.
ALTER TABLE "schools" ADD COLUMN "cycle_count" INTEGER NOT NULL DEFAULT 10;
UPDATE "schools" s SET "cycle_count" = GREATEST(10,
  COALESCE((SELECT MAX(st.cycle) FROM "students" st WHERE st.school_id = s.id), 0),
  COALESCE((SELECT MAX(ct.cycle) FROM "cycle_tutor_assignments" ct WHERE ct.school_id = s.id), 0)
);
ALTER TABLE "schools" ADD CONSTRAINT "schools_cycle_count_check" CHECK ("cycle_count" BETWEEN 1 AND 14);
