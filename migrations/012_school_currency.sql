-- ============================================
-- DEVISE PAR ÉCOLE (D-43, tâche 7.1)
-- ============================================
-- Chaque école affiche et encaisse dans sa propre devise (code ISO 4217, ex. TND, EUR).
-- Les écoles pilotes sont tunisiennes : TND par défaut, y compris pour les lignes existantes.
-- Tous les montants d'une école (pricing, lessons, exams) sont dans cette devise.
-- Idempotent.

ALTER TABLE schools ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'TND';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'schools_currency_check'
    ) THEN
        ALTER TABLE schools
            ADD CONSTRAINT schools_currency_check CHECK (currency ~ '^[A-Z]{3}$');
    END IF;
END $$;
