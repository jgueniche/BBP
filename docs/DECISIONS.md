# DECISIONS.md — ADR courts (≤ 5 lignes chacun)

## ADR-007 — Kit UI : shadcn actuel (radix-ui unifié, sonner, tw-animate-css) (30/08/2026)
shadcn/ui installé via CLI avec ses défauts 2026 : paquet `radix-ui` unifié, toasts via
`sonner` (le composant Toast historique est déprécié), animations `tw-animate-css`.
Tokens sémantiques (`--primary`, `--border`…) mappés sur la palette BBP dans `globals.css` ;
dark mode par inversion des variables brutes (media query), pas de classe `.dark`.

## ADR-006 — Auth v1 : email + mot de passe (30/08/2026)
Décision de Jeremy : l'OTP par email échouait car le lien du template Supabase pointe vers la
Site URL par défaut (`localhost:3000`). V1 = signup/login par mot de passe, sans friction.
OTP email et OAuth Google/Apple (brief §6) repoussés au backlog ; à peaufiner plus tard.
Reste côté dashboard Supabase : désactiver « Confirm email » et corriger la Site URL.

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
