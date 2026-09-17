-- ============================================
-- SUIVI DES MIGRATIONS (schema_migrations)
-- ============================================
-- Appliqué soit par Postgres à la création du volume (dossier
-- /docker-entrypoint-initdb.d, après 001-003), soit par scripts/migrate.sh
-- sur une base existante. Idempotent dans les deux cas.

CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 001 à 003 sont forcément déjà en base quand ce fichier s'exécute ;
-- 004 s'enregistre lui-même pour que migrate.sh n'ait rien à rejouer ensuite.
INSERT INTO schema_migrations (name) VALUES
    ('001_initial_schema.sql'),
    ('002_enrollment_system.sql'),
    ('003_student_profile.sql'),
    ('004_schema_migrations.sql')
ON CONFLICT (name) DO NOTHING;
