#!/usr/bin/env bash
# Applique, dans l'ordre, les fichiers migrations/*.sql qui ne sont pas encore
# enregistrés dans la table schema_migrations (créée par 004). Idempotent :
# relancer le script sur une base à jour ne fait rien.
#
# Usage : scripts/migrate.sh   (depuis n'importe quel répertoire ; `make migrate` l'appelle)
# Le conteneur Postgres doit tourner : docker compose up -d postgres
# Variables optionnelles : DB_CONTAINER, DB_USER, DB_NAME (défauts = docker-compose.yml).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"
DB_CONTAINER="${DB_CONTAINER:-driving-school-postgres}"
DB_USER="${DB_USER:-${POSTGRES_USER:-admin}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-driving_school}}"
TRACKING_MIGRATION="004_schema_migrations.sql"

# Requête ponctuelle, résultat brut (sans en-tête ni alignement).
query() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -tA -c "$1"
}

# Applique un fichier et l'enregistre dans schema_migrations, en une seule transaction.
# Le SQL passe par stdin : aucun chemin à traduire pour le conteneur (Git Bash compris).
apply() {
  local file="$1" name
  name="$(basename "$file")"
  {
    cat "$file"
    printf "\nINSERT INTO schema_migrations (name) VALUES ('%s') ON CONFLICT (name) DO NOTHING;\n" "$name"
  } | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
        -v ON_ERROR_STOP=1 --single-transaction -q -f -
}

if [ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)" != "true" ]; then
  echo "Conteneur $DB_CONTAINER absent ou arrêté : lancer 'docker compose up -d postgres'." >&2
  exit 1
fi

# Attente en TCP (-h localhost) : pendant l'initialisation du volume, le serveur
# temporaire qui exécute /docker-entrypoint-initdb.d n'écoute que sur la socket Unix.
# Être joignable en TCP garantit donc que les scripts d'init sont terminés.
for i in $(seq 1 60); do
  if docker exec "$DB_CONTAINER" pg_isready -q -h localhost -U "$DB_USER" -d "$DB_NAME"; then
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Postgres ($DB_CONTAINER) toujours indisponible après 60 s." >&2
    exit 1
  fi
  sleep 1
done

# Base créée avant l'existence de 004 : on installe d'abord la table de suivi
# (004 y inscrit 001-004), puis la boucle ci-dessous ne rejoue rien d'ancien.
if [ "$(query "SELECT to_regclass('public.schema_migrations') IS NULL")" = "t" ]; then
  echo "Table schema_migrations absente : application de $TRACKING_MIGRATION"
  apply "$MIGRATIONS_DIR/$TRACKING_MIGRATION"
fi

applied=0
skipped=0
for file in "$MIGRATIONS_DIR"/*.sql; do # glob trié : 001, 002, ...
  name="$(basename "$file")"
  if [ "$(query "SELECT 1 FROM schema_migrations WHERE name = '$name'")" = "1" ]; then
    skipped=$((skipped + 1))
    continue
  fi
  echo "Application de $name"
  apply "$file"
  applied=$((applied + 1))
done

echo "Migrations : $applied appliquée(s), $skipped déjà en base."
