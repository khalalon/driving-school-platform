# Cleanup Docker resources script
# PowerShell version

Write-Host "🧹 Cleaning up Docker resources..." -ForegroundColor Yellow

$confirmation = Read-Host "⚠️  This will remove all containers, volumes, and images. Continue? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Stop all services and remove volumes
Write-Host "Stopping services..." -ForegroundColor Yellow
docker compose down -v

# Remove all project images
Write-Host "Removing project images..." -ForegroundColor Yellow
$images = docker images | Select-String "driving-school"
if ($images) {
    $images | ForEach-Object {
        $parts = $_ -split '\s+'
        if ($parts.Count -ge 3) {
            docker rmi -f $parts[2] 2>&1 | Out-Null
        }
    }
}

# Prune unused resources
Write-Host "Pruning unused Docker resources..." -ForegroundColor Yellow
docker system prune -f | Out-Null

Write-Host "✅ Cleanup complete" -ForegroundColor Green
