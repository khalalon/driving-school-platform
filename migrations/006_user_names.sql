-- ============================================
-- NOMS SUR users ; students.name ET instructors.name NULLABLES (tâche 3.1, D-16)
-- ============================================
-- Tous les rôles ont un prénom et un nom, portés par users. Les colonnes name des tables
-- students et instructors ne sont plus alimentées (supprimées dans une migration ultérieure).
-- Idempotent : ADD COLUMN IF NOT EXISTS, backfill des seules valeurs NULL, SET/DROP NOT NULL
-- sans effet s'ils sont déjà en place.

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Backfill depuis les noms existants (premier mot = prénom, reste = nom).
UPDATE users u
SET first_name = split_part(trim(s.name), ' ', 1),
    last_name  = trim(substr(trim(s.name), length(split_part(trim(s.name), ' ', 1)) + 1))
FROM students s
WHERE s.user_id = u.id AND u.first_name IS NULL AND s.name IS NOT NULL AND trim(s.name) <> '';

UPDATE users u
SET first_name = split_part(trim(i.name), ' ', 1),
    last_name  = trim(substr(trim(i.name), length(split_part(trim(i.name), ' ', 1)) + 1))
FROM instructors i
WHERE i.user_id = u.id AND u.first_name IS NULL AND i.name IS NOT NULL AND trim(i.name) <> '';

-- Lignes sans nom connu (admin de 001, comptes créés avant cette migration) : chaîne vide.
UPDATE users SET first_name = '' WHERE first_name IS NULL;
UPDATE users SET last_name = '' WHERE last_name IS NULL;

ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;

ALTER TABLE students ALTER COLUMN name DROP NOT NULL;
ALTER TABLE instructors ALTER COLUMN name DROP NOT NULL;
