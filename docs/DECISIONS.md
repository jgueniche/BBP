# DECISIONS.md — ADR courts (≤ 5 lignes chacun)

## ADR-011 — TDEE adaptatif : calcul lazy + Vercel Cron plutôt que pg_cron (30/08/2026)
La logique adaptative vit en TypeScript (`lib/nutrition/adaptive.ts`) pour être testée
unitairement (DoD session 5). Déclenchement : à la visite de `/poids` (idempotent, 1 proposition
par semaine par utilisateur) + Vercel Cron dimanche soir en rattrapage global (service role
requis). pg_cron du brief réservé aux futurs jobs purement SQL.

## ADR-010 — IA d'extraction : Gemini 3.7 Flash par défaut (30/08/2026)
Décision de Jeremy (coût) : le `food_logger` tourne sur `gemini-3.7-flash`
(0,75 $/3,75 $ par Mtok en tarif de lancement) au lieu de `claude-sonnet-5` prévu au brief §6.
Sélection par clé présente : `GOOGLE_GENERATIVE_AI_API_KEY` d'abord, sinon Anthropic, sinon
mode dégradé sans IA. Le modèle du coach Kémia (session 6) reste à trancher.

## ADR-009 — Casher Ciqual : heuristique par groupes, indication seulement (30/08/2026)
Les 3 185 aliments Ciqual reçoivent une classe bassari/halavi/parvé par règles (groupes ANSES
+ mots-clés à frontière de mot) ; plats composés, pâtisseries, confiseries → classe nulle avec
`kosher_hint` « à vérifier » ; porc/fruits de mer/poissons sans écailles → « non casher ».
Jamais le mot « certifié ». Affinage LLM (kashrut_checker) prévu session 7.

## ADR-008 — Seed de données via extension `http` + fichiers versionnés (30/08/2026)
L'outil MCP `execute_sql` est en lecture seule ; les écritures passent par `apply_migration`.
Les seeds volumineux (Ciqual) sont versionnés dans `src/db/seed/foods/` et chargés par une
data migration qui les télécharge depuis le repo (URL épinglée au SHA du commit) et les
exécute. Idempotent (upsert `on conflict`), reproductible, sans clé service role.

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
