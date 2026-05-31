#!/bin/sh
set -e

# Generate a random Django SECRET_KEY per container boot.
# Shared across all threads (single worker) via this exported env variable.
export DJANGO_SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')

cd /app
python3 manage.py migrate --noinput

exec gunicorn music_updater.wsgi:application \
    --bind 0.0.0.0:4534 \
    --workers 1 \
    --threads 16 \
    --timeout 0
