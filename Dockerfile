# ── Stage 1: Build React frontend ─────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Python backend + runtime ─────────────────────────────────────
FROM python:3.12-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        curl \
        nodejs \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
        -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

# Python dependencies
COPY backend/requirements*.txt ./
ARG ENV=production
RUN if [ "$ENV" = "test" ]; then \
        pip install --no-cache-dir -r requirements-dev.txt; \
    else \
        pip install --no-cache-dir -r requirements.txt; \
    fi

# Django app
COPY backend/ .

# Copy built React assets into Django's static folder
# We'll put them in /app/static which is in STATICFILES_DIRS
RUN mkdir -p /app/static
COPY --from=frontend-builder /frontend/dist /app/static

# Create music and data dirs
RUN mkdir -p /music/temp /music/permanent /app/data

# Collect static
RUN python manage.py collectstatic --noinput

EXPOSE 4534

CMD ["sh", "-c", "export DJANGO_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(50))') && python manage.py migrate --noinput && gunicorn music_updater.wsgi:application --bind 0.0.0.0:4534 --workers 2 --threads 8 --timeout 0"]
