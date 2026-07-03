# Restart service script
# PowerShell version

param(
    [string]$ServiceName
)

if ([string]::IsNullOrEmpty($ServiceName)) {
    Write-Host "Usage: .\scripts\docker-restart.ps1 -ServiceName <service-name>" -ForegroundColor Yellow
    Write-Host "Example: .\scripts\docker-restart.ps1 -ServiceName auth-service" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔄 Restarting $ServiceName..." -ForegroundColor Yellow
docker compose restart $ServiceName
Write-Host "✅ $ServiceName restarted" -ForegroundColor Green
