-- ============================================
-- DISPONIBILITÉS DES INSTRUCTEURS (D-60, tâche 15.6)
-- ============================================
-- Chaque instructeur publie sa **semaine type** : des plages par jour de la semaine, dans
-- lesquelles l'élève choisira un créneau libre (15.7) — la demande reste à approuver (D-01).
--
-- `weekday` suit la convention de JavaScript (`getDay`) et de Postgres (`EXTRACT(DOW)`) :
-- 0 = dimanche … 6 = samedi. Les heures sont celles de l'école (Africa/Tunis, D-08), sans
-- fuseau : une plage 09:00–12:00 reste 09:00–12:00 toute l'année.
-- Les plages d'un même jour ne se chevauchent pas : contrôlé par l'API (400), qui remplace la
-- semaine type d'un bloc. Idempotent.

CREATE TABLE IF NOT EXISTS instructor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT instructor_availability_range_check CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_instructor_availability_instructor
    ON instructor_availability (instructor_id, weekday);

COMMENT ON TABLE instructor_availability IS
    'Semaine type de disponibilités d''un instructeur (D-60) ; weekday 0 = dimanche, heures de l''école';
