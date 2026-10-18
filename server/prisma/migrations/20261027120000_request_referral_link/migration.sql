-- La solicitud de tutoría puede terminar en una derivación (además de en una sesión): se vincula para no perder el hilo.
ALTER TABLE "tutoring_requests" ADD COLUMN "referral_id" TEXT;
