-- ============================================
-- LEÇONS : UNE DEMANDE = UNE LEÇON = UN ÉLÈVE (tâche 3.3 ; D-21, D-32, D-34)
-- ============================================
-- La leçon naît d'une demande de l'élève (pending, requested_date) puis est planifiée par
-- l'instructeur qui l'approuve (scheduled, scheduled_date, instructor_id). Les colonnes de la
-- réservation individuelle (présence, paiement) passent de lesson_bookings à lessons ; la table
-- lesson_bookings est conservée telle quelle (plus alimentée, retirée plus tard).
-- Idempotent : gardes IF EXISTS / IF NOT EXISTS, backfills sur les seules lignes non traitées.

-- 1. Statut : pending par défaut, + pending / rejected.
UPDATE lessons SET status = 'scheduled' WHERE status IS NULL;
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_status_check;
ALTER TABLE lessons ADD CONSTRAINT lessons_status_check
    CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled', 'rejected'));
ALTER TABLE lessons ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE lessons ALTER COLUMN status SET NOT NULL;

-- 2. Deux dates distinctes : date_time devient scheduled_date (nullable), requested_date ajoutée.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'lessons' AND column_name = 'date_time') THEN
        ALTER TABLE lessons RENAME COLUMN date_time TO scheduled_date;
    END IF;
END $$;
ALTER TABLE lessons ALTER COLUMN scheduled_date DROP NOT NULL;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS requested_date TIMESTAMP;
ALTER INDEX IF EXISTS idx_lessons_date RENAME TO idx_lessons_scheduled_date;
CREATE INDEX IF NOT EXISTS idx_lessons_requested_date ON lessons(requested_date);

-- Durée et prix fixés à l'approbation (L5) : inconnus tant que la demande est pending.
ALTER TABLE lessons ALTER COLUMN duration_minutes DROP NOT NULL;

-- 3. Colonnes de la demande et de la leçon individuelle.
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS preferred_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS attended BOOLEAN;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- 4. Reprise des réservations existantes (modèle « créneau + réservations ») :
--    a. la première réservation d'un créneau renseigne la leçon existante ;
--    b. chaque réservation supplémentaire devient une copie de la leçon pour cet élève ;
--    c. les créneaux sans réservation n'ont pas d'élève : supprimés.
WITH ranked AS (
    SELECT lb.*, row_number() OVER (PARTITION BY lb.lesson_id ORDER BY lb.created_at, lb.id) AS rn
    FROM lesson_bookings lb
)
UPDATE lessons l
SET student_id = r.student_id, attended = r.attended, feedback = r.feedback, rating = r.rating,
    paid = COALESCE(r.paid, FALSE), amount = r.amount, payment_date = r.payment_date,
    payment_method = r.payment_method
FROM ranked r
WHERE r.lesson_id = l.id AND r.rn = 1 AND l.student_id IS NULL;

WITH ranked AS (
    SELECT lb.*, row_number() OVER (PARTITION BY lb.lesson_id ORDER BY lb.created_at, lb.id) AS rn
    FROM lesson_bookings lb
)
INSERT INTO lessons (school_id, instructor_id, type, scheduled_date, duration_minutes, capacity,
                     current_bookings, price, status, student_id, attended, feedback, rating, paid,
                     amount, payment_date, payment_method, created_at, updated_at)
SELECT l.school_id, l.instructor_id, l.type, l.scheduled_date, l.duration_minutes, 1, 1, l.price,
       l.status, r.student_id, r.attended, r.feedback, r.rating, COALESCE(r.paid, FALSE), r.amount,
       r.payment_date, r.payment_method, l.created_at, l.updated_at
FROM ranked r
JOIN lessons l ON l.id = r.lesson_id
WHERE r.rn > 1
  AND l.student_id IS DISTINCT FROM r.student_id
  AND NOT EXISTS (
      SELECT 1 FROM lessons d
      WHERE d.student_id = r.student_id AND d.school_id = l.school_id AND d.type = l.type
        AND d.scheduled_date IS NOT DISTINCT FROM l.scheduled_date
  );

DELETE FROM lessons WHERE student_id IS NULL;
ALTER TABLE lessons ALTER COLUMN student_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_student ON lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_preferred_instructor ON lessons(preferred_instructor_id);

-- 5. Toutes les leçons sont individuelles (D-34) : capacité forcée à 1, un élève par leçon.
UPDATE lessons SET capacity = 1, current_bookings = 1 WHERE capacity <> 1 OR current_bookings <> 1;
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_capacity_check;
ALTER TABLE lessons ADD CONSTRAINT lessons_capacity_check CHECK (capacity = 1);
ALTER TABLE lessons ALTER COLUMN capacity SET DEFAULT 1;
ALTER TABLE lessons ALTER COLUMN capacity SET NOT NULL;
ALTER TABLE lessons ALTER COLUMN current_bookings SET DEFAULT 1;
ALTER TABLE lessons ALTER COLUMN current_bookings SET NOT NULL;

COMMENT ON TABLE lessons IS 'Une demande de leçon = une leçon = un élève (D-21, D-34)';
