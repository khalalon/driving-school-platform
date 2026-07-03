# Run as Administrator - COMPLETE FIREWALL FIX
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "COMPLETE FIREWALL FIX FOR EXPO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Disable Windows Firewall temporarily for testing
Write-Host "[1/3] Disabling Windows Firewall profiles..." -ForegroundColor Yellow
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
Write-Host "Firewall DISABLED temporarily" -ForegroundColor Green
Write-Host ""

# Step 2: Show current firewall status
Write-Host "[2/3] Current Firewall Status:" -ForegroundColor Yellow
Get-NetFirewallProfile | Select-Object Name, Enabled | Format-Table
Write-Host ""

Write-Host "[3/3] Testing if ports are accessible..." -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "FIREWALL IS NOW DISABLED!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Try registering from your phone NOW!" -ForegroundColor Cyan
Write-Host ""
Write-Host "To re-enable firewall after testing, run:" -ForegroundColor Yellow
Write-Host "Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True" -ForegroundColor White
Write-Host ""
