FROM node:24.18.0-alpine AS source

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/design-tokens/package.json ./packages/design-tokens/package.json
COPY packages/market-data/package.json ./packages/market-data/package.json
COPY packages/okx-public-adapter/package.json ./packages/okx-public-adapter/package.json
COPY packages/binance-usdm-public-adapter/package.json ./packages/binance-usdm-public-adapter/package.json
COPY packages/bybit-linear-public-adapter/package.json ./packages/bybit-linear-public-adapter/package.json

RUN npm ci --no-audit --no-fund

COPY .editorconfig .prettierignore compose.yaml README.md ./
COPY .github ./.github
COPY apps ./apps
COPY docs/LOCAL_DEVELOPMENT.md ./docs/LOCAL_DEVELOPMENT.md
COPY docs/PHASE_0_SOURCE_REGISTER.md ./docs/PHASE_0_SOURCE_REGISTER.md
COPY docs/adr ./docs/adr
COPY packages ./packages
COPY scripts ./scripts

FROM source AS format

RUN npm run format

FROM source AS quality

RUN npm run format:check
RUN npm run lint
RUN npm run typecheck
RUN npm run test
RUN npm run build
