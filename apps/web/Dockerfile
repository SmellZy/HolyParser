FROM node:24.18.0-alpine AS dependencies

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/design-tokens/package.json ./packages/design-tokens/package.json

RUN npm ci

FROM node:24.18.0-alpine AS build

WORKDIR /workspace

COPY --from=dependencies /workspace/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
COPY packages ./packages

ARG NEXT_PUBLIC_CONTROL_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_CONTROL_API_URL=$NEXT_PUBLIC_CONTROL_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=@arbitrage/contracts
RUN npm run build --workspace=@arbitrage/web

FROM node:24.18.0-alpine AS runtime

ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

WORKDIR /app

COPY --from=build --chown=node:node /workspace/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/web/.next/static ./apps/web/.next/static

USER node

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
