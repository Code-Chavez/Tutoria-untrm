-- Los tokens existentes están en texto plano y no pueden convertirse en hash: las sesiones abiertas deben volver a iniciar sesión.
DELETE FROM "refresh_tokens";

ALTER TABLE "refresh_tokens" RENAME COLUMN "token" TO "token_hash";
ALTER INDEX "refresh_tokens_token_key" RENAME TO "refresh_tokens_token_hash_key";
ALTER TABLE "refresh_tokens" ADD COLUMN "revoked_at" TIMESTAMP(3);
