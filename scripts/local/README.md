# Banc de test local

Outillage de développement seulement : rien ici ne touche la prod.

Une base Postgres 16 locale construite comme la prod (mêmes migrations, dans l'ordre où elles y sont arrivées, et mêmes graines), avec les morceaux de Supabase dont nos migrations ont besoin, et `@supabase/lite` pour faire tourner l'app dessus (API REST, auth et stockage, RLS native de Postgres).

## Prérequis

- Postgres 16 (`pg_ctlcluster 16 main start`) ; les scripts passent le SQL à `su postgres -c psql` par l'entrée standard.
- Node 22. `lite.sh` installe `@supabase/lite` (version épinglée) et le pilote `postgres` dans `.local-bench/` (ignoré par git).

## Tests RLS (SQL seul)

```bash
scripts/local/setup-db.sh copine_rls
su postgres -c "psql -v ON_ERROR_STOP=1 -X -d copine_rls" < scripts/local/rls/<fichier>.sql
```

`supabase-stubs.sql` crée les rôles `anon`, `authenticated`, `service_role` (bypassrls), `auth.users`, `auth.uid()` et `auth.role()` (lus dans `request.jwt.claims` ou `request.jwt.claim.sub`), `storage.buckets`, `storage.objects`, `storage.foldername()` et les privilèges par défaut de Supabase. Dans un script de test, un bloc `DO` joue une membre avec `set local role authenticated` et `set_config('request.jwt.claims', '{"sub":"…","role":"authenticated"}', true)`.

Ordre de la prod : migrations jusqu'à `202609291200`, graines (`src/db/seed/foods/batch_*.sql` puis `src/db/seed/recipes/recipes.sql`), puis `1220`, `1230`, `1300`, `1210`, `1400`, `1500`, puis les suivantes dans l'ordre.

## L'app sur la base locale

```bash
scripts/local/setup-db.sh copine_app --lite   # lite crée son schéma auth, puis migrations et graines
scripts/local/lite.sh start copine_app        # API lite sur :54321, proxy CORS sur :54320
cp .local-bench/env.local .env.local          # URL et clés locales pour Next
pnpm build && pnpm start
scripts/local/lite.sh stop
```

- Les comptes se créent par l'auth de lite (inscription dans l'app, ou `supabase.auth.signUp` depuis un script) ; pas de confirmation d'e-mail.
- Le proxy CORS existe parce que lite refuse l'en-tête `Authorization` au preflight du navigateur.
- Le stockage de lite est expérimental (`EXPERIMENTAL_STORAGE=1`) ; les fichiers vont dans `.local-bench/lite/supabase/.temp/storage`, les policies de `storage.objects` s'appliquent.
- Playwright : lancer Chromium avec `executablePath: "/opt/pw-browsers/chromium"`.
- Dans un conteneur qui sort par un proxy, lancer Next avec `NODE_USE_ENV_PROXY=1` pour que ses appels sortants (oEmbed, sites de recettes) passent.
