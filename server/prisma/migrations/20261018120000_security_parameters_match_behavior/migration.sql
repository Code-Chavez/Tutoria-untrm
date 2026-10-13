-- A08: los tres parámetros de seguridad ahora gobiernan el comportamiento. Los valores sembrados antes (30 min y 3 intentos)
-- no eran los que el sistema aplicaba (15 min y 5 intentos): se alinean solo si nadie los modificó; los editados se respetan.
UPDATE "system_parameters" SET "value" = '15' WHERE "key" = 'inactivity_timeout_minutes' AND "value" = '30';
UPDATE "system_parameters" SET "value" = '5' WHERE "key" = 'login_max_attempts' AND "value" = '3';
