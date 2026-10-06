-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL,
    "catalog" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_catalog_code_key" ON "catalog_items"("catalog", "code");

-- Valores vigentes del sistema: los ciclos 1-14 que acepta el registro de
-- tutorados, los 5 servicios del Art. 21 y los 3 motivos de la entrevista
-- inicial (Anexo N°3). Así el catálogo nace completo sin depender del seed.
INSERT INTO "catalog_items" ("id", "catalog", "code", "name") SELECT gen_random_uuid()::text, v.catalog, v.code, v.name FROM (VALUES
    ('CYCLE', '1', 'Ciclo 1'),
    ('CYCLE', '2', 'Ciclo 2'),
    ('CYCLE', '3', 'Ciclo 3'),
    ('CYCLE', '4', 'Ciclo 4'),
    ('CYCLE', '5', 'Ciclo 5'),
    ('CYCLE', '6', 'Ciclo 6'),
    ('CYCLE', '7', 'Ciclo 7'),
    ('CYCLE', '8', 'Ciclo 8'),
    ('CYCLE', '9', 'Ciclo 9'),
    ('CYCLE', '10', 'Ciclo 10'),
    ('CYCLE', '11', 'Ciclo 11'),
    ('CYCLE', '12', 'Ciclo 12'),
    ('CYCLE', '13', 'Ciclo 13'),
    ('CYCLE', '14', 'Ciclo 14'),
    ('SERVICE', 'ESCUELA', 'Escuela Profesional'),
    ('SERVICE', 'PSICOPEDAGOGIA', 'Servicio de Psicopedagogía'),
    ('SERVICE', 'PSICOLOGIA', 'Servicio de Psicología'),
    ('SERVICE', 'ASISTENCIA_SOCIAL', 'Servicio de Asistencia Social'),
    ('SERVICE', 'SALUD', 'Servicio de Salud'),
    ('MOTIVE', 'ACADEMIC', 'Académica'),
    ('MOTIVE', 'PERSONAL_EMOTIONAL', 'Personal-emocional'),
    ('MOTIVE', 'VOCATIONAL', 'Vocacional-profesional')
) AS v(catalog, code, name);
