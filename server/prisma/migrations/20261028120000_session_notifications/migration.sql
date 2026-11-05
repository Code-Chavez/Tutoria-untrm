-- Los avisos pueden referirse a una sesión (programada, reprogramada o cancelada). Si la sesión se elimina, el aviso también:
-- nunca queda un aviso que apunte a algo que ya no existe (R03).
ALTER TABLE "notifications" ADD COLUMN "session_id" TEXT;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "notifications_session_id_idx" ON "notifications"("session_id");
