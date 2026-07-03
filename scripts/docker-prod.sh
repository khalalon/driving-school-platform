#!/bin/bash
set -e

echo "🚀 Starting Driving School Platform (Production Mode)..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from .env.example"
    exit 1
fi

# Build images
echo "📦 Building Docker images..."
docker compose -f docker compose.yml -f docker compose.prod.yml build

# Start services
echo "🔄 Starting services..."
docker compose -f docker compose.yml -f docker compose.prod.yml up -d

# Wait for services
sleep 15

echo "✅ Production services started"
echo ""
echo "🌐 Access via Nginx: http://localhost"
echo "📝 View logs: docker compose logs -f"
