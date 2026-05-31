# ── Stage 1: Build React frontend ─────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Python backend + runtime ─────────────────────────────────────
FROM python:3.12-slim

# System deps — includes fpcalc (Chromaprint) for AcoustID audio fingerprinting
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        curl \
        nodejs \
        libchromaprint-tools \
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
RUN mkdir -p /app/static
COPY --from=frontend-builder /frontend/dist /app/static

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Create music and data dirs
RUN mkdir -p /music/temp /music/permanent /app/data

# Collect static
RUN python manage.py collectstatic --noinput

EXPOSE 4534

# ── Runtime environment variables ─────────────────────────────────────────
# Declaring all keys here makes them visible in container managers (e.g. Synology DSM).
# Override these values in your docker-compose.yml or container manager UI.
ENV DEBUG="false" \
    TZ="UTC" \
    NAVIDROME_URL="http://navidrome:4533" \
    NAVIDROME_USER="admin" \
    NAVIDROME_PASSWORD="changeme" \
    TEMP_FOLDER="/music/temp" \
    PERMANENT_SAVING_DIR="/music/permanent" \
    MAX_STORAGE_SIZE="10" \
    PURGE_BATCH_SIZE="20" \
    DAEMON_INTERVAL_HOURS="24" \
    MAX_SONGS_PER_SOURCE="10" \
    DB_PATH="/app/data/db.sqlite3" \
    APP_USER="admin" \
    APP_PASSWORD="xyseer" \
    YTDLP_COOKIES="" \
    YTDLP_USERNAME="" \
    YTDLP_PASSWORD="" \
    YTDLP_PROXY="" \
    ALLOW_YTDLP="false" \
    CSRF_TRUSTED_ORIGINS="" \
    MB_CONTACT="admin@example.com" \
    ACOUSTID_API_KEY="" \
    DEFAULT_PAGE_SIZE="50"

CMD ["/start.sh"]
