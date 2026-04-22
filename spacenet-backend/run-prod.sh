#!/usr/bin/env bash
set -e

# =========================
# Production environment
# =========================
export FLASK_ENV=production
export FLASK_DEBUG=0
export PYTHONUNBUFFERED=1

VENV="../env/bin"
APP_MODULE="run:app"          # change if needed
API_PORT=8000

# =========================
# Logging helpers
# =========================
timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

prefix() {
  local label="$1"
  local color="$2"
  sed -u "s/^/$(printf '\033[%sm[%s] [%s]\033[0m ' "$color" "$label" "$(timestamp)")/"
}

# =========================
# Flask API (Gunicorn)
# =========================
$VENV/gunicorn $APP_MODULE \
  --bind 127.0.0.1:$API_PORT \
  --workers 2 \
  --threads 1 \
  --timeout 300 \
  --graceful-timeout 30 \
  2>&1 | prefix API 32 &

# =========================
# RQ Workers
# =========================
$VENV/rq worker default \
  2>&1 | prefix RQ-DEFAULT 37 &

$VENV/rq worker plot \
  2>&1 | prefix RQ-PLOT 33 &

# =========================
# Cloudflare Tunnel
# =========================
cloudflared tunnel \
  --url http://localhost:$API_PORT \
  2>&1 | prefix CLOUDFLARE 31;1 &

# =========================
# Wait for all background jobs
# =========================
wait
