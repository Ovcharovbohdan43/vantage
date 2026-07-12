# Build from repo root:
#   docker build -f apps/review-collector/Dockerfile .
FROM mcr.microsoft.com/playwright:v1.53.2-jammy

WORKDIR /app

ENV PORT=8080
ENV CRAWLEE_STORAGE_DIR=/tmp/crawlee-storage
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# Keep Camoufox inside /app (not /opt) so a Railway volume on /opt cannot shadow it.
ENV CAMOUFOX_INSTALL_DIR=/app/camoufox
# Playwright base image sets this to 1 — that makes `camoufox-js fetch` a no-op.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0

COPY apps/review-collector/package.json apps/review-collector/package-lock.json* ./
# Install with devDeps so `tsc` is available; prune after compile.
# Cache-bust comment: force Camoufox layer rebuild 2026-07-12b
RUN npm install --include=dev \
  && npx camoufox-js fetch \
  && test -x /app/camoufox/camoufox-bin \
  && ls -la /app/camoufox \
  && npx camoufox-js path

COPY apps/review-collector/tsconfig.json ./
COPY apps/review-collector/src ./src
RUN npx tsc -p tsconfig.json \
  && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/index.js"]
