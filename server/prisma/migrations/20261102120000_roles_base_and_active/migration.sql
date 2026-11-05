-- Roles configurables (LEV-R11), primera parte: marca de rol base y de rol activo. Aditiva: los roles existentes siguen activos y
-- los siete sembrados quedan como base (protegidos). No cambia ninguna concesión de permisos ni ninguna cuenta.
ALTER TABLE "roles" ADD COLUMN "is_base" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "roles" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

UPDATE "roles" SET "is_base" = true
WHERE "name" IN ('Administrador DBU', 'Coordinador', 'Docente Tutor', 'Tutorado', 'Profesional de Servicio', 'Vicerrectorado', 'Decano');
