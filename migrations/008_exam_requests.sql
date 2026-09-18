-- ============================================
-- EXAMENS : UNE DEMANDE D'ÉLÈVE (tâche 3.4 ; D-01, D-26, D-33)
-- ============================================
-- L'examen naît d'une demande de l'élève (pending, preferred_date, message), adressée à l'école
-- (pas d'instructeur attitré) ; l'école la planifie (scheduled, date_time, location), la refuse
-- (rejected, rejection_reason) ou enregistre le résultat (completed, result, score, notes).
-- Les colonnes de l'inscription individuelle passent d'exam_registrations à exams ; la table
-- exam_registrations est conservée telle quelle (plus alimentée, retirée plus tard).
-- Idempotent : gardes IF EXISTS / IF NOT EXISTS, backfills sur les seules lignes non traitées.

-- 1. Colonnes de la demande et de l'examen individuel.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS preferred_date TIMESTAMP;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled', 'rejected'));
ALTER TABLE exams ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS result VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pending', 'passed', 'failed'));
ALTER TABLE exams ADD COLUMN IF NOT EXISTS score INTEGER CHECK (score >= 0 AND score <= 100);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- La date de session est fixée à la planification (X3) : inconnue tant que la demande est pending.
ALTER TABLE exams ALTER COLUMN date_time DROP NOT NULL;

-- 2. Reprise des inscriptions existantes (modèle « session + inscriptions ») :
--    a. la première inscription d'une session renseigne l'examen existant ;
--    b. chaque inscription supplémentaire devient une copie de l'examen pour cet élève ;
--    c. les sessions sans inscription n'ont pas d'élève : supprimées.
--    Une session passée avec résultat est completed, sinon scheduled.
WITH ranked AS (
    SELECT er.*, row_number() OVER (PARTITION BY er.exam_id ORDER BY er.created_at, er.id) AS rn
    FROM exam_registrations er
)
UPDATE exams e
SET student_id = r.student_id,
    result = COALESCE(r.result, 'pending'),
    score = r.score,
    notes = r.notes,
    paid = COALESCE(r.paid, FALSE),
    amount = r.amount,
    payment_date = r.payment_date,
    payment_method = r.payment_method,
    status = CASE WHEN r.result IN ('passed', 'failed') THEN 'completed' ELSE 'scheduled' END
FROM ranked r
WHERE r.exam_id = e.id AND r.rn = 1 AND e.student_id IS NULL;

WITH ranked AS (
    SELECT er.*, row_number() OVER (PARTITION BY er.exam_id ORDER BY er.created_at, er.id) AS rn
    FROM exam_registrations er
)
INSERT INTO exams (school_id, type, date_time, examiner_id, price, capacity, student_id, result,
                   score, notes, paid, amount, payment_date, payment_method, status,
                   created_at, updated_at)
SELECT e.school_id, e.type, e.date_time, e.examiner_id, e.price, e.capacity, r.student_id,
       COALESCE(r.result, 'pending'), r.score, r.notes, COALESCE(r.paid, FALSE), r.amount,
       r.payment_date, r.payment_method,
       CASE WHEN r.result IN ('passed', 'failed') THEN 'completed' ELSE 'scheduled' END,
       e.created_at, e.updated_at
FROM ranked r
JOIN exams e ON e.id = r.exam_id
WHERE r.rn > 1
  AND e.student_id IS DISTINCT FROM r.student_id
  AND NOT EXISTS (
      SELECT 1 FROM exams d
      WHERE d.student_id = r.student_id AND d.school_id = e.school_id AND d.type = e.type
        AND d.date_time IS NOT DISTINCT FROM e.date_time
  );

DELETE FROM exams WHERE student_id IS NULL;
ALTER TABLE exams ALTER COLUMN student_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exams_student ON exams(student_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_preferred_date ON exams(preferred_date);

COMMENT ON TABLE exams IS 'Une demande d''examen = un examen = un élève (D-01, D-33)';
