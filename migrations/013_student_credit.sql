-- ============================================
-- AVOIR DE L'ÉLÈVE (D-40, tâche 7.2) — et absence non facturée (D-41, tâche 7.3)
-- ============================================
-- `students.credit` : argent déjà versé par l'élève pour une leçon qu'il n'a pas eue (annulée
-- après paiement, ou absence après prépaiement), imputé automatiquement sur sa prochaine leçon
-- planifiée (L5 / L4), dans la devise de l'école (D-43).
-- `lessons.credit_applied` : part du prix de la leçon couverte par ce crédit ; `amount` reste
-- l'argent effectivement versé pour la leçon (0 quand le crédit couvre tout, méthode 'credit').
-- Idempotent.

ALTER TABLE students ADD COLUMN IF NOT EXISTS credit NUMERIC(10, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'students_credit_check'
    ) THEN
        ALTER TABLE students ADD CONSTRAINT students_credit_check CHECK (credit >= 0);
    END IF;
END $$;

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS credit_applied NUMERIC(10, 2) NOT NULL DEFAULT 0;
