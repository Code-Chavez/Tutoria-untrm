ALTER TABLE "faculties" ADD COLUMN "request_email" TEXT;

ALTER TABLE "data_requests"
    ALTER COLUMN "school_id" DROP NOT NULL,
    ADD COLUMN "faculty_id" TEXT,
    ADD COLUMN "faculty_name" TEXT,
    ADD COLUMN "school_names" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD CONSTRAINT "data_requests_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "data_requests_one_target_check" CHECK (
        ("school_id" IS NOT NULL AND "faculty_id" IS NULL) OR
        ("school_id" IS NULL AND "faculty_id" IS NOT NULL AND "faculty_name" IS NOT NULL AND cardinality("school_names") > 0)
    );
