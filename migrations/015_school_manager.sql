-- ============================================
-- GÉRANT DE L'ÉCOLE (D-54, D-57, tâche 14.1)
-- ============================================
-- Le gérant reste un instructeur (il donne des leçons comme les autres) : un drapeau sur sa
-- fiche `instructors`, pas un nouveau rôle dans `users.role` (D-54).
--
-- On devient gérant par un code d'inscription gérant (`school_codes.role = 'manager'`, émis par
-- le script d'onboarding) ou par désignation de l'administrateur (`scripts/set-manager.sh`) —
-- D-57. Un code `manager` crée un compte `users.role = 'instructor'` avec `is_manager = true`.
--
-- La contrainte de 002 sur `school_codes.role` n'admettait que 'instructor' et 'student' :
-- elle est recréée ici (002 n'est jamais modifiée). Idempotent.

ALTER TABLE instructors ADD COLUMN IF NOT EXISTS is_manager BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE school_codes DROP CONSTRAINT IF EXISTS school_codes_role_check;
ALTER TABLE school_codes
    ADD CONSTRAINT school_codes_role_check CHECK (role IN ('instructor', 'student', 'manager'));

COMMENT ON COLUMN instructors.is_manager IS
    'Gérant de l''école (D-54) : droits réservés par D-56 (fiche et tarifs, dossier, caisse, forfaits, tableau de bord, flotte)';
