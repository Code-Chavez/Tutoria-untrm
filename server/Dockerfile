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
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm run seed && pnpm run dev"]
