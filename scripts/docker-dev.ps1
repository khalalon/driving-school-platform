# Development mode startup script for Driving School Platform
# PowerShell version

Write-Host "🚀 Starting Driving School Platform (Development Mode)..." -ForegroundColor Cyan

# Stop any running containers
Write-Host "Stopping any running containers..." -ForegroundColor Yellow
docker compose down

# Build images
Write-Host "📦 Building Docker images..." -ForegroundColor Yellow
docker compose -f docker-compose.yml -f docker-compose.dev.yml build

# Start services
Write-Host "🔄 Starting services..." -ForegroundColor Yellow
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
Write-Host "🏥 Checking service health..." -ForegroundColor Yellow
$services = @("auth-service", "school-service", "lesson-service", "exam-service", "payment-service", "notification-service")

foreach ($service in $services) {
    $running = docker ps | Select-String -Pattern $service
    if ($running) {
        Write-Host "✅ $service is running" -ForegroundColor Green
    } else {
        Write-Host "❌ $service failed to start" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📊 Services Status:" -ForegroundColor Cyan
docker compose ps

Write-Host ""
Write-Host "🌐 Service URLs:" -ForegroundColor Cyan
Write-Host "  Auth Service:         http://localhost:3001" -ForegroundColor Green
Write-Host "  School Service:       http://localhost:3002" -ForegroundColor Green
Write-Host "  Lesson Service:       http://localhost:3003" -ForegroundColor Green
Write-Host "  Exam Service:         http://localhost:3004" -ForegroundColor Green
Write-Host "  Payment Service:      http://localhost:3005" -ForegroundColor Green
Write-Host "  Notification Service: http://localhost:3006" -ForegroundColor Green
Write-Host "  Analytics Service:    http://localhost:3007" -ForegroundColor Green
Write-Host "  PostgreSQL:           localhost:5432" -ForegroundColor Green
Write-Host "  Redis:                localhost:6379" -ForegroundColor Green
Write-Host "  pgAdmin:              http://localhost:5050" -ForegroundColor Green
Write-Host "  Redis Commander:      http://localhost:8081" -ForegroundColor Green
Write-Host ""
Write-Host '📝 View logs: docker compose logs -f [service-name]' -ForegroundColor Cyan
