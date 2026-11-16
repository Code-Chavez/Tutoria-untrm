-- Ajustes configurables del certificado (issue #271): tipo de sede y datos por escuela.
ALTER TABLE "campuses" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'SEDE';

CREATE TABLE "certificate_school_settings" (
    "school_id" TEXT NOT NULL,
    "department" TEXT,
    "signatory_name" TEXT,
    "signatory_role" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_school_settings_pkey" PRIMARY KEY ("school_id")
);

ALTER TABLE "certificate_school_settings" ADD CONSTRAINT "certificate_school_settings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
