# API Testing Guide

Complete guide to test all API endpoints of the Driving School Platform.

## Quick Start
```bash
# 1. Start all services
./scripts/quick-start.sh

# 2. Run automated tests
./scripts/test-api.sh
```

## Test Accounts
```
Admin:      admin@drivingschool.com / admin123
Student:    student@test.com / student123
Instructor: instructor@test.com / instructor123
```

## Base URLs
```
Auth Service:         http://localhost:3001/api/auth
School Service:       http://localhost:3002/api/schools
Lesson Service:       http://localhost:3003/api/lessons
Exam Service:         http://localhost:3004/api/exams
Payment Service:      http://localhost:3005/api/payments
Notification Service: http://localhost:3006/api/notifications
Analytics Service:    http://localhost:3007/api/analytics
```

## API Testing Examples

### 1. Authentication Service

#### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "student"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@drivingschool.com",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token:**
```bash
TOKEN="your_access_token_here"
```

#### Get Current User
```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

#### Refresh Token
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token"
  }'
```

#### Logout
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2. School Service

#### Create School (Admin only)
```bash
curl -X POST http://localhost:3002/api/schools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Elite Driving School",
    "address": "123 Main Street, Paris",
    "phone": "+33 1 23 45 67 89",
    "email": "contact@eliteds.com"
  }'
```

**Response:**
```json
{
  "id": "uuid-here",
  "name": "Elite Driving School",
  "address": "123 Main Street, Paris",
  "phone": "+33 1 23 45 67 89",
  "email": "contact@eliteds.com",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Save School ID:**
```bash
SCHOOL_ID="school-uuid-here"
```

#### Get All Schools
```bash
curl http://localhost:3002/api/schools
```

#### Get School by ID
```bash
curl http://localhost:3002/api/schools/$SCHOOL_ID
```

#### Update School
```bash
curl -X PUT http://localhost:3002/api/schools/$SCHOOL_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "phone": "+33 1 99 88 77 66"
  }'
```

#### Add Instructor
```bash
curl -X POST http://localhost:3002/api/schools/$SCHOOL_ID/instructors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "instructor-user-id",
    "name": "John Doe",
    "phone": "+33 6 12 34 56 78",
    "licenseNumber": "LIC123456",
    "specialties": ["CODE", "Manœuvre"]
  }'
```

#### Set Pricing
```bash
curl -X POST http://localhost:3002/api/schools/$SCHOOL_ID/pricing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "lessonType": "CODE",
    "price": 50.00,
    "duration": 60
  }'
```

---

### 3. Lesson Service

#### Create Lesson
```bash
curl -X POST http://localhost:3003/api/lessons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "schoolId": "'$SCHOOL_ID'",
    "instructorId": "instructor-uuid",
    "type": "CODE",
    "dateTime": "2024-12-20T10:00:00Z",
    "durationMinutes": 60,
    "capacity": 10,
    "price": 50.00
  }'
```

**Save Lesson ID:**
```bash
LESSON_ID="lesson-uuid-here"
```

#### Get All Lessons
```bash
curl "http://localhost:3003/api/lessons"
```

#### Filter Lessons
```bash
# By school
curl "http://localhost:3003/api/lessons?schoolId=$SCHOOL_ID"

# By type
curl "http://localhost:3003/api/lessons?type=CODE"

# By date range
curl "http://localhost:3003/api/lessons?dateFrom=2024-12-01&dateTo=2024-12-31"

# Multiple filters
curl "http://localhost:3003/api/lessons?schoolId=$SCHOOL_ID&type=CODE&status=scheduled"
```

#### Book Lesson (Student)
```bash
curl -X POST http://localhost:3003/api/lessons/$LESSON_ID/book \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d '{
    "studentId": "student-uuid"
  }'
```

#### Check Lesson Availability
```bash
curl http://localhost:3003/api/lessons/$LESSON_ID/availability
```

#### Mark Attendance (Instructor/Admin)
```bash
curl -X PUT http://localhost:3003/api/lessons/bookings/$BOOKING_ID/attendance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "attended": true,
    "feedback": "Great progress!",
    "rating": 5
  }'
```

#### Cancel Lesson
```bash
curl -X POST http://localhost:3003/api/lessons/$LESSON_ID/cancel \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4. Exam Service

#### Create Exam
```bash
curl -X POST http://localhost:3004/api/exams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "schoolId": "'$SCHOOL_ID'",
    "type": "theory",
    "dateTime": "2024-12-25T14:00:00Z",
    "price": 100.00,
    "capacity": 30
  }'
```

**Save Exam ID:**
```bash
EXAM_ID="exam-uuid-here"
```

#### Get All Exams
```bash
curl "http://localhost:3004/api/exams"
```

#### Filter Exams
```bash
# By school
curl "http://localhost:3004/api/exams?schoolId=$SCHOOL_ID"

# By type
curl "http://localhost:3004/api/exams?type=theory"
```

#### Check Student Eligibility
```bash
curl "http://localhost:3004/api/exams/students/$STUDENT_ID/eligibility?type=theory" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "eligible": true,
  "requiredLessons": 20,
  "completedLessons": 25
}
```

#### Register for Exam
```bash
curl -X POST http://localhost:3004/api/exams/$EXAM_ID/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d '{
    "studentId": "student-uuid"
  }'
```

#### Record Exam Result (Admin)
```bash
curl -X PUT http://localhost:3004/api/exams/registrations/$REGISTRATION_ID/result \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "result": "passed",
    "score": 85,
    "notes": "Excellent performance"
  }'
```

---

### 5. Payment Service

#### Create Payment
```bash
curl -X POST http://localhost:3005/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "studentId": "student-uuid",
    "referenceType": "lesson",
    "referenceId": "'$LESSON_ID'",
    "amount": 50.00,
    "method": "online"
  }'
```

**Save Payment ID:**
```bash
PAYMENT_ID="payment-uuid-here"
```

#### Process Online Payment
```bash
curl -X POST http://localhost:3005/api/payments/$PAYMENT_ID/process \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "paymentUrl": "https://payment-gateway.example.com/pay/txn_abc123"
}
```

#### Get Payment Details
```bash
curl http://localhost:3005/api/payments/$PAYMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

#### Get Student Payment Summary
```bash
curl http://localhost:3005/api/payments/students/$STUDENT_ID/summary \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "totalAmount": 500.00,
  "paidAmount": 300.00,
  "pendingAmount": 200.00,
  "paymentCount": 10
}
```

#### Mark as Paid (Admin - for cash/card payments)
```bash
curl -X POST http://localhost:3005/api/payments/$PAYMENT_ID/mark-paid \
  -H "Authorization: Bearer $TOKEN"
```

#### Refund Payment (Admin)
```bash
curl -X POST http://localhost:3005/api/payments/$PAYMENT_ID/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "reason": "Customer request - lesson cancelled"
  }'
```

---

### 6. Notification Service

#### Send Notification (Admin)
```bash
curl -X POST http://localhost:3006/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "user-uuid",
    "type": "lesson_reminder",
    "title": "Lesson Tomorrow",
    "message": "Your driving lesson is tomorrow at 10:00 AM"
  }'
```

#### Send Bulk Notification (Admin)
```bash
curl -X POST http://localhost:3006/api/notifications/send-bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userIds": ["user-1", "user-2", "user-3"],
    "type": "general",
    "title": "Important Announcement",
    "message": "School will be closed next Monday"
  }'
```

#### Get User Notifications
```bash
curl http://localhost:3006/api/notifications \
  -H "Authorization: Bearer $TOKEN"
```

#### Get Unread Count
```bash
curl http://localhost:3006/api/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN"
```

#### Mark as Read
```bash
curl -X PUT http://localhost:3006/api/notifications/$NOTIFICATION_ID/read \
  -H "Authorization: Bearer $TOKEN"
```

#### Mark All as Read
```bash
curl -X PUT http://localhost:3006/api/notifications/read-all \
  -H "Authorization: Bearer $TOKEN"
```

#### Update Notification Preferences
```bash
curl -X PUT http://localhost:3006/api/notifications/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "lesson_reminder",
    "pushEnabled": true,
    "emailEnabled": false,
    "smsEnabled": false
  }'
```

#### Register Push Token (Mobile App)
```bash
curl -X POST http://localhost:3006/api/notifications/push-tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "ios"
  }'
```

---

### 7. Analytics Service

#### Get Revenue Report
```bash
curl "http://localhost:3007/api/analytics/revenue?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

**With filters:**
```bash
# By school
curl "http://localhost:3007/api/analytics/revenue?startDate=2024-01-01&endDate=2024-12-31&schoolId=$SCHOOL_ID" \
  -H "Authorization: Bearer $TOKEN"

# By instructor
curl "http://localhost:3007/api/analytics/revenue?startDate=2024-01-01&endDate=2024-12-31&instructorId=$INSTRUCTOR_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "totalRevenue": 15000.00,
  "lessonRevenue": 10000.00,
  "examRevenue": 5000.00,
  "periodStart": "2024-01-01T00:00:00.000Z",
  "periodEnd": "2024-12-31T23:59:59.999Z",
  "schoolId": "uuid-here"
}
```

#### Get Lesson Statistics
```bash
curl "http://localhost:3007/api/analytics/lessons?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "totalLessons": 250,
  "completedLessons": 215,
  "cancelledLessons": 35,
  "averageAttendance": 87.5,
  "popularLessonType": "CODE",
  "popularTimeSlot": "Morning"
}
```

#### Get Exam Statistics
```bash
curl "http://localhost:3007/api/analytics/exams?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "totalExams": 100,
  "passRate": 75.5,
  "failRate": 24.5,
  "averageScore": 82.3,
  "typeBreakdown": {
    "theory": {
      "passed": 55,
      "failed": 15
    },
    "practical": {
      "passed": 25,
      "failed": 5
    }
  }
}
```

#### Get Student Engagement
```bash
curl "http://localhost:3007/api/analytics/students/engagement?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "studentId": "uuid-1",
    "totalBookings": 25,
    "attendanceRate": 92.0,
    "lastBookingDate": "2024-12-15T10:00:00.000Z"
  },
  {
    "studentId": "uuid-2",
    "totalBookings": 18,
    "attendanceRate": 88.5,
    "lastBookingDate": "2024-12-10T14:00:00.000Z"
  }
]
```

#### Get Instructor Performance
```bash
curl "http://localhost:3007/api/analytics/instructors/performance?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "instructorId": "uuid-1",
    "name": "John Doe",
    "totalLessons": 150,
    "completedLessons": 140,
    "averageRating": 4.8,
    "revenue": 7500.00
  },
  {
    "instructorId": "uuid-2",
    "name": "Jane Smith",
    "totalLessons": 120,
    "completedLessons": 115,
    "averageRating": 4.9,
    "revenue": 6000.00
  }
]
```

#### Get Dashboard Summary (Admin Only)
```bash
curl "http://localhost:3007/api/analytics/dashboard?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "revenue": {
    "totalRevenue": 15000.00,
    "lessonRevenue": 10000.00,
    "examRevenue": 5000.00,
    "periodStart": "2024-01-01T00:00:00.000Z",
    "periodEnd": "2024-12-31T23:59:59.999Z"
  },
  "lessonStats": {
    "totalLessons": 250,
    "completedLessons": 215,
    "cancelledLessons": 35,
    "averageAttendance": 87.5,
    "popularLessonType": "CODE",
    "popularTimeSlot": "Morning"
  },
  "examStats": {
    "totalExams": 100,
    "passRate": 75.5,
    "failRate": 24.5,
    "averageScore": 82.3,
    "typeBreakdown": {
      "theory": { "passed": 55, "failed": 15 },
      "practical": { "passed": 25, "failed": 5 }
    }
  }
}
```

#### Common Query Parameters

All analytics endpoints support these query parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | ISO Date | Yes | Start of reporting period |
| `endDate` | ISO Date | Yes | End of reporting period |
| `schoolId` | UUID | No | Filter by specific school |
| `instructorId` | UUID | No | Filter by specific instructor (revenue only) |
| `studentId` | UUID | No | Filter by specific student (engagement only) |

**Example with multiple filters:**
```bash
curl "http://localhost:3007/api/analytics/revenue?\
startDate=2024-01-01&\
endDate=2024-12-31&\
schoolId=$SCHOOL_ID&\
instructorId=$INSTRUCTOR_ID" \
  -H "Authorization: Bearer $TOKEN"
```

#### Date Range Examples

**Last 30 days:**
```bash
START_DATE=$(date -u -d '30 days ago' +%Y-%m-%d)
END_DATE=$(date -u +%Y-%m-%d)

curl "http://localhost:3007/api/analytics/revenue?startDate=$START_DATE&endDate=$END_DATE" \
  -H "Authorization: Bearer $TOKEN"
```

**Current month:**
```bash
START_DATE=$(date -u +%Y-%m-01)
END_DATE=$(date -u +%Y-%m-%d)

curl "http://localhost:3007/api/analytics/lessons?startDate=$START_DATE&endDate=$END_DATE" \
  -H "Authorization: Bearer $TOKEN"
```

**Last quarter (Q4 2024):**
```bash
curl "http://localhost:3007/api/analytics/exams?\
startDate=2024-10-01&\
endDate=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Full year:**
```bash
curl "http://localhost:3007/api/analytics/dashboard?\
startDate=2024-01-01&\
endDate=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Complete Workflow Example

### Student Journey: From Registration to Exam
```bash
# 1. Student registers
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123","role":"student"}'

# 2. Student logs in
STUDENT_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 3. Student views available lessons
curl "http://localhost:3003/api/lessons?type=CODE&status=scheduled"

# 4. Student books a lesson
curl -X POST http://localhost:3003/api/lessons/LESSON_ID/book \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d '{"studentId":"STUDENT_ID"}'

# 5. Student makes payment
curl -X POST http://localhost:3005/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d '{
    "studentId":"STUDENT_ID",
    "referenceType":"lesson",
    "referenceId":"LESSON_ID",
    "amount":50.00,
    "method":"online"
  }'

# 6. After completing 20 lessons, check exam eligibility
curl "http://localhost:3004/api/exams/students/STUDENT_ID/eligibility?type=theory" \
  -H "Authorization: Bearer $STUDENT_TOKEN"

# 7. Register for exam
curl -X POST http://localhost:3004/api/exams/EXAM_ID/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d '{"studentId":"STUDENT_ID"}'

# 8. Admin views school performance analytics
curl "http://localhost:3007/api/analytics/dashboard?\
startDate=2024-01-01&endDate=2024-12-31&schoolId=$SCHOOL_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Admin Monthly Report Generation
```bash
#!/bin/bash
TOKEN="your_admin_token"
SCHOOL_ID="your_school_id"
START_DATE="2024-12-01"
END_DATE="2024-12-31"

echo "📊 Generating Monthly Report for December 2024"
echo "=============================================="

# Revenue
echo -e "\n💰 REVENUE REPORT:"
curl -s "http://localhost:3007/api/analytics/revenue?\
startDate=$START_DATE&endDate=$END_DATE&schoolId=$SCHOOL_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Lessons
echo -e "\n📚 LESSON STATISTICS:"
curl -s "http://localhost:3007/api/analytics/lessons?\
startDate=$START_DATE&endDate=$END_DATE&schoolId=$SCHOOL_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Exams
echo -e "\n🎓 EXAM STATISTICS:"
curl -s "http://localhost:3007/api/analytics/exams?\
startDate=$START_DATE&endDate=$END_DATE&schoolId=$SCHOOL_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Top Instructors
echo -e "\n👨‍🏫 TOP INSTRUCTORS:"
curl -s "http://localhost:3007/api/analytics/instructors/performance?\
startDate=$START_DATE&endDate=$END_DATE&schoolId=$SCHOOL_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.[:5]'

# Active Students
echo -e "\n👥 MOST ACTIVE STUDENTS:"
curl -s "http://localhost:3007/api/analytics/students/engagement?\
startDate=$START_DATE&endDate=$END_DATE&schoolId=$SCHOOL_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.[:5]'
```

---

## Postman Collection

Import this collection into Postman:
```json
{
  "info": {
    "name": "Driving School Platform",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost"
    },
    {
      "key": "adminToken",
      "value": ""
    },
    {
      "key": "schoolId",
      "value": ""
    }
  ]
}
```

---

## Troubleshooting

### Service Not Responding
```bash
# Check if service is running
docker-compose ps

# View service logs
docker-compose logs auth-service
docker-compose logs analytics-service

# Restart service
docker-compose restart auth-service
```

### Authentication Issues
```bash
# Verify token is valid
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Get a fresh token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@drivingschool.com","password":"admin123"}'
```

### Database Issues
```bash
# Check database
docker exec -it driving-school-postgres psql -U admin -d driving_school

# Re-run migrations
./scripts/quick-start.sh
```

### Analytics Cache Issues
```bash
# Connect to Redis
docker exec -it driving-school-redis redis-cli

# Check cached analytics keys
KEYS "analytics:*"

# Clear analytics cache
KEYS "analytics:*" | xargs redis-cli DEL

# Verify cache is working
GET "analytics:revenue:2024-01-01:2024-12-31:all:all:all"
```

---

## Tools

### HTTPie (Better than curl)
```bash
# Install
brew install httpie  # macOS
apt install httpie   # Ubuntu

# Usage
http POST localhost:3001/api/auth/login email=admin@drivingschool.com password=admin123

# With token
http GET localhost:3002/api/schools Authorization:"Bearer $TOKEN"

# Analytics with query params
http GET localhost:3007/api/analytics/revenue startDate==2024-01-01 endDate==2024-12-31 Authorization:"Bearer $TOKEN"
```

### Postman
Download: https://www.postman.com/downloads/

### Insomnia
Download: https://insomnia.rest/download

---

## Performance Notes

### Analytics Service
- All analytics endpoints use **Redis caching** (1 hour TTL by default)
- First request may take 2-3 seconds for large datasets
- Subsequent requests return instantly from cache
- Cache is automatically invalidated when new data is added

### Rate Limiting
- Auth endpoints: 5 requests per 15 minutes per IP
- Analytics endpoints: 100 requests per 15 minutes per IP
- Other endpoints: 100 requests per 15 minutes per IP

---

## Next Steps

1. **Mobile App Testing**: Use React Native app to test push notifications
2. **Load Testing**: Use K6 to test performance
3. **Security Testing**: Use OWASP ZAP
4. **API Documentation**: Generate OpenAPI/Swagger docs

## Support

- View logs: `docker-compose logs -f`
- Check health: `curl http://localhost:3001/health`
- Database: `docker exec -it driving-school-postgres psql -U admin -d driving_school`
- Redis: `docker exec -it driving-school-redis redis-cli`

## All Services Health Check

```bash
#!/bin/bash
echo "🏥 Health Check - All Services"
echo "=============================="

services=(
  "3001:auth"
  "3002:school"
  "3003:lesson"
  "3004:exam"
  "3005:payment"
  "3006:notification"
  "3007:analytics"
)

for service in "${services[@]}"; do
  IFS=':' read -r port name <<< "$service"
  if curl -sf "http://localhost:${port}/health" > /dev/null 2>&1; then
    echo "✅ ${name} service (port ${port})"
  else
    echo "❌ ${name} service (port ${port})"
  fi
done
```