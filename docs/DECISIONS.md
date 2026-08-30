# DECISIONS.md — ADR courts (≤ 5 lignes chacun)

## ADR-001 — Nom du coach : Kémia (30/08/2026)
Le coach IA s'appelle **Kémia** (constante `COACH_NAME`), par décision du brief §3.1.
Alternatives conservées si besoin de pivot : *Tata Fortunée*, *Tonton Chlomo*.

## ADR-002 — Session 1 exécutée sans validation interactive du plan (30/08/2026)
La session tourne en environnement distant autonome : impossible d'attendre la validation du plan.
Le plan (≤ 15 lignes) est présenté dans le résumé de session ; Jeremy le valide a posteriori.
Les sessions interactives futures reviennent au rituel standard du brief §0.

## ADR-003 — Connexions externes différées, code prêt à brancher (30/08/2026)
Supabase (projet Paris), Vercel, Sentry, PostHog et OAuth Google/Apple exigent des comptes/clés
inaccessibles depuis cette session. Le code (clients Supabase, auth OTP, `.env.example`, CI) est
livré fonctionnel à la configuration près ; les actions sont listées dans `STATE.md › Reste à faire`.

## ADR-005 — Branche de production : `master` (30/08/2026)
Demande explicite de Jeremy : la prod vit sur `master` (git + Vercel), pas sur `main`.
Trunk-based conservé : les branches de session (`claude/…`, `feat/…`) partent de `master`
et y reviennent par PR. CI sur `master`, `claude/**` et toutes les PR.
À faire côté GitHub : définir `master` comme branche par défaut (Settings → General).

## ADR-004 — Migrations dans `supabase/migrations/`, miroir documentaire dans `src/db/` (30/08/2026)
Le CLI Supabase impose `supabase/migrations/` comme emplacement des migrations SQL.
`src/db/` (arborescence du brief §6) garde `types.ts` (types générés) et `seed/`.
Convention de nommage du brief conservée : `YYYYMMDDHHMM_description.sql`.
