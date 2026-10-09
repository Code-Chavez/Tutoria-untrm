FROM alpine:3.20

# Cliente de PostgreSQL 16 (pg_dump, psql). El cron nativo (busybox crond) ya viene en la imagen base.
RUN apk add --no-cache postgresql16-client

COPY backup.sh restore.sh healthcheck.sh test-backup.sh /usr/local/bin/
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/*.sh

# Los respaldos se almacenan en un volumen aislado.
VOLUME /backups

HEALTHCHECK --interval=1h --timeout=10s --start-period=2m --retries=1 CMD /usr/local/bin/healthcheck.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
