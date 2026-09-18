-- ============================================
-- UNE SEULE INSCRIPTION ACTIVE PAR ÉLÈVE (tâche 3.5, D-22)
-- ============================================
-- Un élève n'a qu'une ligne students (une école) et qu'une demande pending/approved à la fois,
-- toutes écoles confondues. Les demandes rejected s'accumulent librement : l'ancienne contrainte
-- UNIQUE (student_id, school_id) de 002, qui interdisait de redemander la même école après un
-- refus (contraire au service), est remplacée par l'index unique partiel.
-- Idempotent : CREATE UNIQUE INDEX IF NOT EXISTS, DROP CONSTRAINT IF EXISTS.
-- Données incompatibles (doublons) : la migration s'arrête et les désigne ; choisir la ligne à
-- garder est une décision humaine (les leçons et examens d'un élève dépendent de students.id).

DO $$
DECLARE
    duplicate_students INTEGER;
    duplicate_requests INTEGER;
BEGIN
    SELECT count(*) INTO duplicate_students
    FROM (SELECT user_id FROM students GROUP BY user_id HAVING count(*) > 1) d;
    IF duplicate_students > 0 THEN
        RAISE EXCEPTION '009 : % élève(s) inscrit(s) dans plusieurs écoles (students.user_id en doublon) — trancher à la main avant de rejouer', duplicate_students;
    END IF;

    SELECT count(*) INTO duplicate_requests
    FROM (SELECT student_id FROM enrollment_requests
          WHERE status IN ('pending', 'approved')
          GROUP BY student_id HAVING count(*) > 1) d;
    IF duplicate_requests > 0 THEN
        RAISE EXCEPTION '009 : % élève(s) avec plusieurs demandes actives (enrollment_requests) — trancher à la main avant de rejouer', duplicate_requests;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_user ON students(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollment_requests_active
    ON enrollment_requests(student_id)
    WHERE status IN ('pending', 'approved');

ALTER TABLE enrollment_requests DROP CONSTRAINT IF EXISTS enrollment_requests_student_id_school_id_key;
