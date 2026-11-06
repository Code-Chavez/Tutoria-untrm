-- Certificación (corte 3): motivo de la observación o del rechazo de un trámite. Aditiva (columna nula) y sin filas afectadas.
ALTER TABLE "certificates" ADD COLUMN "review_note" TEXT;

-- Un trámite rechazado conserva por qué: el rechazo sin motivo no puede quedar guardado.
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_reject_note_check" CHECK ("status" <> 'RECHAZADO' OR ("review_note" IS NOT NULL AND length(btrim("review_note")) > 0));
