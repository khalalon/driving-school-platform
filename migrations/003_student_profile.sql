-- ============================================
-- STUDENT PROFILE ENHANCEMENT MIGRATION
-- ============================================

-- Add payment tracking to lesson bookings
ALTER TABLE lesson_bookings ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT FALSE;
ALTER TABLE lesson_bookings ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP;
ALTER TABLE lesson_bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE lesson_bookings ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);

-- Add payment tracking to exam registrations
ALTER TABLE exam_registrations ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT FALSE;
ALTER TABLE exam_registrations ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP;
ALTER TABLE exam_registrations ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE exam_registrations ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);

-- Add additional student profile fields
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT; -- Instructor's private notes

-- Create indexes for payment queries
CREATE INDEX IF NOT EXISTS idx_bookings_paid ON lesson_bookings(paid);
CREATE INDEX IF NOT EXISTS idx_exam_regs_paid ON exam_registrations(paid);

-- Comments
COMMENT ON COLUMN lesson_bookings.paid IS 'Whether the student has paid for this lesson';
COMMENT ON COLUMN lesson_bookings.amount IS 'Amount paid for this lesson';
COMMENT ON COLUMN exam_registrations.paid IS 'Whether the student has paid for this exam';
COMMENT ON COLUMN exam_registrations.amount IS 'Amount paid for this exam';
COMMENT ON COLUMN students.notes IS 'Instructor private notes about the student';