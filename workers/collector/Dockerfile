# Build from repository root:
# docker build -f workers/collector/Dockerfile .

FROM mcr.microsoft.com/playwright/python:v1.49.1-jammy

WORKDIR /app

COPY apps/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api/app ./app
COPY workers/collector/main.py ./main.py

ENV PYTHONUNBUFFERED=1

CMD ["celery", "-A", "app.celery_app", "worker", "--loglevel=info"]
