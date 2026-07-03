# Network Diagnostics for Driving School App
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NETWORK DIAGNOSTICS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check IP addresses
Write-Host "[1] Your Computer's IP Addresses:" -ForegroundColor Yellow
ipconfig | findstr "IPv4"
Write-Host ""

# 2. Check if backend is accessible
Write-Host "[2] Testing Backend from your computer:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost/api/schools" -Method GET -TimeoutSec 5
    Write-Host "  Backend accessible via localhost: YES" -ForegroundColor Green
} catch {
    Write-Host "  Backend accessible via localhost: NO" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://192.168.100.113/api/schools" -Method GET -TimeoutSec 5
    Write-Host "  Backend accessible via IP: YES" -ForegroundColor Green
} catch {
    Write-Host "  Backend accessible via IP: NO" -ForegroundColor Red
}
Write-Host ""

# 3. Check Docker containers
Write-Host "[3] Docker Container Status:" -ForegroundColor Yellow
docker-compose ps --format json | ConvertFrom-Json | Select-Object Name, State, Status | Format-Table
Write-Host ""

# 4. Check firewall status
Write-Host "[4] Windows Firewall Status:" -ForegroundColor Yellow
$profiles = Get-NetFirewallProfile | Select-Object Name, Enabled
foreach ($profile in $profiles) {
    $status = if ($profile.Enabled) { "ENABLED (blocking)" } else { "DISABLED (open)" }
    $color = if ($profile.Enabled) { "Red" } else { "Green" }
    Write-Host "  $($profile.Name): $status" -ForegroundColor $color
}
Write-Host ""

# 5. Check port 80
Write-Host "[5] Port 80 Status:" -ForegroundColor Yellow
$port80 = Get-NetTCPListener -LocalPort 80 -ErrorAction SilentlyContinue
if ($port80) {
    Write-Host "  Port 80 is: LISTENING" -ForegroundColor Green
} else {
    Write-Host "  Port 80 is: NOT LISTENING" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If firewall is ENABLED, run this to disable it:" -ForegroundColor Yellow
Write-Host "Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False" -ForegroundColor White
Write-Host ""
