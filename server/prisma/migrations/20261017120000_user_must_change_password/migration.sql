-- A01: las cuentas creadas por la DBU nacen con una clave temporal y deben cambiarla en su primer ingreso.
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
