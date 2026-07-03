# Comprehensive Test Suite for Driving School Platform
# This script runs all tests across all microservices

$ErrorActionPreference = "Stop"

$services = @(
    "auth",
    "school",
    "lesson",
    "exam",
    "payment",
    "notification",
    "student",
    "analytics"
)

Write-Host "====================================" -ForegroundColor Cyan
Write-Host " Driving School Platform Test Suite " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$results = @()

foreach ($service in $services) {
    Write-Host "Testing $service service..." -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray

    $servicePath = "services\$service"

    if (Test-Path $servicePath) {
        Push-Location $servicePath

        try {
            # Check if package.json exists
            if (Test-Path "package.json") {
                # Install dependencies if needed
                if (!(Test-Path "node_modules")) {
                    Write-Host "  Installing dependencies..." -ForegroundColor Gray
                    npm install --silent
                }

                # Run tests
                Write-Host "  Running tests..." -ForegroundColor Gray
                $testOutput = npm test 2>&1
                $exitCode = $LASTEXITCODE

                if ($exitCode -eq 0) {
                    Write-Host "  ✓ $service tests passed" -ForegroundColor Green
                    $results += [PSCustomObject]@{
                        Service = $service
                        Status  = "PASSED"
                        Output  = $testOutput
                    }
                }
                else {
                    Write-Host "  ✗ $service tests failed" -ForegroundColor Red
                    $results += [PSCustomObject]@{
                        Service = $service
                        Status  = "FAILED"
                        Output  = $testOutput
                    }
                }
            }
            else {
                Write-Host "  ! No package.json found for $service" -ForegroundColor Yellow
                $results += [PSCustomObject]@{
                    Service = $service
                    Status  = "SKIPPED"
                    Output  = "No package.json"
                }
            }
        }
        catch {
            Write-Host "  ✗ Error testing $service : $_" -ForegroundColor Red
            $results += [PSCustomObject]@{
                Service = $service
                Status  = "ERROR"
                Output  = $_.Exception.Message
            }
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Host "  ! Service path not found: $servicePath" -ForegroundColor Yellow
        $results += [PSCustomObject]@{
            Service = $service
            Status  = "NOT FOUND"
            Output  = "Path not found"
        }
    }

    Write-Host ""
}

# Summary
Write-Host "====================================" -ForegroundColor Cyan
Write-Host " Test Summary " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$passed = ($results | Where-Object { $_.Status -eq "PASSED" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAILED" }).Count
$errors = ($results | Where-Object { $_.Status -eq "ERROR" }).Count
$skipped = ($results | Where-Object { $_.Status -eq "SKIPPED" }).Count

foreach ($result in $results) {
    $color = switch ($result.Status) {
        "PASSED" { "Green" }
        "FAILED" { "Red" }
        "ERROR" { "Red" }
        default { "Yellow" }
    }
    Write-Host "  [$($result.Status)] $($result.Service)" -ForegroundColor $color
}

Write-Host ""
Write-Host "Total: $($results.Count) | Passed: $passed | Failed: $failed | Errors: $errors | Skipped: $skipped" -ForegroundColor Cyan
Write-Host ""

if ($failed -gt 0 -or $errors -gt 0) {
    Write-Host "Some tests failed. Check output above for details." -ForegroundColor Red
    exit 1
}
else {
    Write-Host "All tests passed successfully!" -ForegroundColor Green
    exit 0
}
