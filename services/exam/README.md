# Exam Service

Exam scheduling and management microservice for theory and practical exams.

## Features

- Create and manage theory and practical exams
- Student exam registration with eligibility checks
- Result recording (pass/fail with scores)
- Automatic eligibility validation (minimum lessons completed)
- Capacity management

## Setup
```bash
npm install
npm run dev
```

## API Endpoints

### Exams
- POST `/api/exams` - Create exam (Admin)
- GET `/api/exams` - List exams
- GET `/api/exams/:id` - Get exam details
- GET `/api/exams/:id/availability` - Check availability
- PUT `/api/exams/:id` - Update exam (Admin)
- DELETE `/api/exams/:id` - Delete exam (Admin)

### Registrations
- POST `/api/exams/:examId/register` - Register for exam (Student/Admin)
- GET `/api/exams/registrations/:id` - Get registration
- GET `/api/exams/:examId/registrations` - List exam registrations
- GET `/api/exams/students/:studentId/registrations` - Student registrations
- GET `/api/exams/students/:studentId/eligibility?type=theory` - Check eligibility
- PUT `/api/exams/registrations/:registrationId/result` - Record result (Admin)
- DELETE `/api/exams/registrations/:registrationId` - Cancel registration

## Business Rules

1. **Eligibility**:
   - Theory Exam: 20 completed lessons required
   - Practical Exam: 30 completed lessons required

2. **Registration**:
   - Student must be authorized
   - Student must meet minimum lesson requirements
   - Cannot register twice for same exam
   - Respects capacity limits

3. **Results**:
   - Score: 0-100
   - Status: pending, passed, failed
   - Cannot cancel registration after result recorded

## Examples
```bash
# Create an exam
curl -X POST http://localhost:3004/api/exams \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schoolId": "school-uuid",
    "type": "theory",
    "dateTime": "2024-12-25T10:00:00Z",
    "price": 100.00,
    "capacity": 30
  }'

# Check student eligibility
curl "http://localhost:3004/api/exams/students/student-uuid/eligibility?type=theory" \
  -H "Authorization: Bearer TOKEN"

# Register for exam
curl -X POST http://localhost:3004/api/exams/exam-uuid/register \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "student-uuid"}'

# Record exam result
curl -X PUT http://localhost:3004/api/exams/registrations/reg-uuid/result \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "result": "passed",
    "score": 85,
    "notes": "Excellent performance"
  }'
```
