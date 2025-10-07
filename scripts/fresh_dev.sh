#!/usr/bin/env bash
set -euo pipefail

# scripts/fresh_dev.sh
# Kills ports 3000 and 5000 if they are in use, then runs the project's dev command.
# Usage: bash ./scripts/fresh_dev.sh

PORTS=(3000 5000)
KILLED=()

echo "[fresh_dev] Freeing ports: ${PORTS[*]}"

# Try npx kill-port first (best UX)
if command -v npx >/dev/null 2>&1; then
  echo "[fresh_dev] Attempting npx kill-port ${PORTS[*]}"
  if npx --yes kill-port ${PORTS[*]} 2>/dev/null; then
    echo "[fresh_dev] kill-port succeeded"
  else
    echo "[fresh_dev] npx kill-port failed or not available, falling back"
  fi
fi

# Fallback: use lsof/fuser to kill processes listening on each port
for p in "${PORTS[@]}"; do
  if command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -ti tcp:$p || true)
  else
    pid=$(ss -tlnp 2>/dev/null | awk -v port=":$p" '$0 ~ port {print $0}' || true)
  fi

  if [ -n "$pid" ]; then
    echo "[fresh_dev] Found process on port $p: $pid — sending TERM"
    # If lsof returned multiple PIDs, iterate
    for single in $pid; do
      kill $single 2>/dev/null || true
      KILLED+=($single)
    done
  fi
done

# Give processes a second to exit
sleep 1

# As a last resort, ensure ports are free with fuser -k (may require sudo)
for p in "${PORTS[@]}"; do
  if ss -tln | grep -q ":$p"; then
    echo "[fresh_dev] Port $p still listening — trying fuser -k"
    fuser -k ${p}/tcp 2>/dev/null || true
  fi
done

sleep 1

echo "[fresh_dev] Starting dev servers (npm run dev)"
# Run the repo root 'dev' script (concurrently server + client)
npm run dev
