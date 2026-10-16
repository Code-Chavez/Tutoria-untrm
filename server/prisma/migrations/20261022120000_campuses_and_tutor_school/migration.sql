-- Sedes (campus) y escuela del tutor (fase 3): cada escuela pertenece a una sede y cada docente tutor a una escuela.
CREATE TABLE "campuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "campuses_name_key" ON "campuses"("name");

ALTER TABLE "schools" ADD COLUMN "campus_id" TEXT;
ALTER TABLE "users" ADD COLUMN "school_id" TEXT;
CREATE INDEX "users_school_id_idx" ON "users"("school_id");
CREATE INDEX "schools_campus_id_idx" ON "schools"("campus_id");

ALTER TABLE "schools" ADD CONSTRAINT "schools_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Las sedes de la universidad
INSERT INTO "campuses" ("id", "name") VALUES
  (gen_random_uuid()::text, 'Sede Central'),
  (gen_random_uuid()::text, 'Sede Bagua'),
  (gen_random_uuid()::text, 'Sede Utcubamba');

-- Todas las escuelas existentes parten en la sede central; Vicerrectorado corrige las demás.
UPDATE "schools" SET "campus_id" = (SELECT "id" FROM "campuses" WHERE "name" = 'Sede Central');

-- Un tutor cuyos tutorados son todos de una misma escuela queda en esa escuela; el resto queda sin escuela hasta que se indique.
UPDATE "users" u SET "school_id" = x."school_id"
FROM (
  SELECT "tutor_id", MIN("school_id") AS "school_id"
  FROM "students" WHERE "tutor_id" IS NOT NULL
  GROUP BY "tutor_id" HAVING COUNT(DISTINCT "school_id") = 1
) x
WHERE u."id" = x."tutor_id";
