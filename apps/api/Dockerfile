FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
# Welcome (and auth preview) templates live in the monorepo, not under apps/api.
COPY infra/email/templates ./email-templates
ENV EMAIL_TEMPLATES_DIR=/app/email-templates

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
