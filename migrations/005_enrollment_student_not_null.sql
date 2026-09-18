-- ============================================
-- DEMANDES D'INSCRIPTION : student_id OBLIGATOIRE (tâche 3.0)
-- ============================================
-- Les anciens services inséraient student_id = NULL (req.user.userId indéfini) : ces demandes
-- ne peuvent être rattachées à personne, l'identité est perdue. On les purge, puis on pose la
-- contrainte pour que le bug ne puisse pas revenir par un autre chemin d'écriture.
-- Idempotent : SET NOT NULL ne fait rien si la colonne l'est déjà.

DELETE FROM enrollment_requests WHERE student_id IS NULL;

ALTER TABLE enrollment_requests ALTER COLUMN student_id SET NOT NULL;
