#!/usr/bin/env bash
set -e

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

prefix() {
  local label="$1"
  local color="$2"
  sed -u "s/^/$(printf '\033[%sm[%s] [%s]\033[0m ' "$color" "$label" "$(timestamp)")/"
}

cleanup() {
  echo
  echo "$(timestamp) Stopping all processes..."
  # Kill all PIDs we recorded
  kill $PID_FLASK $PID_DEFAULT $PID_CLOUDFLARE $PID_PLOT 2>/dev/null || true
  wait
  exit
}

# Trap Ctrl+C (SIGINT) and termination (SIGTERM)
trap cleanup SIGINT SIGTERM

# Runs the flask programs
(
  sudo ../env/bin/python3 run.py 2>&1 | prefix FLASK 32
) &
PID_FLASK=$!

# Need to run the two separate queues for long running task vs plotting 3D graphs
(
  sudo ../env/bin/rq worker default 2>&1 | prefix RQ-DEFAULT 37
) &
PID_DEFAULT=$!
(
  sudo ../env/bin/rq worker plot 2>&1 | prefix RQ-PLOT 33
) &
PID_PLOT=$!

# For public dev server link
(
  cloudflared tunnel --url http://localhost:5000 2>&1 | prefix CLOUDFLARE 31;1
) &
PID_CLOUDFLARE=$!

wait