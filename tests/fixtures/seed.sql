-- ============================================
-- JEU DE DONNÉES DU HARNAIS E2E (tests/setup.ts l'applique avant chaque campagne)
-- ============================================
-- Idempotent : identifiants fixes, ON CONFLICT DO NOTHING partout.
-- Les mêmes identifiants sont exposés par tests/helpers/api.ts (SEED).
-- L'admin est celui de la migration 001 (admin@drivingschool.com / admin123).

-- École
INSERT INTO schools (id, name, address, phone, email)
VALUES (
    '11111111-1111-4111-8111-111111111111',
    'Seed Driving School',
    '1 rue du Test, Tunis',
    '+21600000000',
    'contact@seed.io'
)
ON CONFLICT DO NOTHING;

-- Instructeur : instructor@seed.io / Seed1234!
-- Hash bcryptjs (12 tours) généré une fois avec :
--   node -e "console.log(require('bcryptjs').hashSync('Seed1234!', 12))"
INSERT INTO users (id, email, password_hash, role, first_name, last_name)
VALUES (
    '22222222-2222-4222-8222-222222222222',
    'instructor@seed.io',
    '$2a$12$bPihATbM3D3a32OuGL0DL.ciKH75/Xf9ir5h6SzcFqP4R.zW9HKou',
    'instructor',
    'Seed',
    'Instructor'
)
ON CONFLICT DO NOTHING;

INSERT INTO instructors (id, user_id, school_id, name, phone, license_number, specialties)
VALUES (
    '33333333-3333-4333-8333-333333333333',
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'Seed Instructor',
    '+21600000001',
    'LIC-SEED-001',
    ARRAY['CODE', 'Manœuvre', 'Parc']
)
ON CONFLICT DO NOTHING;

-- Grille tarifaire : les trois types de leçon (D-18)
INSERT INTO pricing (school_id, lesson_type, price, duration)
VALUES
    ('11111111-1111-4111-8111-111111111111', 'CODE', 20.00, 60),
    ('11111111-1111-4111-8111-111111111111', 'Manœuvre', 35.00, 60),
    ('11111111-1111-4111-8111-111111111111', 'Parc', 40.00, 60)
ON CONFLICT DO NOTHING;

-- Code d'école pour l'inscription d'un instructeur (D-17), illimité, sans expiration
INSERT INTO school_codes (school_id, code, role, max_uses, expires_at, is_active)
VALUES ('11111111-1111-4111-8111-111111111111', 'INST-SEED', 'instructor', NULL, NULL, TRUE)
ON CONFLICT DO NOTHING;
