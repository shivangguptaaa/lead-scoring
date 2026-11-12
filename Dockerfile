FROM node:22-slim AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8501

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN if [ "$(wc -c < model/pipeline.joblib)" -lt 1024 ]; then \
      curl -fsSL -L "https://media.githubusercontent.com/media/shivangguptaaa/lead-scoring/main/model/pipeline.joblib" -o model/pipeline.joblib; \
    fi
COPY --from=frontend-builder /frontend/dist /app/frontend/dist

EXPOSE 8501

CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8501}
