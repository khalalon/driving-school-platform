-- ============================================
-- ANNULATION D'UNE LEÇON : MOTIF ET AUTEUR (tâche 5.3, L3, D-24)
-- ============================================
-- `rejection_reason` reste le motif d'un refus (L6). Une annulation (L3) garde son motif et son
-- auteur (users.id : l'élève ou l'instructeur), information nécessaire le jour où Q-17 (sort
-- d'une leçon payée annulée) sera tranchée — la réponse peut dépendre de qui annule.
-- Idempotent.

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL;
