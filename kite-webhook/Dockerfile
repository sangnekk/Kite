FROM oven/bun:1-slim AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
