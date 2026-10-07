FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm prisma generate

COPY . .

EXPOSE 3000

# Imagen de desarrollo: deja la base lista en cada arranque para que
# `docker compose up` siempre levante un entorno usable, incluso con un
# volumen nuevo. El seed es idempotente (todo son upserts).
# `prisma generate` va en el arranque porque `prisma/` y `src/` se montan desde el
# host: al cambiar de rama el esquema cambia, y un cliente generado al construir la
# imagen quedaría desfasado (el servidor se queda reiniciando sin escuchar).
CMD ["sh", "-c", "pnpm prisma generate && pnpm prisma migrate deploy && pnpm run seed && pnpm run dev"]
