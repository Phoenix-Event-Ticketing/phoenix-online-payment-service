# syntax=docker/dockerfile:1.14

FROM node:24-alpine AS base
WORKDIR /app
RUN apk upgrade --no-cache

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=root:root --chmod=u=rwX,go=rX package.json package-lock.json ./
COPY --chown=root:root --chmod=u=rwX,go=rX src ./src

USER nodejs
EXPOSE 4002
CMD ["node", "src/server.mjs"]