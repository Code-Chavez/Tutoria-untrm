# Despliegue en producción

Este documento cubre un servidor con Docker (un solo equipo). `docker-compose.prod.yml` levanta:

| Servicio | Qué es | Expuesto |
|---|---|---|
| `web` | Cliente compilado servido por Caddy, con **HTTPS automático** y reenvío de `/api` al servidor | 80 y 443 |
| `server` | API compilada (sin código fuente, sin seed de demostración, usuario no root) | solo red interna |
| `postgres` | Base de datos | **no se publica ningún puerto** |
| `backup` | Respaldo diario de base y adjuntos (ver `backup/README.md`) | solo red interna |

## Antes de empezar

- Un dominio público con DNS apuntando al servidor (Caddy necesita los puertos 80/443 abiertos para obtener el certificado).
  Si el HTTPS lo termina otro componente (balanceador o proxy de la institución), use `SITE_ADDRESS=:80`.
- Un servidor SMTP para la recuperación de contraseña (el servidor **no arranca** sin él).
- Un lugar **fuera del servidor** para las copias de respaldo (`BACKUP_OFFSITE_DIR` o `BACKUP_UPLOAD_CMD`).

## Instalación

```sh
cp .env.production.example .env.production      # complete TODOS los valores; no lo suba al repositorio
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Generar el secreto de los tokens:

```sh
openssl rand -hex 48
```

Al arrancar, el servidor aplica las migraciones, asegura los datos base (permisos, roles, parámetros) y, **solo si
todavía no existe ningún Administrador DBU**, crea el primero con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. **No crea cuentas
ni datos de demostración.** Después de entrar por primera vez, cambie la contraseña desde el perfil y puede quitar
`ADMIN_PASSWORD` del archivo de entorno (no se vuelve a usar).

La DBU registra luego las facultades, escuelas, periodo académico y usuarios desde la propia aplicación (Catálogos y
Usuarios y roles), y los tutorados con la carga masiva.

## Qué impide un despliegue inseguro

En producción (`NODE_ENV=production`) el servidor **termina con un error y no arranca** si:

- `JWT_SECRET` falta, tiene menos de 32 caracteres o parece un valor de ejemplo;
- `DATABASE_URL` usa la contraseña de desarrollo;
- `CORS_ORIGIN` o `PUBLIC_APP_URL` no son `https://`;
- `SMTP_HOST` falta o `BCRYPT_ROUNDS` es menor que 10.

`docker-compose.prod.yml` además se niega a iniciar si falta alguna variable obligatoria. El primer administrador
exige una contraseña de al menos 12 caracteres y rechaza las contraseñas de ejemplo o de desarrollo.

## Actualizar

```sh
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Las migraciones se aplican solas al arrancar. **Haga un respaldo antes** (`docker compose -f docker-compose.prod.yml exec backup backup.sh`)
y confirme que terminó sin error.

## Pendiente de acuerdo institucional

- Dominio, certificado y dónde se aloja el servidor.
- Destino de la copia de respaldo fuera del servidor y un ensayo de restauración completo en otro equipo.
- Cuenta de correo (SMTP) desde la que se envían las recuperaciones de contraseña.
