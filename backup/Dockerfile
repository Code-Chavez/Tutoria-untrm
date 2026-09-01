FROM alpine:3.20

# Cliente de PostgreSQL 16 (aporta pg_dump). El cron nativo (busybox crond) ya
# viene en la imagen base de Alpine.
RUN apk add --no-cache postgresql16-client

COPY backup.sh /usr/local/bin/backup.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/entrypoint.sh

# Los volcados se almacenan en un volumen aislado.
VOLUME /backups

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
