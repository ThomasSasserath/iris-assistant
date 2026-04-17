# ---- Build-Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci --legacy-peer-deps

COPY . .

# Env-Vars werden zur Laufzeit von Coolify gesetzt,
# beim Build nur Platzhalter damit next build durchläuft
ENV ANTHROPIC_API_KEY=placeholder
ENV SUPABASE_URL=https://placeholder.supabase.co
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder

RUN npm run build

# ---- Runtime-Stage ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Nur die nötigsten Dateien kopieren (standalone-Output)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
