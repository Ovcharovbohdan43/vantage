# Build from repo root:
#   docker build -f apps/review-collector/Dockerfile .
FROM mcr.microsoft.com/playwright:v1.53.2-jammy

WORKDIR /app

ENV PORT=8080
ENV CRAWLEE_STORAGE_DIR=/tmp/crawlee-storage
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV CAMOUFOX_INSTALL_DIR=/opt/camoufox

COPY apps/review-collector/package.json apps/review-collector/package-lock.json* ./
# Install with devDeps so `tsc` is available; prune after compile.
RUN npm install --include=dev \
  && npx camoufox-js fetch

COPY apps/review-collector/tsconfig.json ./
COPY apps/review-collector/src ./src
RUN npx tsc -p tsconfig.json \
  && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/index.js"]
