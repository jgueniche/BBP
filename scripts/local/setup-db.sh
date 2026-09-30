#!/usr/bin/env bash
# Local test bench: rebuild a Postgres 16 database shaped like production
# (stubs, migrations in the order they reached prod, seeds).
#
#   scripts/local/setup-db.sh copine_rls          # RLS tests (plain stubs)
#   scripts/local/setup-db.sh copine_app --lite   # app bench (lite's auth first)
#
# Never points at production: it only talks to the local cluster.
set -euo pipefail

DB="${1:?usage: setup-db.sh <database> [--lite]}"
MODE="${2:-}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"

[[ "$DB" =~ ^[a-z_][a-z0-9_]*$ ]] || { echo "bad database name: $DB" >&2; exit 1; }

pg_ctlcluster 16 main start 2>/dev/null || true
su postgres -c "psql -q -c \"alter role postgres password 'postgres'\"" >/dev/null

psql_db() { su postgres -c "psql -v ON_ERROR_STOP=1 -q -X -d $DB" >/dev/null; }

su postgres -c "psql -q -X -c 'drop database if exists $DB with (force)' -c 'create database $DB'" >/dev/null

if [[ "$MODE" == "--lite" ]]; then
  # lite creates its full auth schema (and storage tables) on first start.
  "$ROOT/scripts/local/lite.sh" bootstrap "$DB"
fi

psql_db < "$ROOT/scripts/local/supabase-stubs.sql"

apply() {
  local file="$1" name version
  name="$(basename "$file" .sql)"
  version="${name%%_*}"
  echo "  $name"
  psql_db < "$file"
  echo "insert into supabase_migrations.schema_migrations (version, name)
        values ('$version', '${name#*_}') on conflict (version) do nothing;" | psql_db
}

seed() {
  echo "  seeds: foods, starter recipes"
  for file in "$ROOT"/src/db/seed/foods/batch_*.sql; do psql_db < "$file"; done
  psql_db < "$ROOT/src/db/seed/recipes/recipes.sql"
}

echo "Migrations into $DB (production order):"
# Up to 202609291200, then the seeds, then the late session 19-22 files in
# the order they reached prod (the destructive 1210 after the 1300).
for file in "$MIGRATIONS"/*.sql; do
  version="$(basename "$file" | cut -d_ -f1)"
  [[ "$version" -le 202609291200 ]] && apply "$file"
done
seed
for version in 202609291220 202609291230 202609291300 202609291210 202609291400 202609291500; do
  apply "$(ls "$MIGRATIONS"/"$version"_*.sql)"
done
for file in "$MIGRATIONS"/*.sql; do
  version="$(basename "$file" | cut -d_ -f1)"
  [[ "$version" -gt 202609291500 ]] && apply "$file"
done
echo "Done: $DB"
