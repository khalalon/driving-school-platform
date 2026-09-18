#!/usr/bin/env bash
# Onboarding d'une école (D-17) : insère l'école, sa grille tarifaire (CODE / Manœuvre / Parc)
# et un code d'inscription instructeur INST-<SLUG>-<4 car.>, puis affiche ce code sur stdout.
#
# Usage : scripts/onboard-school.sh <nom> <adresse> <téléphone> <email>
# Le conteneur Postgres doit tourner : docker compose up -d postgres
#
# Options (variables d'environnement) :
#   PRICE_CODE, PRICE_MANOEUVRE, PRICE_PARC   montants de la grille (défaut 20 / 35 / 40)
#   DURATION_MINUTES                          durée d'une leçon dans la grille (défaut 60)
#   CODE_MAX_USES                             quota du code (défaut : illimité)
#   CODE_EXPIRES_AT                           expiration du code, ex. 2026-12-31 (défaut : jamais)
#   DB_CONTAINER, DB_USER, DB_NAME            défauts = docker-compose.yml
#
# Idempotent sur l'email de l'école : relancer le script ne crée ni doublon d'école, ni
# doublon de tarif (les tarifs existants sont conservés), ni second code — le code
# instructeur actif existant est réaffiché.
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "Usage : $0 <nom> <adresse> <téléphone> <email>" >&2
  exit 2
fi

NAME="$1"
ADDRESS="$2"
PHONE="$3"
EMAIL="$4"
DB_CONTAINER="${DB_CONTAINER:-driving-school-postgres}"
DB_USER="${DB_USER:-${POSTGRES_USER:-admin}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-driving_school}}"
PRICE_CODE="${PRICE_CODE:-20}"
PRICE_MANOEUVRE="${PRICE_MANOEUVRE:-35}"
PRICE_PARC="${PRICE_PARC:-40}"
DURATION_MINUTES="${DURATION_MINUTES:-60}"

for n in "$PRICE_CODE" "$PRICE_MANOEUVRE" "$PRICE_PARC" "$DURATION_MINUTES" "${CODE_MAX_USES:-1}"; do
  if ! [[ "$n" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
    echo "Valeur numérique attendue, reçu : $n" >&2
    exit 2
  fi
done

if [ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)" != "true" ]; then
  echo "Conteneur $DB_CONTAINER absent ou arrêté : lancer 'docker compose up -d postgres'." >&2
  exit 1
fi

# INST-<SLUG>-<4 car.> : slug ASCII majuscule (≤ 8 car.) tiré du nom ; le code fait ≤ 20 caractères.
SLUG="$(printf '%s' "$NAME" | iconv -f UTF-8 -t ASCII//TRANSLIT 2>/dev/null || printf '%s' "$NAME")"
SLUG="$(printf '%s' "$SLUG" | tr '[:lower:]' '[:upper:]' | tr -cd 'A-Z0-9' | cut -c1-8)"
# Sans pipeline sur /dev/urandom : `head` qui ferme le tube ferait échouer `pipefail` (SIGPIPE).
ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
SUFFIX=''
for _ in 1 2 3 4; do
  SUFFIX+="${ALPHABET:RANDOM%36:1}"
done
NEW_CODE="INST-${SLUG:-ECOLE}-${SUFFIX}"

# NULL ou littéral SQL, substitués tels quels (:var) ; les textes passent par :'var' (échappés par psql).
MAX_USES_SQL="${CODE_MAX_USES:-NULL}"
EXPIRES_AT_SQL="NULL"
if [ -n "${CODE_EXPIRES_AT:-}" ]; then
  EXPIRES_AT_SQL="'${CODE_EXPIRES_AT//\'/}'"
fi


# Une seule transaction. Les textes passent par :'var' (échappés par psql) ; max_uses et
# expires_at sont des littéraux SQL (NULL ou valeur) substitués tels quels.
# Les sous-requêtes scalaires renvoient toujours une ligne : un NULL laisse la variable
# indéfinie sans faire échouer \gset, ce qui permet les tests \if :{?var}.
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -qtA \
  -v name="$NAME" -v address="$ADDRESS" -v phone="$PHONE" -v email="$EMAIL" \
  -v price_code="$PRICE_CODE" -v price_manoeuvre="$PRICE_MANOEUVRE" -v price_parc="$PRICE_PARC" \
  -v duration="$DURATION_MINUTES" -v new_code="$NEW_CODE" \
  -v max_uses="$MAX_USES_SQL" -v expires_at="$EXPIRES_AT_SQL" -f - <<'SQL'
BEGIN;

SELECT (SELECT id FROM schools WHERE email = :'email' ORDER BY created_at LIMIT 1) AS school_id \gset
\if :{?school_id}
  \warn École déjà enregistrée (:email) : tarifs et code existants conservés.
\else
  INSERT INTO schools (name, address, phone, email)
  VALUES (:'name', :'address', :'phone', :'email')
  RETURNING id AS school_id \gset
  \warn École créée : :name
\endif

INSERT INTO pricing (school_id, lesson_type, price, duration)
VALUES (:'school_id', 'CODE', :price_code, :duration),
       (:'school_id', 'Manœuvre', :price_manoeuvre, :duration),
       (:'school_id', 'Parc', :price_parc, :duration)
ON CONFLICT (school_id, lesson_type) DO NOTHING;

SELECT (SELECT code FROM school_codes
        WHERE school_id = :'school_id' AND role = 'instructor' AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
          AND (max_uses IS NULL OR uses_count < max_uses)
        ORDER BY created_at LIMIT 1) AS code \gset
\if :{?code}
  \warn Code instructeur actif existant réaffiché.
\else
  INSERT INTO school_codes (school_id, code, role, max_uses, expires_at, is_active)
  VALUES (:'school_id', :'new_code', 'instructor', :max_uses, :expires_at, TRUE)
  RETURNING code \gset
  \warn Code instructeur créé.
\endif

COMMIT;

-- Seule sortie standard du script : le code instructeur (à transmettre à l'école).
\echo :code
SQL
