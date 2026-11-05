CREATE TABLE "user_access_policies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "school_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "faculty_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "service" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "user_access_policies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_access_policies_kind_check" CHECK (
      ("kind" IN ('NONE', 'OWN', 'INSTITUTION') AND cardinality("school_ids") = 0 AND cardinality("faculty_ids") = 0 AND "service" IS NULL)
      OR ("kind" = 'SCHOOLS' AND cardinality("school_ids") > 0 AND cardinality("faculty_ids") = 0 AND "service" IS NULL)
      OR ("kind" = 'FACULTIES' AND cardinality("faculty_ids") > 0 AND cardinality("school_ids") = 0 AND "service" IS NULL)
      OR ("kind" = 'SERVICE' AND cardinality("school_ids") = 0 AND cardinality("faculty_ids") = 0 AND "service" IS NOT NULL AND "service" IN ('ESCUELA', 'PSICOPEDAGOGIA', 'PSICOLOGIA', 'ASISTENCIA_SOCIAL', 'SALUD'))
    )
);
CREATE UNIQUE INDEX "user_access_policies_user_id_key" ON "user_access_policies"("user_id");
ALTER TABLE "user_access_policies" ADD CONSTRAINT "user_access_policies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_access_policies" ADD CONSTRAINT "user_access_policies_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cubre cualquier vía de cambio de rol: volver al rol anterior tampoco resucita una concesión vieja.
CREATE FUNCTION invalidate_user_access_policy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    UPDATE user_access_policies
      SET role_id = NEW.role_id, kind = 'NONE', school_ids = ARRAY[]::TEXT[],
          faculty_ids = ARRAY[]::TEXT[], service = NULL, revision = revision + 1
      WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER user_role_invalidates_access_policy AFTER UPDATE OF role_id ON users
FOR EACH ROW EXECUTE FUNCTION invalidate_user_access_policy();
