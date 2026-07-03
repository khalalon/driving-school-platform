# Production mode startup script for Driving School Platform
# PowerShell version

Write-Host "🚀 Starting Driving School Platform (Production Mode)..." -ForegroundColor Cyan

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "❌ .env file not found. Please create one from .env.example" -ForegroundColor Red
    exit 1
}

# Build images
Write-Host "📦 Building Docker images..." -ForegroundColor Yellow
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start services
Write-Host "🔄 Starting services..." -ForegroundColor Yellow
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Wait for services
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "✅ Production services started" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access via Nginx: http://localhost" -ForegroundColor Cyan
Write-Host "📝 View logs: docker compose logs -f" -ForegroundColor Cyan
