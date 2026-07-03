#!/bin/bash
set -e

echo "🚀 Starting Driving School Platform (Development Mode)..."

# Stop any running containers
docker compose down

# Build images
echo "📦 Building Docker images..."
docker compose -f docker compose.yml -f docker compose.dev.yml build

# Start services
echo "🔄 Starting services..."
docker compose -f docker compose.yml -f docker compose.dev.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
services=("auth-service" "school-service" "lesson-service" "exam-service" "payment-service" "notification-service")

for service in "${services[@]}"; do
    if docker ps | grep -q $service; then
        echo "✅ $service is running"
    else
        echo "❌ $service failed to start"
    fi
done

echo ""
echo "📊 Services Status:"
docker compose ps

echo ""
echo "🌐 Service URLs:"
echo "  Auth Service:         http://localhost:3001"
echo "  School Service:       http://localhost:3002"
echo "  Lesson Service:       http://localhost:3003"
echo "  Exam Service:         http://localhost:3004"
echo "  Payment Service:      http://localhost:3005"
echo "  Notification Service: http://localhost:3006"
echo "  PostgreSQL:           localhost:5432"
echo "  Redis:                localhost:6379"
echo "  pgAdmin:              http://localhost:5050"
echo "  Redis Commander:      http://localhost:8081"
echo ""
echo "📝 View logs: docker compose logs -f [service-name]"
echo "🛑 Stop all: docker compose down"
