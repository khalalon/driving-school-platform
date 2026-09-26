-- ============================================
-- COORDONNÉES PORTÉES PAR LE COMPTE (D-50, tâche 12.1)
-- ============================================
-- Un élève peut renseigner ses coordonnées dès l'inscription (A2), donc avant qu'une école
-- l'approuve : la ligne `students` n'existe pas encore à ce moment-là (elle naît en E5). Ces
-- colonnes accueillent ces détails sur le compte, puis E5 les recopie dans la fiche élève.
--
-- Toutes nullables : l'inscription reste possible avec e-mail, mot de passe, prénom et nom
-- seulement (D-50). Aucun rattrapage des comptes existants.
-- Pas de photo en v1 (D-49) : aucune colonne d'image ici.
-- Idempotent.

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(50);

-- Une date de naissance dans le futur est une faute de saisie, pas une donnée : le validateur
-- Joi la refuse déjà, la base le garantit pour toute autre écriture. Le jour même est accepté
-- des deux côtés — sinon une saisie valide pour Joi ferait échouer l'insertion (500 au lieu de 400).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_date_of_birth_check'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_date_of_birth_check
            CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE);
    END IF;
END $$;
