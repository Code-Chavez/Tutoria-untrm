-- AlterTable
ALTER TABLE "session_participants" ADD COLUMN "attended" BOOLEAN;

-- Las sesiones individuales con asistencia ya confirmada (Anexo N°4) pasan a constar como asistidas.
-- Las demás (p. ej. las grupales históricas) quedan sin registrar: no se presume asistencia.
UPDATE "session_participants" sp
SET "attended" = true
FROM "session_attendances" sa
WHERE sa."session_id" = sp."session_id";
