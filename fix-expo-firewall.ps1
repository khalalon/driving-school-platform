# Run this as Administrator to allow Expo ports through firewall
Write-Host "Opening Expo ports in Windows Firewall..." -ForegroundColor Cyan

# Allow common Expo ports
$ports = @(19000, 19001, 19002, 19006, 8081, 8082, 8083, 8084)

foreach ($port in $ports) {
    Write-Host "Opening port $port..." -ForegroundColor Yellow
    try {
        New-NetFirewallRule -DisplayName "Expo Go - Port $port" -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue
        Write-Host "Port $port opened" -ForegroundColor Green
    } catch {
        Write-Host "Port $port might already be open" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "All Expo ports are now open!" -ForegroundColor Green
Write-Host "Try scanning the QR code again" -ForegroundColor Cyan
