# Build context: project root. Container layout mirrors repo (project root = /app).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY admin/src/ /app/admin/src/

WORKDIR /app/admin/src
EXPOSE 5006
CMD ["gunicorn", "--bind", "0.0.0.0:5006", "--workers", "2", "--timeout", "120", "app:app"]
