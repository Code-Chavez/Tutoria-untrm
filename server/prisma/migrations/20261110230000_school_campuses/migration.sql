-- Una escuela puede dictarse en varias sedes (issue #273). `schools.campus_id` sigue siendo la sede principal y siempre figura aquí.
CREATE TABLE "school_campuses" (
    "school_id" TEXT NOT NULL,
    "campus_id" TEXT NOT NULL,

    CONSTRAINT "school_campuses_pkey" PRIMARY KEY ("school_id","campus_id")
);

ALTER TABLE "school_campuses" ADD CONSTRAINT "school_campuses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "school_campuses" ADD CONSTRAINT "school_campuses_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "school_campuses" ("school_id", "campus_id") SELECT "id", "campus_id" FROM "schools" WHERE "campus_id" IS NOT NULL;
