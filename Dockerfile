# syntax=docker/dockerfile:1.7

# ---------- Stage 1: deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack use pnpm@11.5.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Approve build scripts non-interactively (pnpm v10+ requires this)
RUN pnpm install --frozen-lockfile --prod=false --config.confirmModulesPurpose=false --config.ignored-built-dependencies="[]" || pnpm install --frozen-lockfile --prod=false --ignore-scripts

# ---------- Stage 2: builder ----------
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack use pnpm@11.5.2
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# build-time PUBLIC env (inlined into client bundle)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN pnpm build

# ---------- Stage 3: runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl tini
RUN addgroup -S app && adduser -S app -G app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
