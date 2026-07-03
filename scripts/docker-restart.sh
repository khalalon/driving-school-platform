#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/docker-restart.sh <service-name>"
    echo "Example: ./scripts/docker-restart.sh auth-service"
    exit 1
fi

echo "🔄 Restarting $1..."
docker compose restart "$1"
echo "✅ $1 restarted"
