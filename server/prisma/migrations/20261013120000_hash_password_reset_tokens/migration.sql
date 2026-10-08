-- Los tokens existentes están en texto plano y no pueden convertirse en hash: los enlaces pendientes dejan de valer.
DELETE FROM "password_reset_tokens";

ALTER TABLE "password_reset_tokens" RENAME COLUMN "token" TO "token_hash";
ALTER INDEX "password_reset_tokens_token_key" RENAME TO "password_reset_tokens_token_hash_key";
