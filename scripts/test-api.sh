#!/bin/bash
set -e

BASE_URL="http://localhost"
AUTH_URL="${BASE_URL}:3001/api/auth"
SCHOOL_URL="${BASE_URL}:3002/api/schools"
LESSON_URL="${BASE_URL}:3003/api/lessons"
EXAM_URL="${BASE_URL}:3004/api/exams"
PAYMENT_URL="${BASE_URL}:3005/api/payments"
NOTIFICATION_URL="${BASE_URL}:3006/api/notifications"

echo "🧪 Testing Driving School Platform API"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Test 1: Login as Admin
echo "Test 1: Admin Login"
echo "-------------------"
ADMIN_RESPONSE=$(curl -s -X POST "${AUTH_URL}/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@drivingschool.com",
    "password": "admin123"
  }')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    success "Admin login successful"
    info "Admin Token: ${ADMIN_TOKEN:0:20}..."
else
    error "Admin login failed"
    echo "Response: $ADMIN_RESPONSE"
    exit 1
fi
echo ""

# Test 2: Create a School
echo "Test 2: Create School"
echo "--------------------"
SCHOOL_RESPONSE=$(curl -s -X POST "${SCHOOL_URL}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Elite Driving School",
    "address": "123 Main St, Paris, France",
    "phone": "+33 1 23 45 67 89",
    "email": "contact@eliteds.com"
  }')

SCHOOL_ID=$(echo $SCHOOL_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$SCHOOL_ID" ]; then
    success "School created successfully"
    info "School ID: $SCHOOL_ID"
else
    error "School creation failed"
    echo "Response: $SCHOOL_RESPONSE"
fi
echo ""

# Test 3: Get All Schools
echo "Test 3: Get All Schools"
echo "----------------------"
SCHOOLS=$(curl -s "${SCHOOL_URL}")
SCHOOL_COUNT=$(echo $SCHOOLS | grep -o '"id"' | wc -l)

if [ $SCHOOL_COUNT -gt 0 ]; then
    success "Retrieved $SCHOOL_COUNT school(s)"
else
    error "No schools found"
fi
echo ""

# Test 4: Register Student
echo "Test 4: Register New Student"
echo "---------------------------"
STUDENT_RESPONSE=$(curl -s -X POST "${AUTH_URL}/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newstudent@test.com",
    "password": "student123",
    "role": "student"
  }')

STUDENT_TOKEN=$(echo $STUDENT_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$STUDENT_TOKEN" ]; then
    success "Student registered successfully"
    info "Student Token: ${STUDENT_TOKEN:0:20}..."
else
    error "Student registration failed"
    echo "Response: $STUDENT_RESPONSE"
fi
echo ""

# Test 5: Login as Student
echo "Test 5: Student Login"
echo "--------------------"
STUDENT_LOGIN=$(curl -s -X POST "${AUTH_URL}/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "student123"
  }')

STUDENT_TOKEN=$(echo $STUDENT_LOGIN | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$STUDENT_TOKEN" ]; then
    success "Student login successful"
else
    error "Student login failed"
fi
echo ""

# Test 6: Get Current User
echo "Test 6: Get Current User Info"
echo "-----------------------------"
USER_INFO=$(curl -s "${AUTH_URL}/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

USER_EMAIL=$(echo $USER_INFO | grep -o '"email":"[^"]*' | cut -d'"' -f4)

if [ -n "$USER_EMAIL" ]; then
    success "User info retrieved: $USER_EMAIL"
else
    error "Failed to get user info"
fi
echo ""

# Test 7: Health Check All Services
echo "Test 7: Health Check All Services"
echo "---------------------------------"
SERVICES=("3001:Auth" "3002:School" "3003:Lesson" "3004:Exam" "3005:Payment" "3006:Notification")

for service in "${SERVICES[@]}"; do
    IFS=':' read -r port name <<< "$service"
    HEALTH=$(curl -s "http://localhost:${port}/health")
    if echo "$HEALTH" | grep -q "ok"; then
        success "$name Service is healthy"
    else
        error "$name Service is unhealthy"
    fi
done
echo ""

# Summary
echo "════════════════════════════════════════════════════════════"
echo "📊 Test Summary"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "✅ Tests Completed"
echo ""
echo "🔑 Admin Token (use for authenticated requests):"
echo "$ADMIN_TOKEN"
echo ""
echo "🔑 Student Token:"
echo "$STUDENT_TOKEN"
echo ""
echo "🏫 School ID (use for creating lessons/exams):"
echo "$SCHOOL_ID"
echo ""
echo "📖 More examples in API_TESTING.md"
echo "════════════════════════════════════════════════════════════"
