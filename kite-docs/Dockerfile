# syntax=docker/dockerfile:1

###############################################################################
# Stage 1 — build the static Docusaurus site
###############################################################################
FROM node:20-slim AS build
WORKDIR /app

# Install dependencies first so this layer is cached unless the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# APP_BASE_URL is baked into the site at build time. It points the embedded node
# previews (EmbedFlowNode) and schema explorer (NodeInfoExplorer) at the running
# Kite app, so they must be reachable from the user's browser.
ARG APP_BASE_URL=http://localhost:8080
ENV APP_BASE_URL=${APP_BASE_URL}
RUN npm run build

###############################################################################
# Stage 2 — serve the static site with nginx
###############################################################################
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
