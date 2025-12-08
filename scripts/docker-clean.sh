#!/bin/bash
set -e

echo "🧹 Cleaning up Docker resources..."

read -p "⚠️  This will remove all containers, volumes, and images. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Stop all services
docker-compose down -v

# Remove all project images
docker images | grep driving-school | awk '{print $3}' | xargs -r docker rmi -f

# Prune unused resources
docker system prune -f

echo "✅ Cleanup complete"
