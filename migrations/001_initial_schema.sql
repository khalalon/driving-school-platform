-- ============================================
-- DRIVING SCHOOL PLATFORM - INITIAL SCHEMA
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AUTH SERVICE TABLES
-- ============================================

-- Users table (Auth Service)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'instructor', 'student')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- SCHOOL SERVICE TABLES
-- ============================================

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_name ON schools(name);
CREATE INDEX idx_schools_email ON schools(email);

-- Instructors table
CREATE TABLE IF NOT EXISTS instructors (
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

CREATE INDEX idx_instructors_school ON instructors(school_id);
CREATE INDEX idx_instructors_user ON instructors(user_id);
CREATE INDEX idx_instructors_license ON instructors(license_number);

-- Pricing table
CREATE TABLE IF NOT EXISTS pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    lesson_type VARCHAR(50) NOT NULL CHECK (lesson_type IN ('CODE', 'Manœuvre', 'Parc')),
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    duration INTEGER NOT NULL CHECK (duration > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, lesson_type)
);

CREATE INDEX idx_pricing_school ON pricing(school_id);
CREATE INDEX idx_pricing_type ON pricing(lesson_type);

-- ============================================
-- LESSON SERVICE TABLES (Placeholder for next service)
-- ============================================

-- Students table
CREATE TABLE IF NOT EXISTS students (
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

CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_authorized ON students(authorized);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
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

CREATE INDEX idx_lessons_school ON lessons(school_id);
CREATE INDEX idx_lessons_instructor ON lessons(instructor_id);
CREATE INDEX idx_lessons_date ON lessons(date_time);
CREATE INDEX idx_lessons_status ON lessons(status);
CREATE INDEX idx_lessons_type ON lessons(type);

-- Lesson bookings
CREATE TABLE IF NOT EXISTS lesson_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    attended BOOLEAN,
    feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lesson_id, student_id)
);

CREATE INDEX idx_bookings_lesson ON lesson_bookings(lesson_id);
CREATE INDEX idx_bookings_student ON lesson_bookings(student_id);
CREATE INDEX idx_bookings_attended ON lesson_bookings(attended);

-- ============================================
-- EXAM SERVICE TABLES
-- ============================================

-- Exams table
CREATE TABLE IF NOT EXISTS exams (
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

CREATE INDEX idx_exams_school ON exams(school_id);
CREATE INDEX idx_exams_date ON exams(date_time);
CREATE INDEX idx_exams_type ON exams(type);

-- Exam registrations
CREATE TABLE IF NOT EXISTS exam_registrations (
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

CREATE INDEX idx_exam_regs_exam ON exam_registrations(exam_id);
CREATE INDEX idx_exam_regs_student ON exam_registrations(student_id);
CREATE INDEX idx_exam_regs_result ON exam_registrations(result);

-- ============================================
-- PAYMENT SERVICE TABLES
-- ============================================

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('lesson', 'exam')),
    reference_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'confirmed')),
    method VARCHAR(50) CHECK (method IN ('online', 'cash', 'card', 'bank_transfer')),
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_reference ON payments(reference_type, reference_id);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);

-- ============================================
-- NOTIFICATION SERVICE TABLES
-- ============================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON instructors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_updated_at BEFORE UPDATE ON pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_regs_updated_at BEFORE UPDATE ON exam_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Insert a test admin user (password: admin123)
INSERT INTO users (email, password_hash, role) 
VALUES ('admin@drivingschool.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GZKJnSyaHR7e', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Comments for documentation
COMMENT ON DATABASE driving_school IS 'Driving School Management Platform Database';
COMMENT ON TABLE users IS 'User authentication and authorization';
COMMENT ON TABLE schools IS 'Driving school information';
COMMENT ON TABLE instructors IS 'Driving instructors linked to schools';
COMMENT ON TABLE students IS 'Students registered with schools';
COMMENT ON TABLE lessons IS 'Scheduled driving lessons';
COMMENT ON TABLE exams IS 'Theory and practical exams';
COMMENT ON TABLE payments IS 'Payment transactions';
COMMENT ON TABLE notifications IS 'User notifications';