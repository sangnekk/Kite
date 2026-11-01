# syntax=docker/dockerfile:1

###############################################################################
# Stage 1 — build the Next.js frontend as a static export (kite-web/out)
###############################################################################
FROM node:20-slim AS web
WORKDIR /app/kite-web

# Install dependencies first so this layer is cached unless the lockfile changes.
COPY kite-web/package.json kite-web/package-lock.json ./
RUN npm ci

# Build the static export.
COPY kite-web/ ./
ARG NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:3008
# Build/deploy label shown under the app name. Defaults to "Stable build" for
# images; override via build arg. When the var is absent entirely the frontend
# falls back to "Developer build" (e.g. a local `npm run dev`).
ARG NEXT_PUBLIC_BUILD_LABEL="Stable build"
ENV NEXT_PUBLIC_API_PUBLIC_BASE_URL=http://localhost:8080
ENV NEXT_PUBLIC_AI_SERVICE_URL=${NEXT_PUBLIC_AI_SERVICE_URL}
ENV NEXT_PUBLIC_BUILD_LABEL=${NEXT_PUBLIC_BUILD_LABEL}
ENV OUTPUT=export
RUN npm run build

###############################################################################
# Stage 2 — build the admin console (Vite) served under /admin/
###############################################################################
FROM node:20-slim AS admin
WORKDIR /app/kite-admin-console

COPY kite-admin-console/package.json kite-admin-console/package-lock.json ./
RUN npm ci

COPY kite-admin-console/ ./
RUN npm run build

###############################################################################
# Stage 3 — build the Go backend with both frontends embedded
###############################################################################
FROM golang:1.25-bookworm AS builder
WORKDIR /src

# Download Go modules first; cached unless any go.{mod,sum} changes. arikawa is
# a local fork referenced via a replace directive in kite-service/go.mod.
COPY go.work go.work.sum ./
COPY kite-service/go.mod kite-service/go.sum ./kite-service/
COPY kite-web/go.mod kite-web/go.sum ./kite-web/
COPY kite-admin-console/go.mod ./kite-admin-console/
COPY arikawa/go.mod arikawa/go.sum ./arikawa/
RUN go mod download

# Go sources. kite-web only needs its Go files (the embed package).
COPY kite-service ./kite-service
COPY kite-web/*.go ./kite-web/
COPY kite-admin-console/*.go ./kite-admin-console/
COPY arikawa ./arikawa

# Bring in the built frontend so the `embedweb` build tag can embed it.
COPY --from=web /app/kite-web/out ./kite-web/out
COPY --from=admin /app/kite-admin-console/dist ./kite-admin-console/dist

# Static, stripped binary with the web UI and the admin console embedded.
RUN --mount=type=cache,target=/root/.cache/go-build \
    cd kite-service && \
    CGO_ENABLED=0 go build -tags "embedweb embedadmin" -ldflags "-s -w" -o /out/kite-service

###############################################################################
# Stage 4 — minimal runtime image
###############################################################################
FROM debian:stable-slim
WORKDIR /root/

# Only certificates are needed at runtime (TLS to Discord / Postgres / S3).
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /out/kite-service ./kite-service

EXPOSE 8080
CMD ["/bin/sh", "-c", "./kite-service database migrate postgres up; ./kite-service server start"]
