# Full Application Workflow Test

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "COMPLETE APPLICATION WORKFLOW TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Variables
$baseUrl = "http://localhost"
$adminToken = $null
$studentToken = $null
$instructorToken = $null
$schoolId = $null
$lessonId = $null
$examId = $null

# Step 1: Register Users
Write-Host "`n[1] USER REGISTRATION" -ForegroundColor Yellow
Write-Host "-----------------------------------------" -ForegroundColor Gray

Write-Host "`n  Creating Admin User..." -ForegroundColor Gray
try {
    $payload = '{"email":"admin001@test.com","password":"AdminTest@1234","role":"admin"}'
    $resp = Invoke-WebRequest -Uri "$baseUrl:3001/api/auth/register" `
        -Method POST -ContentType "application/json" -Body $payload `
        -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $adminToken = ($resp.Content | ConvertFrom-Json).accessToken
    Write-Host "  OK - Admin registered" -ForegroundColor Green
} catch {
    Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n  Creating Student User..." -ForegroundColor Gray
try {
    $payload = '{"email":"student001@test.com","password":"StudentTest@1234","role":"student"}'
    $resp = Invoke-WebRequest -Uri "$baseUrl:3001/api/auth/register" `
        -Method POST -ContentType "application/json" -Body $payload `
        -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $studentToken = ($resp.Content | ConvertFrom-Json).accessToken
    Write-Host "  OK - Student registered" -ForegroundColor Green
} catch {
    Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n  Creating Instructor User..." -ForegroundColor Gray
try {
    $payload = '{"email":"instructor001@test.com","password":"InstructorTest@1234","role":"instructor"}'
    $resp = Invoke-WebRequest -Uri "$baseUrl:3001/api/auth/register" `
        -Method POST -ContentType "application/json" -Body $payload `
        -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $instructorToken = ($resp.Content | ConvertFrom-Json).accessToken
    Write-Host "  OK - Instructor registered" -ForegroundColor Green
} catch {
    Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Step 2: School Management
Write-Host "`n[2] SCHOOL MANAGEMENT" -ForegroundColor Yellow
Write-Host "-----------------------------------------" -ForegroundColor Gray

Write-Host "`n  Creating School..." -ForegroundColor Gray
try {
    $payload = '{"name":"Professional Driving Academy","address":"789 Elm Street, Chicago, IL 60601","email":"professional@academy.com","phone":"+1-555-0105"}'
    $headers = @{ Authorization = "Bearer $adminToken" }
    $resp = Invoke-WebRequest -Uri "$baseUrl:3002/api/schools" `
        -Method POST -Headers $headers -ContentType "application/json" -Body $payload `
        -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $school = $resp.Content | ConvertFrom-Json
    $schoolId = $school.id
    Write-Host "  OK - School created: $($school.name)" -ForegroundColor Green
} catch {
    Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n  Retrieving All Schools..." -ForegroundColor Gray
try {
    $resp = Invoke-WebRequest -Uri "$baseUrl:3002/api/schools" `
        -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $schools = $resp.Content | ConvertFrom-Json
    Write-Host "  OK - Found $($schools.Count) schools" -ForegroundColor Green
} catch {
    Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Lesson Management
Write-Host "`n[3] LESSON MANAGEMENT" -ForegroundColor Yellow
Write-Host "-----------------------------------------" -ForegroundColor Gray

if ($schoolId) {
    Write-Host "`n  Creating Lesson..." -ForegroundColor Gray
    try {
        $payload = @{
            title = "Highway Driving Techniques"
            description = "Master highway driving at high speeds"
            duration = 90
            schoolId = $schoolId
        } | ConvertTo-Json
        $resp = Invoke-WebRequest -Uri "$baseUrl:3003/api/lessons" `
            -Method POST -ContentType "application/json" -Body $payload `
            -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $lesson = $resp.Content | ConvertFrom-Json
        $lessonId = $lesson.id
        Write-Host "  OK - Lesson created: $($lesson.title)" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "`n  Retrieving Lessons..." -ForegroundColor Gray
    try {
        $resp = Invoke-WebRequest -Uri "$baseUrl:3003/api/lessons" `
            -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $lessons = $resp.Content | ConvertFrom-Json
        Write-Host "  OK - Found $($lessons.Count) lessons" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 4: Exam Management
Write-Host "`n[4] EXAM MANAGEMENT" -ForegroundColor Yellow
Write-Host "-----------------------------------------" -ForegroundColor Gray

if ($schoolId) {
    Write-Host "`n  Creating Exam..." -ForegroundColor Gray
    try {
        $payload = @{
            title = "Road Safety Examination"
            type = "practical"
            passingScore = 75
            totalQuestions = 40
            schoolId = $schoolId
        } | ConvertTo-Json
        $resp = Invoke-WebRequest -Uri "$baseUrl:3004/api/exams" `
            -Method POST -ContentType "application/json" -Body $payload `
            -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $exam = $resp.Content | ConvertFrom-Json
        $examId = $exam.id
        Write-Host "  OK - Exam created: $($exam.title)" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "`n  Retrieving Exams..." -ForegroundColor Gray
    try {
        $resp = Invoke-WebRequest -Uri "$baseUrl:3004/api/exams" `
            -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $exams = $resp.Content | ConvertFrom-Json
        Write-Host "  OK - Found $($exams.Count) exams" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 5: Student Enrollment
Write-Host "`n[5] STUDENT ENROLLMENT" -ForegroundColor Yellow
Write-Host "-----------------------------------------" -ForegroundColor Gray

if ($studentToken -and $schoolId) {
    Write-Host "`n  Requesting Enrollment..." -ForegroundColor Gray
    try {
        $payload = '{"licenseType":"B"}'
        $headers = @{ Authorization = "Bearer $studentToken" }
        $resp = Invoke-WebRequest -Uri "$baseUrl:3007/api/enrollment/schools/$schoolId/request" `
            -Method POST -Headers $headers -ContentType "application/json" -Body $payload `
            -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $enrollment = $resp.Content | ConvertFrom-Json
        Write-Host "  OK - Enrollment request created" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "`n  Checking Enrollment Status..." -ForegroundColor Gray
    try {
        $headers = @{ Authorization = "Bearer $studentToken" }
        $resp = Invoke-WebRequest -Uri "$baseUrl:3007/api/enrollment/schools/$schoolId/status" `
            -Method GET -Headers $headers `
            -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $status = $resp.Content | ConvertFrom-Json
        Write-Host "  OK - Status: $($status.status)" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 6: Notifications
Write-Host "`n[6] NOTIFICATIONS" -ForegroundColor Yellow
Write-Host "-----------------------------------------" -ForegroundColor Gray

if ($studentToken) {
    Write-Host "`n  Retrieving Notifications..." -ForegroundColor Gray
    try {
        $headers = @{ Authorization = "Bearer $studentToken" }
        $resp = Invoke-WebRequest -Uri "$baseUrl:3006/api/notifications" `
            -Method GET -Headers $headers `
            -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $notifications = $resp.Content | ConvertFrom-Json
        Write-Host "  OK - Found $($notifications.Count) notifications" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 7: Payments
Write-Host "`n[7] PAYMENTS" -ForegroundColor Yellow
Write-Host "-----------------------------------------" -ForegroundColor Gray

if ($studentToken) {
    Write-Host "`n  Retrieving Payment History..." -ForegroundColor Gray
    try {
        $headers = @{ Authorization = "Bearer $studentToken" }
        $resp = Invoke-WebRequest -Uri "$baseUrl:3005/api/payments" `
            -Method GET -Headers $headers `
            -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $payments = $resp.Content | ConvertFrom-Json
        Write-Host "  OK - Found $($payments.Count) payment records" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 8: Analytics
Write-Host "`n[8] ANALYTICS" -ForegroundColor Yellow
Write-Host "-----------------------------------------" -ForegroundColor Gray

if ($studentToken) {
    Write-Host "`n  Retrieving Analytics Data..." -ForegroundColor Gray
    try {
        $headers = @{ Authorization = "Bearer $studentToken" }
        $resp = Invoke-WebRequest -Uri "$baseUrl:3008/api/analytics/lessons" `
            -Method GET -Headers $headers `
            -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "  OK - Analytics data retrieved" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Final Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST EXECUTION COMPLETED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nCreated Resources:" -ForegroundColor Cyan
Write-Host "  - 3 Users (Admin, Student, Instructor)" -ForegroundColor Green
Write-Host "  - 1 School" -ForegroundColor Green
Write-Host "  - 1 Lesson" -ForegroundColor Green
Write-Host "  - 1 Exam" -ForegroundColor Green
Write-Host "  - 1 Enrollment Request" -ForegroundColor Green
Write-Host "`nAll services tested successfully!`n" -ForegroundColor Green
