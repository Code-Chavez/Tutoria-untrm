FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm prisma generate

COPY . .

EXPOSE 3000

# Imagen de desarrollo: en cada arranque genera el cliente y aplica las migraciones (igual que producción: migrar, no sembrar).
# NO ejecuta el seed: reiniciar el servidor no cambia ningún dato. Un entorno nuevo se inicializa con una orden explícita, una sola vez:
#   docker compose exec server pnpm run seed
# `prisma generate` va en el arranque porque `prisma/` y `src/` se montan desde el
# host: al cambiar de rama el esquema cambia, y un cliente generado al construir la
# imagen quedaría desfasado (el servidor se queda reiniciando sin escuchar).
CMD ["sh", "-c", "pnpm prisma generate && pnpm prisma migrate deploy && pnpm run dev"]
