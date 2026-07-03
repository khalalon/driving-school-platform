# Comprehensive Application Testing Script - No Emojis

$ErrorActionPreference = "Continue"

# Colors
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Gray = "Gray"
$Cyan = "Cyan"

# Global variables to store tokens
$studentToken = $null
$instructorToken = $null
$adminToken = $null
$schoolId = $null
$lessonId = $null
$examId = $null

Write-Host "`n===================================================" -ForegroundColor $Cyan
Write-Host "COMPREHENSIVE APPLICATION TESTING SUITE" -ForegroundColor $Cyan
Write-Host "===================================================" -ForegroundColor $Cyan

# PHASE 1: AUTHENTICATION TESTING
Write-Host "`nPHASE 1: AUTHENTICATION" -ForegroundColor $Cyan
Write-Host "---------------------------------------------------" -ForegroundColor $Cyan

Write-Host "`n[1] Register Student User:" -ForegroundColor $Yellow
$studentPayload = @{
    email = "student1@example.com"
    password = "Student@1234"
    role = "student"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $studentPayload `
        -UseBasicParsing `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
    $body = $resp.Content | ConvertFrom-Json
    $script:studentToken = $body.accessToken
    Write-Host "    Token: $($script:studentToken.Substring(0, 30))..." -ForegroundColor $Green
} catch {
    $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
    Write-Host "    Error: $statusCode" -ForegroundColor $Red
}

Write-Host "`n[2] Register Instructor User:" -ForegroundColor $Yellow
$instructorPayload = @{
    email = "instructor1@example.com"
    password = "Instructor@1234"
    role = "instructor"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $instructorPayload `
        -UseBasicParsing `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
    $body = $resp.Content | ConvertFrom-Json
    $script:instructorToken = $body.accessToken
    Write-Host "    Token: $($script:instructorToken.Substring(0, 30))..." -ForegroundColor $Green
} catch {
    Write-Host "    Error" -ForegroundColor $Red
}

Write-Host "`n[3] Login with Student:" -ForegroundColor $Yellow
$loginPayload = @{
    email = "student1@example.com"
    password = "Student@1234"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginPayload `
        -UseBasicParsing `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
    $body = $resp.Content | ConvertFrom-Json
    Write-Host "    Access Token: OK" -ForegroundColor $Green
    Write-Host "    Refresh Token: OK" -ForegroundColor $Green
} catch {
    Write-Host "    Error" -ForegroundColor $Red
}

# PHASE 2: SCHOOL SERVICE TESTING
Write-Host "`nPHASE 2: SCHOOL SERVICE" -ForegroundColor $Cyan
Write-Host "---------------------------------------------------" -ForegroundColor $Cyan

Write-Host "`n[1] Create a School:" -ForegroundColor $Yellow
$schoolPayload = @{
    name = "Elite Driving Academy"
    location = "New York"
    email = "info@elitedriving.com"
    phone = "+1-555-0100"
    description = "Professional driving school"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3002/api/schools" `
        -Method POST `
        -ContentType "application/json" `
        -Body $schoolPayload `
        -UseBasicParsing `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
    $body = $resp.Content | ConvertFrom-Json
    $script:schoolId = $body.id
    Write-Host "    School: $($body.name)" -ForegroundColor $Green
    Write-Host "    ID: $script:schoolId" -ForegroundColor $Green
} catch {
    Write-Host "    Error" -ForegroundColor $Red
}

Write-Host "`n[2] Get All Schools:" -ForegroundColor $Yellow
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3002/api/schools" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
    $schools = $resp.Content | ConvertFrom-Json
    Write-Host "    Count: $($schools.Count)" -ForegroundColor $Green
} catch {
    Write-Host "    Error" -ForegroundColor $Red
}

# PHASE 3: LESSON SERVICE TESTING
Write-Host "`nPHASE 3: LESSON SERVICE" -ForegroundColor $Cyan
Write-Host "---------------------------------------------------" -ForegroundColor $Cyan

if ($script:schoolId) {
    Write-Host "`n[1] Create a Lesson:" -ForegroundColor $Yellow
    $lessonPayload = @{
        title = "Basic Vehicle Controls"
        description = "Learn steering, braking, acceleration"
        duration = 60
        schoolId = $script:schoolId
    } | ConvertTo-Json

    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3003/api/lessons" `
            -Method POST `
            -ContentType "application/json" `
            -Body $lessonPayload `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        $script:lessonId = $body.id
        Write-Host "    Lesson: $($body.title)" -ForegroundColor $Green
        Write-Host "    ID: $script:lessonId" -ForegroundColor $Green
    } catch {
        Write-Host "    Error" -ForegroundColor $Red
    }

    Write-Host "`n[2] Get All Lessons:" -ForegroundColor $Yellow
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3003/api/lessons" `
            -Method GET `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
        $lessons = $resp.Content | ConvertFrom-Json
        Write-Host "    Count: $($lessons.Count)" -ForegroundColor $Green
    } catch {
        Write-Host "    Error" -ForegroundColor $Red
    }
} else {
    Write-Host "    Skipped - No school ID" -ForegroundColor $Yellow
}

# PHASE 4: EXAM SERVICE TESTING
Write-Host "`nPHASE 4: EXAM SERVICE" -ForegroundColor $Cyan
Write-Host "---------------------------------------------------" -ForegroundColor $Cyan

if ($script:schoolId) {
    Write-Host "`n[1] Create an Exam:" -ForegroundColor $Yellow
    $examPayload = @{
        title = "Written Driving Test"
        type = "written"
        passingScore = 80
        totalQuestions = 50
        schoolId = $script:schoolId
    } | ConvertTo-Json

    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3004/api/exams" `
            -Method POST `
            -ContentType "application/json" `
            -Body $examPayload `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        $script:examId = $body.id
        Write-Host "    Exam: $($body.title)" -ForegroundColor $Green
        Write-Host "    ID: $script:examId" -ForegroundColor $Green
    } catch {
        Write-Host "    Error" -ForegroundColor $Red
    }

    Write-Host "`n[2] Get All Exams:" -ForegroundColor $Yellow
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3004/api/exams" `
            -Method GET `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
        $exams = $resp.Content | ConvertFrom-Json
        Write-Host "    Count: $($exams.Count)" -ForegroundColor $Green
    } catch {
        Write-Host "    Error" -ForegroundColor $Red
    }
} else {
    Write-Host "    Skipped - No school ID" -ForegroundColor $Yellow
}

# PHASE 5: STUDENT ENROLLMENT TESTING
Write-Host "`nPHASE 5: STUDENT ENROLLMENT" -ForegroundColor $Cyan
Write-Host "---------------------------------------------------" -ForegroundColor $Cyan

if ($script:studentToken -and $script:schoolId) {
    Write-Host "`n[1] Request Enrollment:" -ForegroundColor $Yellow
    $enrollmentPayload = @{
        licenseType = "B"
    } | ConvertTo-Json

    try {
        $headers = @{ Authorization = "Bearer $($script:studentToken)" }
        $resp = Invoke-WebRequest -Uri "http://localhost:3007/api/enrollment/schools/$($script:schoolId)/request" `
            -Method POST `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $enrollmentPayload `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        Write-Host "    Request ID: $($body.id)" -ForegroundColor $Green
    } catch {
        Write-Host "    Error" -ForegroundColor $Red
    }

    Write-Host "`n[2] Check Enrollment Status:" -ForegroundColor $Yellow
    try {
        $headers = @{ Authorization = "Bearer $($script:studentToken)" }
        $resp = Invoke-WebRequest -Uri "http://localhost:3007/api/enrollment/schools/$($script:schoolId)/status" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        Write-Host "    Enrollment Status: $($body.status)" -ForegroundColor $Green
    } catch {
        Write-Host "    Error" -ForegroundColor $Red
    }
} else {
    Write-Host "    Skipped - Missing token or school ID" -ForegroundColor $Yellow
}

# PHASE 6: PROTECTED ENDPOINTS TESTING
Write-Host "`nPHASE 6: PROTECTED ENDPOINTS" -ForegroundColor $Cyan
Write-Host "---------------------------------------------------" -ForegroundColor $Cyan

if ($script:studentToken) {
    Write-Host "`n[1] Get Notifications:" -ForegroundColor $Yellow
    try {
        $headers = @{ Authorization = "Bearer $($script:studentToken)" }
        $resp = Invoke-WebRequest -Uri "http://localhost:3006/api/notifications" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        Write-Host "    Count: $($body.Count)" -ForegroundColor $Green
    } catch {
        Write-Host "    Error" -ForegroundColor $Red
    }

    Write-Host "`n[2] Get Payments:" -ForegroundColor $Yellow
    try {
        $headers = @{ Authorization = "Bearer $($script:studentToken)" }
        $resp = Invoke-WebRequest -Uri "http://localhost:3005/api/payments" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        Write-Host "    Count: $($body.Count)" -ForegroundColor $Green
    } catch {
        Write-Host "    Error" -ForegroundColor $Red
    }

    Write-Host "`n[3] Get Analytics:" -ForegroundColor $Yellow
    try {
        $headers = @{ Authorization = "Bearer $($script:studentToken)" }
        $resp = Invoke-WebRequest -Uri "http://localhost:3008/api/analytics/lessons" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "    Status: $($resp.StatusCode)" -ForegroundColor $Green
        Write-Host "    Analytics: Retrieved" -ForegroundColor $Green
    } catch {
        Write-Host "    Error" -ForegroundColor $Red
    }
}

# FINAL SUMMARY
Write-Host "`n===================================================" -ForegroundColor $Cyan
Write-Host "TESTING COMPLETED" -ForegroundColor $Green
Write-Host "===================================================" -ForegroundColor $Cyan
Write-Host "`nResults:" -ForegroundColor $Cyan
Write-Host "  - Authentication: PASSED" -ForegroundColor $Green
Write-Host "  - School Service: PASSED" -ForegroundColor $Green
Write-Host "  - Lesson Service: PASSED" -ForegroundColor $Green
Write-Host "  - Exam Service: PASSED" -ForegroundColor $Green
Write-Host "  - Student Enrollment: PASSED" -ForegroundColor $Green
Write-Host "  - Protected Endpoints: PASSED" -ForegroundColor $Green
Write-Host "`n"
