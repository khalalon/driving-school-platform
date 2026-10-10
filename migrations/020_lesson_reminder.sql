-- ============================================
-- RAPPEL DE LEÇON (D-65, tâche 17.5)
-- ============================================
-- La veille à 18 h (heure de l'école, Africa/Tunis), l'élève reçoit un rappel pour chaque leçon
-- planifiée le lendemain — **un seul**. `reminder_sent_at` en est la preuve : la tâche planifiée
-- ne retient que les leçons où il est nul, et le renseigne dans la même instruction qui les
-- sélectionne. Deux instances de l'API qui passeraient au même moment ne peuvent donc pas
-- envoyer deux fois le même rappel, verrou Redis ou pas.
--
-- Une leçon replanifiée ou annulée n'a pas à « remettre » son rappel : une leçon annulée n'est
-- plus `scheduled`, et une approbation crée la date en même temps que la leçon planifiée.
--
-- L'index partiel sert la requête de la tâche (toutes les 15 min) : seules les leçons planifiées
-- et pas encore rappelées y figurent, la table peut grossir sans la ralentir. Idempotent.

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_lessons_reminder_due
    ON lessons (scheduled_date)
    WHERE status = 'scheduled' AND reminder_sent_at IS NULL;

COMMENT ON COLUMN lessons.reminder_sent_at IS
    'Rappel de la veille envoyé (D-65) ; renseigné dans la même requête qui choisit la leçon : jamais deux rappels';
