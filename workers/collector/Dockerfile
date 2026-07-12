# Build from repository root:
# docker build -f workers/collector/Dockerfile .

FROM mcr.microsoft.com/playwright/python:v1.49.1-jammy

WORKDIR /app

COPY apps/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
  && playwright install --with-deps chromium

COPY apps/api/app ./app
COPY workers/collector/main.py ./main.py

ENV PYTHONUNBUFFERED=1
# Avoid sync Playwright / asyncio conflicts under Celery solo + some libs
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

CMD ["celery", "-A", "app.celery_app", "worker", "--loglevel=info", "--pool=solo", "--concurrency=1"]
