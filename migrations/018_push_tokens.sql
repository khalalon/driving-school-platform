-- ============================================
-- JETONS PUSH (D-63, D-66, tâche 17.2)
-- ============================================
-- D-35 écartait les notifications de la v1 ; D-63 les rétablit : l'élève et l'école sont
-- prévenus des événements qui les attendent, au lieu d'ouvrir l'application « pour voir ».
--
-- Un jeton push identifie un **appareil**, pas un compte : il est unique (`token UNIQUE`) et
-- change de propriétaire si le téléphone change de main — l'enregistrement est donc un upsert
-- sur le jeton, qui réécrit `user_id`. Un même compte peut avoir plusieurs appareils.
--
-- `language` suit la langue choisie dans l'application (D-47) et non celle du compte : le
-- message part dans la langue de l'appareil qui le reçoit, renvoyée par le mobile à chaque
-- changement de langue. L'historique des messages, lui, vit dans `notifications` (001).
--
-- Pas de `created_at` : seule la dernière mise à jour compte pour nettoyer les jetons morts.
-- Idempotent.

CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL,
    language VARCHAR(2) NOT NULL DEFAULT 'fr',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT push_tokens_platform_check CHECK (platform IN ('android', 'ios')),
    CONSTRAINT push_tokens_language_check CHECK (language IN ('fr', 'ar'))
);

-- Envoi groupé : tous les jetons des destinataires d'un événement, en une requête (17.3).
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);

COMMENT ON TABLE push_tokens IS
    'Jetons push Expo par appareil (D-63) ; token UNIQUE : un appareil qui change de compte change de user_id';
COMMENT ON COLUMN push_tokens.language IS
    'Langue de l''application sur cet appareil (D-47), pas celle du compte : fr ou ar';
