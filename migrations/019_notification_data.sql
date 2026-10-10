-- ============================================
-- HISTORIQUE DES NOTIFICATIONS : DESTINATION (D-66, tâche 17.3)
-- ============================================
-- La table `notifications` (001) portait `type`, `title`, `message`, `read` : de quoi afficher
-- une liste, pas de quoi **rouvrir** ce dont le message parle. Le push, lui, transporte déjà
-- `data: { screen, id }` pour qu'un appui ouvre le bon écran.
--
-- Sans cette colonne, l'écran « Notifications » (17.6, 17.7) devrait redeviner l'écran à
-- ouvrir depuis le `type` : une table de correspondance de plus, à maintenir côté mobile. On
-- conserve donc la même destination que le push, à côté du message.
--
-- `data` reste facultative : une notification écrite sans destination s'affiche sans s'ouvrir.
-- Idempotent.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;

COMMENT ON COLUMN notifications.data IS
    'Destination de la notification, identique au payload push : { screen, id } (D-66)';
