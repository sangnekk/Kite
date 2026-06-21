# syntax=docker/dockerfile:1
FROM oven/bun:1 AS base
WORKDIR /app

# Install deps first (cached unless lockfile changes).
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# App source (includes src/generated/flow-nodes.json — the block catalog).
COPY . .

EXPOSE 3001
CMD ["bun", "run", "src/index.ts"]
