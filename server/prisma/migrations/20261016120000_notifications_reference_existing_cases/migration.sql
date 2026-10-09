-- Los avisos que apuntan a un caso que ya no existe no pueden abrirse: se eliminan (R03).
DELETE FROM "notifications" WHERE "referral_id" IS NOT NULL
  AND "referral_id" NOT IN (SELECT "id" FROM "student_referrals");
DELETE FROM "notifications" WHERE "tutoring_request_id" IS NOT NULL
  AND "tutoring_request_id" NOT IN (SELECT "id" FROM "tutoring_requests");

-- AddForeignKey: en adelante, eliminar un caso elimina sus avisos.
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_referral_id_fkey"
  FOREIGN KEY ("referral_id") REFERENCES "student_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tutoring_request_id_fkey"
  FOREIGN KEY ("tutoring_request_id") REFERENCES "tutoring_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
