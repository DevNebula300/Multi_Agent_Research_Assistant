# --- Frontend (built once, served by FastAPI — one Railway service only) ---
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Same-origin API calls; no separate frontend service / CORS host needed
ENV VITE_API_BASE_URL=
RUN npm run build

# --- API + static UI ---
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && rm -rf /root/.cache/pip

COPY app ./app
COPY --from=frontend /frontend/dist ./frontend/dist

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONOPTIMIZE=1 \
    DO_NOT_TRACK=1 \
    CHROMA_DB_PATH=/app/chroma_data \
    STATIC_DIR=/app/frontend/dist

EXPOSE 8000

# One worker, quiet logs — less CPU/RAM while awake; sleeps when idle via railway.toml
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level warning --no-access-log"]
