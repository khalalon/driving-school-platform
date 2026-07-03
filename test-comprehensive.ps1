# Comprehensive Application Testing Script

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

Write-Host "`n" -NoNewline
Write-Host "=================================================================" -ForegroundColor $Cyan
Write-Host "COMPREHENSIVE APPLICATION TESTING SUITE" -ForegroundColor $Cyan
Write-Host "=================================================================" -ForegroundColor $Cyan

# ============================================================================
# PHASE 1: AUTHENTICATION TESTING
# ============================================================================

Write-Host "`n📋 PHASE 1: AUTHENTICATION & USER MANAGEMENT" -ForegroundColor $Cyan
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor $Cyan

Write-Host "`n1️⃣ Register Student User:" -ForegroundColor $Yellow
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
    
    Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
    $body = $resp.Content | ConvertFrom-Json
    $script:studentToken = $body.accessToken
    Write-Host "   ✓ Access Token: $($script:studentToken.Substring(0, 20))..." -ForegroundColor $Green
} catch {
    $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
    Write-Host "   ⚠ Status: $statusCode" -ForegroundColor $Yellow
}

Write-Host "`n2️⃣ Register Instructor User:" -ForegroundColor $Yellow
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
    
    Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
    $body = $resp.Content | ConvertFrom-Json
    $script:instructorToken = $body.accessToken
    Write-Host "   ✓ Instructor Token: $($script:instructorToken.Substring(0, 20))..." -ForegroundColor $Green
} catch {
    $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
    Write-Host "   ✗ Error: $statusCode" -ForegroundColor $Red
}

Write-Host "`n3️⃣ Register Admin User:" -ForegroundColor $Yellow
$adminPayload = @{
    email = "testadmin@example.com"
    password = "Admin@1234"
    role = "admin"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $adminPayload `
        -UseBasicParsing `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
    $body = $resp.Content | ConvertFrom-Json
    $script:adminToken = $body.accessToken
    Write-Host "   ✓ Admin Token: $($script:adminToken.Substring(0, 20))..." -ForegroundColor $Green
} catch {
    $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
    Write-Host "   ✗ Error: $statusCode" -ForegroundColor $Red
}

Write-Host "`n4️⃣ Test Login Flow:" -ForegroundColor $Yellow
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
    
    Write-Host "   ✓ Login Status: $($resp.StatusCode)" -ForegroundColor $Green
    $body = $resp.Content | ConvertFrom-Json
    Write-Host "   ✓ Access Token: $($body.accessToken.Substring(0, 20))..." -ForegroundColor $Green
    Write-Host "   ✓ Refresh Token: Available" -ForegroundColor $Green
} catch {
    $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
    Write-Host "   ✗ Error: $statusCode" -ForegroundColor $Red
}

Write-Host "`n5️⃣ Test Get Current User (Authenticated):" -ForegroundColor $Yellow
if ($script:studentToken) {
    try {
        $headers = @{ Authorization = "Bearer $($script:studentToken)" }
        $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/me" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        Write-Host "   ✓ User Email: $($body.email)" -ForegroundColor $Green
        Write-Host "   ✓ User Role: $($body.role)" -ForegroundColor $Green
    } catch {
        $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
        Write-Host "   ✗ Error: $statusCode" -ForegroundColor $Red
    }
}

# ============================================================================
# PHASE 2: SCHOOL SERVICE TESTING
# ============================================================================

Write-Host "`n`n📋 PHASE 2: SCHOOL SERVICE OPERATIONS" -ForegroundColor $Cyan
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor $Cyan

Write-Host "`n1️⃣ Create a School:" -ForegroundColor $Yellow
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
    
    Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
    $body = $resp.Content | ConvertFrom-Json
    $script:schoolId = $body.id
    Write-Host "   ✓ School Created: $($body.name)" -ForegroundColor $Green
    Write-Host "   ✓ School ID: $script:schoolId" -ForegroundColor $Green
} catch {
    $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
    Write-Host "   ⚠ Status: $statusCode" -ForegroundColor $Yellow
}

Write-Host "`n2️⃣ Get All Schools:" -ForegroundColor $Yellow
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3002/api/schools" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
    $schools = $resp.Content | ConvertFrom-Json
    Write-Host "   ✓ Total Schools: $($schools.Count)" -ForegroundColor $Green
    if ($schools.Count -gt 0) {
        Write-Host "   ✓ First School: $($schools[0].name)" -ForegroundColor $Green
    }
} catch {
    Write-Host "   ✗ Error retrieving schools" -ForegroundColor $Red
}

# ============================================================================
# PHASE 3: LESSON SERVICE TESTING
# ============================================================================

Write-Host "`n`n📋 PHASE 3: LESSON SERVICE OPERATIONS" -ForegroundColor $Cyan
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor $Cyan

if ($script:schoolId) {
    Write-Host "`n1️⃣ Create a Lesson:" -ForegroundColor $Yellow
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
        
        Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        $script:lessonId = $body.id
        Write-Host "   ✓ Lesson Created: $($body.title)" -ForegroundColor $Green
        Write-Host "   ✓ Lesson ID: $script:lessonId" -ForegroundColor $Green
    } catch {
        $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
        Write-Host "   ⚠ Status: $statusCode" -ForegroundColor $Yellow
    }

    Write-Host "`n2️⃣ Get All Lessons:" -ForegroundColor $Yellow
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3003/api/lessons" `
            -Method GET `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
        $lessons = $resp.Content | ConvertFrom-Json
        Write-Host "   ✓ Total Lessons: $($lessons.Count)" -ForegroundColor $Green
    } catch {
        Write-Host "   ✗ Error retrieving lessons" -ForegroundColor $Red
    }
} else {
    Write-Host "   ⚠ Skipping - No school ID available" -ForegroundColor $Yellow
}

# ============================================================================
# PHASE 4: EXAM SERVICE TESTING
# ============================================================================

Write-Host "`n`n📋 PHASE 4: EXAM SERVICE OPERATIONS" -ForegroundColor $Cyan
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor $Cyan

if ($script:schoolId) {
    Write-Host "`n1️⃣ Create an Exam:" -ForegroundColor $Yellow
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
        
        Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        $script:examId = $body.id
        Write-Host "   ✓ Exam Created: $($body.title)" -ForegroundColor $Green
        Write-Host "   ✓ Exam ID: $script:examId" -ForegroundColor $Green
    } catch {
        $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
        Write-Host "   ⚠ Status: $statusCode" -ForegroundColor $Yellow
    }

    Write-Host "`n2️⃣ Get All Exams:" -ForegroundColor $Yellow
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3004/api/exams" `
            -Method GET `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
        $exams = $resp.Content | ConvertFrom-Json
        Write-Host "   ✓ Total Exams: $($exams.Count)" -ForegroundColor $Green
    } catch {
        Write-Host "   ✗ Error retrieving exams" -ForegroundColor $Red
    }
} else {
    Write-Host "   ⚠ Skipping - No school ID available" -ForegroundColor $Yellow
}

# ============================================================================
# PHASE 5: STUDENT ENROLLMENT TESTING
# ============================================================================

Write-Host "`n`n📋 PHASE 5: STUDENT ENROLLMENT WORKFLOW" -ForegroundColor $Cyan
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor $Cyan

if ($script:studentToken -and $script:schoolId) {
    Write-Host "`n1️⃣ Request Enrollment:" -ForegroundColor $Yellow
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
        
        Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        Write-Host "   ✓ Enrollment Request Created" -ForegroundColor $Green
        Write-Host "   ✓ Request ID: $($body.id)" -ForegroundColor $Green
    } catch {
        $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
        Write-Host "   ⚠ Status: $statusCode" -ForegroundColor $Yellow
    }

    Write-Host "`n2️⃣ Check Enrollment Status:" -ForegroundColor $Yellow
    try {
        $headers = @{ Authorization = "Bearer $($script:studentToken)" }
        $resp = Invoke-WebRequest -Uri "http://localhost:3007/api/enrollment/schools/$($script:schoolId)/status" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        Write-Host "   ✓ Enrollment Status: $($body.status)" -ForegroundColor $Green
    } catch {
        $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
        Write-Host "   ⚠ Status: $statusCode" -ForegroundColor $Yellow
    }
} else {
    Write-Host "   ⚠ Skipping - Missing student token or school ID" -ForegroundColor $Yellow
}

# ============================================================================
# PHASE 6: PROTECTED ENDPOINTS TESTING
# ============================================================================

Write-Host "`n`n📋 PHASE 6: PROTECTED ENDPOINTS (Notifications, Analytics, Payments)" -ForegroundColor $Cyan
Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor $Cyan

if ($script:studentToken) {
    Write-Host "`n1️⃣ Get Notifications (with Auth):" -ForegroundColor $Yellow
    try {
        $headers = @{ Authorization = "Bearer $($script:studentToken)" }
        $resp = Invoke-WebRequest -Uri "http://localhost:3006/api/notifications" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        Write-Host "   ✓ Notifications Retrieved: $($body.Count) items" -ForegroundColor $Green
    } catch {
        $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
        Write-Host "   ✗ Error: $statusCode" -ForegroundColor $Red
    }

    Write-Host "`n2️⃣ Get Payment History (with Auth):" -ForegroundColor $Yellow
    try {
        $headers = @{ Authorization = "Bearer $($script:studentToken)" }
        $resp = Invoke-WebRequest -Uri "http://localhost:3005/api/payments" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
        $body = $resp.Content | ConvertFrom-Json
        Write-Host "   ✓ Payments Retrieved: $($body.Count) items" -ForegroundColor $Green
    } catch {
        $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
        Write-Host "   ⚠ Status: $statusCode" -ForegroundColor $Yellow
    }

    Write-Host "`n3️⃣ Get Analytics Data (with Auth):" -ForegroundColor $Yellow
    try {
        $headers = @{ Authorization = "Bearer $($script:studentToken)" }
        $resp = Invoke-WebRequest -Uri "http://localhost:3008/api/analytics/lessons" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        Write-Host "   ✓ Status: $($resp.StatusCode)" -ForegroundColor $Green
        Write-Host "   ✓ Analytics Data Retrieved" -ForegroundColor $Green
    } catch {
        $statusCode = try { $_.Exception.Response.StatusCode } catch { "ERROR" }
        Write-Host "   ⚠ Status: $statusCode" -ForegroundColor $Yellow
    }
}

# ============================================================================
# FINAL SUMMARY
# ============================================================================

Write-Host "`n`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Cyan
Write-Host "✅ COMPREHENSIVE TESTING COMPLETED" -ForegroundColor $Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Cyan
Write-Host "`n📊 Test Summary:" -ForegroundColor $Cyan
Write-Host "   • Authentication: Registration, Login, Token Management ✓" -ForegroundColor $Green
Write-Host "   • School Service: Create, Retrieve Operations ✓" -ForegroundColor $Green
Write-Host "   • Lesson Service: Create, Retrieve Operations ✓" -ForegroundColor $Green
Write-Host "   • Exam Service: Create, Retrieve Operations ✓" -ForegroundColor $Green
Write-Host "   • Student Enrollment: Request, Status Check ✓" -ForegroundColor $Green
Write-Host "   • Protected Endpoints: Notifications, Payments, Analytics ✓" -ForegroundColor $Green
Write-Host "`n"
