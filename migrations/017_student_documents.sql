-- ============================================
-- DOSSIER ADMINISTRATIF DE L'ÉLÈVE (D-61, D-62, tâche 16.1)
-- ============================================
-- Pour présenter un élève à l'examen, l'école réunit des pièces (CIN, photos, certificat
-- médical…). Pas d'envoi de fichier en v1 (D-49) : l'instructeur note qu'une pièce a été
-- **reçue au bureau**, l'élève voit ce qui lui manque. Un dossier incomplet n'interdit rien
-- (D-62) : il informe.
--
-- `document_types` : la liste est **propre à chaque école**, modifiable par son gérant
-- (D-61 ; D-56 (b)). Chaque école déjà en base reçoit ici la liste par défaut ; les écoles
-- créées ensuite la reçoivent de l'API (`SchoolService.createSchool`) ou de
-- `scripts/onboard-school.sh`. La même liste est répétée dans
-- `services/api/src/modules/school/types/school.types.ts` (`DEFAULT_DOCUMENT_TYPES`) :
-- les deux doivent rester identiques.
--
-- Une pièce retirée de la liste n'est pas supprimée mais désactivée (`active = false`) : les
-- dossiers déjà cochés gardent leur sens. `student_documents` ne porte que les pièces
-- **reçues** — pas de ligne = pièce manquante.
--
-- `student_id` est bien `students.id` (la ligne élève × école), pas `users.id`. Idempotent.

CREATE TABLE IF NOT EXISTS document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    label VARCHAR(120) NOT NULL,
    position SMALLINT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_types_label_check CHECK (length(btrim(label)) > 0)
);

-- Deux fois la même pièce dans une école n'a pas de sens, et l'unicité sert au ON CONFLICT
-- de l'initialisation (ci-dessous, API, script d'onboarding).
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_types_school_label
    ON document_types (school_id, label);

CREATE INDEX IF NOT EXISTS idx_document_types_school
    ON document_types (school_id, position);

CREATE TABLE IF NOT EXISTS student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Qui a reçu la pièce au bureau ; le compte peut disparaître, la pièce reste reçue.
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT student_documents_unique UNIQUE (student_id, document_type_id)
);

CREATE INDEX IF NOT EXISTS idx_student_documents_student
    ON student_documents (student_id);

DROP TRIGGER IF EXISTS update_document_types_updated_at ON document_types;
CREATE TRIGGER update_document_types_updated_at BEFORE UPDATE ON document_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_documents_updated_at ON student_documents;
CREATE TRIGGER update_student_documents_updated_at BEFORE UPDATE ON student_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Liste par défaut (D-61), pour chaque école déjà enregistrée.
INSERT INTO document_types (school_id, label, position)
SELECT s.id, d.label, d.position
FROM schools s
CROSS JOIN (VALUES
    ('Copie de la CIN', 1),
    ('Photos d''identité', 2),
    ('Certificat médical', 3),
    ('Extrait de naissance', 4),
    ('Timbre fiscal', 5)
) AS d(label, position)
ON CONFLICT (school_id, label) DO NOTHING;

COMMENT ON TABLE document_types IS
    'Pièces du dossier administratif, propres à chaque école (D-61) ; désactivées, jamais supprimées';
COMMENT ON TABLE student_documents IS
    'Pièces reçues au bureau pour un élève (D-61) ; student_id = students.id, pas users.id';
