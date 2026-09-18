-- ============================================
-- MOT DE PASSE DU COMPTE ADMIN SEEDÉ (tâche 4.4)
-- ============================================
-- 001 insère admin@drivingschool.com avec un hash qui ne correspond pas au mot de passe
-- documenté (admin123, README et CLAUDE.md) : le compte était inutilisable. On remplace
-- uniquement ce hash connu, jamais un mot de passe changé depuis.
-- Hash bcryptjs (12 tours) : node -e "console.log(require('bcryptjs').hashSync('admin123', 12))"
-- Idempotent : sans effet une fois le hash remplacé.

UPDATE users
SET password_hash = '$2a$12$A.NZIkUoowOvjgtWKQOBtexxFoqRfIpHir/zC5SvunfQQgGTIkFnK',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@drivingschool.com'
  AND password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GZKJnSyaHR7e';
