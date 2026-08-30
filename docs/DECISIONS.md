# DECISIONS.md — ADR courts (≤ 5 lignes chacun)

## ADR-019 — Social : modération à deux étages, feed sans algorithme (30/08/2026)
Chaque post/commentaire passe le filtre heuristique FR (20 cas DoD testés) puis l'agent IA
quand une clé existe : high = jamais publié, medium = publié + flaggé pour la file admin.
Feed strictement chronologique (brief §4.9), réactions ×3 (une par personne), blocage côté
requête, admins en table `admin_users` (definer-only, ajout par SQL). Partage externe via
page publique `/r/[slug]` + OG dynamique ; le nom n'apparaît que si le profil est public.

## ADR-018 — Sport : kcal MET indicatives, jamais recomptées dans le TDEE (30/08/2026)
Les kcal de séance (MET × poids × durée) sont affichées pour motiver, mais ne sont ni
ajoutées au journal ni au TDEE : le TDEE adaptatif observe déjà la dépense réelle via
apports − 7700 × Δtendance, sport inclus — les compter deux fois gonflerait les cibles.
Comme le planning, le programme sportif est validé programmatiquement (ids de la
bibliothèque, volume borné) et l'IA retombe sur un générateur déterministe sans clé.

## ADR-017 — Pratique religieuse opt-out, casher-natif par défaut (30/08/2026)
Demande de Jeremy : l'app reste casher-native (défauts activés) mais chaque personne peut
désactiver les règles de cacherout et/ou le calendrier juif (Profil › Ma pratique,
`user_settings.kashrut_enabled` / `jewish_calendar_enabled`). Le gating se fait à la source
(contexte du planner, contexte de Kémia, requêtes des pages) plutôt que dans chaque règle.
Les classifications casher restent calculées et affichées : information, jamais contrainte.

## ADR-016 — Planning : validateur programmatique + fallback déterministe (30/08/2026)
Le planner ne viole jamais les règles §5 : tout plan (IA, fallback, édition manuelle, drag &
drop) passe par `validatePlan` — délai viande/lait sur horaires types, chabbat meal-prep,
Pessah, jeûnes, cibles ±10 % via des portions au quart par créneau (snapshot en base).
L'IA a 2 tentatives (violations réinjectées) puis un planificateur déterministe seedé prend
le relais — il est aussi le mode sans clé. DoD testée : 10 semaines générées, 0 violation.

## ADR-015 — Social v1 : likes/saves/commentaires, carnets partagés par lien (30/08/2026)
Le réseau social des recettes démarre avec likes, « enregistrer dans mon carnet », commentaires
plats et carnets collaboratifs rejoints par lien d'invitation (token UUID, RPC security definer).
Une recette privée placée dans un carnet partagé devient visible aux membres — c'est la
concrétisation du palier « famille ». Compteurs via vue `security_invoker` (RLS respecté).
Fil d'amis, abonnements et notifications : session 11.

## ADR-014 — Import de recettes : oEmbed social, JSON-LD web, IA avec fallback (30/08/2026)
Réseaux sociaux : oEmbed officiel uniquement (TikTok/YouTube ouverts ; Instagram derrière
`INSTAGRAM_OEMBED_TOKEN`, sinon collage de légende) — jamais de scraping authentifié (brief §9).
Sites ouverts : extraction JSON-LD schema.org/Recipe (standard des sites de cuisine). L'agent
`recipe_importer` normalise (grammes, phases, durées) ; sans clé IA, parseur FR + heuristique.
Crédit auteur + lien source obligatoires et non éditables ; brouillon privé par défaut.

## ADR-013 — Nutrition des recettes calculée en SQL, proxys Ciqual assumés (30/08/2026)
`compute_recipe_nutrition(rid)` (SQL, stable) somme grammes × `per_100g` des ingrédients liés
et divise par les portions ; miroir TypeScript (`lib/nutrition/recipe.ts`) pour l'app et les
tests. Ingrédients absents de Ciqual → proxy le plus proche épinglé par code (ex. boutargue →
œufs de lompe 26004). Ingrédients non liés = ignorés du calcul, signalés dans l'éditeur.

## ADR-012 — Kémia v1 : outils honnêtes et conversation unique (30/08/2026)
Les 10 outils §8 sont définis dès la session 6 ; ceux dont la feature n'existe pas encore
(recettes, planning, sport, rappels) répondent `available:false` avec la session d'arrivée —
Kémia le dit plutôt que d'halluciner. Une seule conversation continue par utilisateur en v1
(fil unique, historique 30 messages). Quota 30 messages/jour compté en jour UTC.

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
