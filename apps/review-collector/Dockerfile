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
COPY apps/review-collector/scripts/install-camoufox.mjs ./scripts/install-camoufox.mjs

# camoufox-js fetch uses AdmZip, which silently drops large ZIP64 entries
# (camoufox-bin). Download with the same resolver, extract with system unzip.
RUN apt-get update \
  && apt-get install -y --no-install-recommends unzip \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --include=dev \
  && node ./scripts/install-camoufox.mjs \
  && (CAMOUFOX_INSTALL_DIR=/app/camoufox PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 npx camoufox-js fetch || true) \
  && test -e /app/camoufox/camoufox-bin \
  && ls -la /app/camoufox/camoufox-bin \
  && chmod -R a+rX /app/camoufox

COPY apps/review-collector/tsconfig.json ./
COPY apps/review-collector/src ./src
RUN npx tsc -p tsconfig.json \
  && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 8080

# Preload forces CAMOUFOX_INSTALL_DIR before camoufox-js reads it at import time.
CMD ["node", "--import", "./dist/preload-camoufox-env.js", "dist/index.js"]
