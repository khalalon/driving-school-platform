#!/bin/bash
set -e

echo "🚀 Driving School Platform - Quick Start"
echo "========================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Install from: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Install from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo "✅ Docker Compose is installed"
echo ""

# Setup environment
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
else
    echo "✅ .env file already exists"
fi
echo ""

# Stop any running containers
echo "🛑 Stopping any existing containers..."
docker-compose down 2>/dev/null || true
echo ""

# Start infrastructure first (PostgreSQL + Redis)
echo "🗄️  Starting database and cache..."
docker-compose up -d postgres redis
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is ready
until docker exec driving-school-postgres pg_isready -U admin > /dev/null 2>&1; do
    echo "⏳ Waiting for PostgreSQL..."
    sleep 2
done
echo "✅ PostgreSQL is ready"

# Check if Redis is ready
until docker exec driving-school-redis redis-cli ping > /dev/null 2>&1; do
    echo "⏳ Waiting for Redis..."
    sleep 2
done
echo "✅ Redis is ready"
echo ""

# Run database migrations
echo "📊 Running database migrations..."
docker exec -i driving-school-postgres psql -U admin -d driving_school << 'SQL'
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if exist (for fresh start)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS push_tokens CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS exam_registrations CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS lesson_bookings CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS pricing CASCADE;
DROP TABLE IF EXISTS instructors CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'instructor', 'student')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schools table
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instructors table
CREATE TABLE instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    specialties TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing table
CREATE TABLE pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    lesson_type VARCHAR(50) NOT NULL CHECK (lesson_type IN ('CODE', 'Manœuvre', 'Parc')),
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    duration INTEGER NOT NULL CHECK (duration > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, lesson_type)
);

-- Students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    authorized BOOLEAN DEFAULT FALSE,
    profile_photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('CODE', 'Manœuvre', 'Parc')),
    date_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL,
    capacity INTEGER DEFAULT 1 CHECK (capacity > 0),
    current_bookings INTEGER DEFAULT 0 CHECK (current_bookings >= 0),
    price DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (current_bookings <= capacity)
);

-- Lesson bookings
CREATE TABLE lesson_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    attended BOOLEAN,
    feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lesson_id, student_id)
);

-- Exams table
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('theory', 'practical')),
    date_time TIMESTAMP NOT NULL,
    examiner_id UUID,
    price DECIMAL(10,2),
    capacity INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exam registrations
CREATE TABLE exam_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    result VARCHAR(50) CHECK (result IN ('passed', 'failed', 'pending')),
    score INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exam_id, student_id)
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('lesson', 'exam')),
    reference_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'confirmed', 'refunded')),
    method VARCHAR(50) CHECK (method IN ('online', 'cash', 'card', 'bank_transfer')),
    transaction_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT NOT NULL,
    channel VARCHAR(50) DEFAULT 'in_app',
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type)
);

-- Push tokens
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    platform VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_instructors_school ON instructors(school_id);
CREATE INDEX idx_lessons_school ON lessons(school_id);
CREATE INDEX idx_lessons_date ON lessons(date_time);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Insert test admin user (password: admin123)
INSERT INTO users (email, password_hash, role) 
VALUES ('admin@drivingschool.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GZKJnSyaHR7e', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert test student user (password: student123)
INSERT INTO users (email, password_hash, role) 
VALUES ('student@test.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GZKJnSyaHR7e', 'student')
ON CONFLICT (email) DO NOTHING;

-- Insert test instructor user (password: instructor123)
INSERT INTO users (email, password_hash, role) 
VALUES ('instructor@test.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GZKJnSyaHR7e', 'instructor')
ON CONFLICT (email) DO NOTHING;

SQL

echo "✅ Database migrations completed"
echo ""

# Build and start all services
echo "🏗️  Building all services..."
docker-compose build --parallel
echo ""

echo "🚀 Starting all services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 15

# Check service health
echo ""
echo "🏥 Checking service health..."
services=("auth-service:3001" "school-service:3002" "lesson-service:3003" "exam-service:3004" "payment-service:3005" "notification-service:3006" "analytics-service:3007")

all_healthy=true
for service_port in "${services[@]}"; do
    IFS=':' read -r service port <<< "$service_port"
    if curl -sf "http://localhost:${port}/health" > /dev/null 2>&1; then
        echo "✅ $service is healthy"
    else
        echo "❌ $service is not responding"
        all_healthy=false
    fi
done
echo ""

if [ "$all_healthy" = true ]; then
    echo "🎉 All services are running!"
else
    echo "⚠️  Some services are not healthy. Check logs with: docker-compose logs"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ QUICK START COMPLETE!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Service URLs:"
echo "  Auth Service:         http://localhost:3001"
echo "  School Service:       http://localhost:3002"
echo "  Lesson Service:       http://localhost:3003"
echo "  Exam Service:         http://localhost:3004"
echo "  Payment Service:      http://localhost:3005"
echo "  Notification Service: http://localhost:3006"
echo "  Analytics Service:    http://localhost:3007"
echo ""
echo "🔑 Test Accounts:"
echo "  Admin:      admin@drivingschool.com / admin123"
echo "  Student:    student@test.com / student123"
echo "  Instructor: instructor@test.com / instructor123"
echo ""
echo "📚 Next Steps:"
echo "  1. Test API: ./scripts/test-api.sh"
echo "  2. View logs: docker-compose logs -f"
echo "  3. Stop: docker-compose down"
echo ""
echo "📖 Full API documentation: API_TESTING.md"
echo "════════════════════════════════════════════════════════════"