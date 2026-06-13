# Backend image — Bun + Express + Prisma (pg driver adapter).
# Used by Railway (and reusable on Koyeb / Fly.io / any container host).
FROM oven/bun:1

WORKDIR /app

# TLS certs for the Postgres (Supabase) connection.
RUN apt-get update -y && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Install dependencies first for better layer caching.
COPY package.json bun.lock ./
RUN bun install

# Copy the rest of the source.
COPY . .

# Generate the Prisma client (output: ./generated/prisma).
RUN bunx prisma generate

ENV NODE_ENV=production
# Railway injects PORT at runtime; this is just the local-docker default.
EXPOSE 3000

# Apply any pending migrations, then start the API.
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run index.ts"]
