# Run this script as Administrator to fix the firewall issue
# This will allow your phone to connect to the backend

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Fixing Windows Firewall for Port 80..." -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Allow port 80 in Windows Firewall
Write-Host "[1/2] Adding firewall rule for port 80..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Driving School Backend - Port 80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -Profile Any
Write-Host "Firewall rule added!" -ForegroundColor Green
Write-Host ""

# Allow port 443 in Windows Firewall (for HTTPS)
Write-Host "[2/2] Adding firewall rule for port 443..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Driving School Backend - Port 443" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow -Profile Any
Write-Host "Firewall rule added!" -ForegroundColor Green
Write-Host ""

Write-Host "===========================================" -ForegroundColor Green
Write-Host "FIREWALL FIXED!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your phone can now connect to the backend!" -ForegroundColor Cyan
Write-Host "Test it in Expo Go with the QR code" -ForegroundColor Cyan
Write-Host ""
