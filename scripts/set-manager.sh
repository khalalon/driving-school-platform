#!/usr/bin/env bash
# Désigne (ou retire) le gérant d'une école parmi ses instructeurs existants (D-57) : pour les
# écoles pilotes inscrites avant le code gérant. Bascule `instructors.is_manager` du compte.
#
# Usage : scripts/set-manager.sh <email> [on|off]     (défaut : on)
# Le conteneur Postgres doit tourner : docker compose up -d postgres
#
# Refuse un compte inconnu, un compte qui n'est pas instructeur, ou un instructeur sans fiche
# d'école. Relançable : rebasculer dans le même état ne change rien.
# Options : DB_CONTAINER, DB_USER, DB_NAME (défauts = docker-compose.yml).
set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage : $0 <email> [on|off]" >&2
  exit 2
fi

EMAIL="$1"
STATE="${2:-on}"
case "$STATE" in
  on) FLAG=true ;;
  off) FLAG=false ;;
  *)
    echo "Deuxième argument : on ou off, reçu : $STATE" >&2
    exit 2
    ;;
esac

DB_CONTAINER="${DB_CONTAINER:-driving-school-postgres}"
DB_USER="${DB_USER:-${POSTGRES_USER:-admin}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-driving_school}}"

if [ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)" != "true" ]; then
  echo "Conteneur $DB_CONTAINER absent ou arrêté : lancer 'docker compose up -d postgres'." >&2
  exit 1
fi

# Une transaction. Les variables psql ne sont pas substituées dans un bloc $$ : l'email et l'état
# passent par set_config (paramètres locaux à la transaction), lus par current_setting. Un refus
# lève une exception au message clair et laisse la base intacte (ON_ERROR_STOP).
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -qtA \
  -v email="$EMAIL" -v flag="$FLAG" -v state="$STATE" -f - <<'SQL'
BEGIN;
SELECT set_config('manager.email', :'email', true) AS e,
       set_config('manager.flag', :'flag', true) AS f \gset

DO $$
DECLARE
  account_email text := current_setting('manager.email');
  account_role text;
  updated integer;
BEGIN
  SELECT role INTO account_role FROM users WHERE email = account_email;
  IF account_role IS NULL THEN
    RAISE EXCEPTION 'Aucun compte avec l''email %', account_email;
  END IF;
  IF account_role <> 'instructor' THEN
    RAISE EXCEPTION 'Le compte % n''est pas instructeur (rôle %) : seul un instructeur peut être gérant',
      account_email, account_role;
  END IF;
  UPDATE instructors i
  SET is_manager = current_setting('manager.flag')::boolean, updated_at = CURRENT_TIMESTAMP
  FROM users u
  WHERE u.id = i.user_id AND u.email = account_email;
  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated = 0 THEN
    RAISE EXCEPTION 'L''instructeur % n''a pas de fiche d''école', account_email;
  END IF;
END
$$;

COMMIT;

\echo 'gérant' :state ':' :email
SQL
