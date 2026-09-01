# syntax=docker/dockerfile:1

# ---- deps: install with dev dependencies (needed for tsc/vite) ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- dev: Vite dev server (used by the `dev` compose service) -----------
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- build: production bundle + AC-SEC-1 CDN scan ------------------------
FROM deps AS build
COPY . .
RUN npm run build && node tools/check-dist.js

# ---- runtime: unprivileged nginx serving the static bundle ---------------
# Listens on ${PORT} (default 8080) and runs as non-root, so the same image
# works under Compose on a plain server and on Cloud Run.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
ENV PORT=8080
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
