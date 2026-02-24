# Build context: project root. Container layout mirrors repo (project root = /app).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY user/backend/ /app/user/backend/
COPY user/frontend/ /app/user/frontend/

WORKDIR /app/user/backend
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--timeout", "120", "app:app"]
