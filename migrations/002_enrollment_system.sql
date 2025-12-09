-- ============================================
-- ENROLLMENT SYSTEM MIGRATION
-- ============================================

-- Add school invitation codes table
CREATE TABLE IF NOT EXISTS school_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('instructor', 'student')),
    max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
    uses_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP DEFAULT NULL, -- NULL = never expires
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_school_codes_code ON school_codes(code);
CREATE INDEX idx_school_codes_school ON school_codes(school_id);
CREATE INDEX idx_school_codes_active ON school_codes(is_active);

-- Student enrollment requests table
CREATE TABLE IF NOT EXISTS enrollment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT, -- Student's message to school
    rejection_reason TEXT, -- Admin's reason if rejected
    processed_by UUID REFERENCES users(id), -- Instructor/admin who processed
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, school_id) -- One request per student per school
);

CREATE INDEX idx_enrollment_requests_student ON enrollment_requests(student_id);
CREATE INDEX idx_enrollment_requests_school ON enrollment_requests(school_id);
CREATE INDEX idx_enrollment_requests_status ON enrollment_requests(status);

-- Update students table to track enrollment better
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_date TIMESTAMP;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_request_id UUID REFERENCES enrollment_requests(id);

-- Trigger to auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_school_codes_updated_at BEFORE UPDATE ON school_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollment_requests_updated_at BEFORE UPDATE ON enrollment_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed some school codes for testing
-- Generate codes for schools (you'll need to replace with actual school IDs)
-- Example: INSERT INTO school_codes (school_id, code, role) VALUES ('school-uuid', 'INST-ABC123', 'instructor');

COMMENT ON TABLE school_codes IS 'Invitation codes for instructors and students to join schools';
COMMENT ON TABLE enrollment_requests IS 'Student requests to enroll in driving schools';
