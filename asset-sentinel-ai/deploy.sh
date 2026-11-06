#!/usr/bin/env bash
set -euo pipefail

IMAGE="asset-sentinel-ai:latest"
CONTAINER="asset-sentinel-ai"
HOST_PORT="${HOST_PORT:-8080}"

cd "$(dirname "$0")"

echo "[1/4] Building image..."
docker build -t "$IMAGE" .

echo "[2/4] Replacing existing container (if any)..."
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

echo "[3/4] Starting container..."
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -p "${HOST_PORT}:80" \
  "$IMAGE"

echo "[4/4] Checking application..."
sleep 2
docker ps --filter "name=^/${CONTAINER}$"
curl --fail --silent --show-error "http://127.0.0.1:${HOST_PORT}/" >/dev/null
echo "Deployment OK: http://EC2-PUBLIC-IP:${HOST_PORT}"
