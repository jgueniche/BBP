# STATE.md — État du projet BBP

Dernière mise à jour : 30/08/2026 · Sessions 1 à 10

## Fait — Session 10 (Sport)
- **Bibliothèque de 188 exercices FR** en base (migration `202608302030`, seed `scripts/seed-exercises.py` chargé par data migration épinglée) : 117 muscu / 27 cardio / 24 mobilité / 20 fonctionnel, avec groupes musculaires, matériel, niveau, MET, consignes et erreurs fréquentes. Lecture publique.
- **Programmes 4 semaines** : agent `workout_planner` (prompt versionné, 2 tentatives avec erreurs réinjectées) + **générateur déterministe sans IA** (splits full body / haut-bas / PPL selon la fréquence, séries×reps selon l'objectif, montée semaines 1-3 + deload semaine 4) — **validateur programmatique** (ids de la bibliothèque uniquement, volume borné) : DoD testée sur 96 combinaisons objectif×fréquence×matériel (6 tests, 93 verts au total).
- **Page `/sport`** : génération (objectif/fréquence/matériel/niveau/durée), programme par semaines dépliables, **records perso** (charge max par exercice), historique, kcal sport de la semaine, **log rapide** (« marche 30 min », « foot 1h » → kcal via MET × poids), liens depuis Journal et Profil.
- **Séance guidée plein écran une main** (`/sport/seance`) : grosses pastilles de séries cochables, charge par exercice, **minuteur de repos automatique** (vibration discrète à zéro), consignes affichées, barre de progression, wake lock, écran RPE, **réaction de Kémia** en fin de séance (IA légère, sinon 6 phrases maison).
- Outil Kémia `create_workout_program` branché (programme réel + lien). TDEE adaptatif : **pas de double comptage** — le sport est déjà capté par la dépense observée (apports − Δpoids), les kcal de séance sont affichées à titre informatif (ADR-018).

## Fait — Session 9bis (Pratique à la carte — demande de Jeremy)
- Deux interrupteurs dans **Profil › Ma pratique** (migration `202608301950`, défaut : activés) : **règles de cacherout** et **calendrier juif** — pour les utilisateurs non pratiquants.
- Respectés partout : validateur + générateurs du planning (viande/lait, chabbat, Pessah, jeûnes coupés à la source), affichage planning (dates hébraïques/badges/allumage masqués), minuteur viande→lait et alerte mélange du journal, contexte de Kémia (calendrier omis ; consigne « n'en parle jamais de toi-même » si cacherout désactivée), prompt du meal_planner.
- Les pastilles casher des recettes restent affichées à titre indicatif (information, pas contrainte). 2 tests ajoutés (87 verts).

## Fait — Session 9 (Planning & liste de courses)
- **Validateur programmatique §5** (`lib/planning/validate.ts`) : délai viande→lait entre repas (horaires types 8 h/12 h 30/20 h), chabbat obligatoire + samedi sans cuisson (restes/plat chabbat) si `shomer_shabbat`, hametz/kitniyot pendant Pessah (via hebcal + drapeaux `foods`), jeûnes (rien en journée), **cibles ±10 %** par part de repas planifiée (portions au quart) — 14 tests, dont la **DoD : 10 semaines générées = 0 violation**.
- **Génération** : agent `meal_planner` (prompt versionné, 2 tentatives avec violations réinjectées) + **planificateur déterministe sans IA** (rotation seedée par budget kcal, déjeuners halavi/parvé, dîners bassari/parvé, meal-prep chabbat vendredi→samedi, restes mardi→mercredi) — le plan renvoyé passe toujours le validateur. Migrations `202608301900` + `202608301905` (snapshots par créneau, portions).
- **Page `/planning`** : navigation semaine, **dates hébraïques + badges fêtes/jeûnes + heure d'allumage** par jour, grille par repas avec pastilles casher et kcal/jour vs cible, **drag & drop** (blocage si une règle serait violée), régénération d'un créneau (dé), swap via picker de recettes, retrait, contrainte libre pour Kémia (« poisson mardi »), **« Vers le journal » en un tap** par jour (source `recipe`, anti-doublon).
- **Liste de courses** (`/planning/courses`) : agrégée par rayon (mapping Ciqual→7 rayons), grammes cumulés, mention « épicerie casher » (viande/fromage/vin), cases cochables, **partage par lien public** `/courses/[token]` (RPC security definer, consultable sans compte).
- Outils Kémia `get_plan` et `propose_meal_plan` branchés sur le vrai moteur (génération persistée + URL). 85 tests verts, lint/typecheck/build OK.

## Fait — Session 8 (Import de recettes + Carnet social, inspiré ReciMe/Pepper/Crouton)
- **Import multi-sources** (`/recettes/importer`, migration `202608301810`) : lien (oEmbed officiel TikTok/YouTube, Instagram si `INSTAGRAM_OEMBED_TOKEN` sinon collage de légende — jamais de scraping authentifié), sites web via **JSON-LD schema.org** (phases HowToSection + durées ISO 8601), texte collé, **photo** (vision). Normalisation par l'agent `recipe_importer` (prompt versionné) avec **fallback sans IA** : parseur d'ingrédients FR (g/kg/cl/càs/càc/fractions) + heuristique de légende — 12 tests. Crédit auteur + lien source obligatoires, affichés et verrouillés (ADR-014).
- **Carnets (collections)** : icône emoji + couleur + description, une recette dans plusieurs carnets, **partage par lien d'invitation** (`join_collection` RPC, `/recettes/carnets/rejoindre/[token]`), membres collaboratifs (ajout/retrait de recettes), quitter/supprimer. Les recettes privées d'un carnet partagé deviennent visibles à ses membres (ADR-015 — le vrai « famille »).
- **Social v1** : ❤️ likes (animation, optimiste), **enregistrer dans Mon carnet**, commentaires (suppression par l'auteur du commentaire ou de la recette), **note perso privée** par recette, vue `recipe_social_stats` (compteurs RLS-aware), noms d'auteurs (profils publics uniquement, sinon « Membre BBP »).
- `/recettes` en **3 onglets** : Découvrir (feed communauté + tri Populaires + filtres), Mon carnet (créées + enregistrées), Carnets. Icône emoji par recette (suggestions dans l'éditeur).
- **Phases & minuteurs** : sections d'ingrédients et d'étapes + durée par étape (éditeur enrichi, import automatique), affichage groupé, **Mode cuisine** plein écran étape par étape avec minuteurs multiples simultanés, barre de progression et wake lock (`/recettes/[slug]/cuisine`).
- Lint + typecheck + build verts, 71 tests. Advisors : WARN attendus sur les 4 fonctions `security definer` (helpers auto-scopés `auth.uid()`, gardés) — voir section Advisors.

## Fait — Session 7 (Recettes)
- Modèle complet : `recipes` (origine, catégorie, difficulté, temps, portions, tags, visibilité privée/famille/communauté, **versions Boutargue/Protéine liées** via `parent_recipe_id` + `version_kind`, fork, statut), `recipe_ingredients` (liés à `foods`, grammes canoniques), `recipe_steps` — RLS complet, recherche FR, migration `202608301715`.
- **Seed : 35 recettes publiées** (les 30 de l'annexe A + mafroum/harira/salade d'oranges + 2 versions Protéine liées de démo) — 226 ingrédients épinglés aux aliments Ciqual par code exact, 139 étapes, classes casher conformes à l'annexe (12 bassari / 21 parvé / 2 halavi / 8 poisson), 100 % avec nutrition/portion calculée en SQL.
- **DoD nutrition ±10 % vérifiée** sur 5 recettes de référence : brik 244 kcal, chakchouka 217, couscous boulettes 572 (34 g prot), carottes cumin 91, méchouia 119 — + test unitaire reproduisant le calcul méchouia à l'exact.
- `lib/kashrut/classify.ts` : règles (viande/lait/poisson/exceptions « lait de coco »/non-casher/gélatine) avec confiance — 9 tests ; agent `kashrut_checker` (LLM léger) si confiance < 0,8.
- Pages : liste avec recherche + filtres (casher, origine, version, ≤ 30 min), détail (pastilles, nutrition, drapeaux, disclaimer indication, liens entre versions), **fork « Ma version »**, éditeur complet (autocomplete `foods`, étapes, visibilité), **génération « version Protéine » par Kémia** avec substitutions expliquées (brouillon privé lié ; dégradé sans clé).
- Outil coach `search_recipes` branché sur la vraie table. 59 tests verts.

## Fait — Session 6 (Kémia v1)
- Chat streaming `/coach` (AI SDK + useChat) : bulles Kémia avec avatar, message d'accueil personnalisé (prénom), historique persisté (fil unique, 30 derniers messages), disclaimer « réponses générées par IA », fallback gracieux (« Kémia est en cuisine… ») si API indisponible.
- Prompt §3.5 versionné (`src/ai/prompts/coach.ts`, v1.0.0) + bloc **MODE SÉCURITÉ** (wellbeing/flags médicaux/mineur → aucun chiffre, pas d'humour) appliqué serveur.
- Contexte injecté à chaque appel : profil/objectif/7 derniers jours/casher/allergies (`lib/coach/context.ts`), mémoires actives (≤ 40), **contexte calendaire hebcal** (`lib/jewish-calendar/context.ts`, chabbat/fêtes < 72 h, jeûnes → aucun objectif calorique ; Paris par défaut, géoloc ville en session 13).
- **10 outils §8** validés Zod : get_journal, get_weight, log_food (recherche `foods` + classe casher), log_weight, flag_wellbeing (pose le flag en base) opérationnels ; get_plan / search_recipes / propose_meal_plan / create_workout_program / set_reminder répondent honnêtement « pas encore disponible » (ADR-012).
- Quota 30 messages/jour (vérifié serveur, affiché client), coût loggé par message (`tokens_in/out`, modèle), `memory_extractor` (≤ 3 faits dédupliqués, désactivé en mode sécurité), page **« Ce que Kémia sait de toi »** avec suppression des mémoires.
- Suite **promptfoo 40 cas** (`src/ai/evals/coach/`) : 20 persona + 20 garde-fous, checks mécaniques de voix (emoji, expressions, phrases, tutoiement) + rubrics — `pnpm eval:coach` dès qu'une clé IA est posée.

## Fait — Session 5 (Poids, mesures, TDEE adaptatif)
- `lib/nutrition/ewma.ts` : tendance EWMA α = 0,1 tolérante aux trous (lissage composé par jour manquant), variation/semaine, projection à l'objectif — 11 tests.
- `lib/nutrition/adaptive.ts` : TDEE observé = apports moyens − 7700 × Δtendance/jour, mélange 50/50 avec l'estimation courante, pas borné à ±15 % par ajustement, jours < 800 kcal ignorés, minimum 8 pesées + 10 jours de journal sur ≥ 14 jours ; nouvelles cibles via les garde-fous §3.4 — 8 tests (plateau, perte rapide, données manquantes, bornes).
- Page `/poids` : saisie du jour, stats (tendance, variation/sem, date objectif estimée), graphique Recharts 30/90/365 j (pesées + tendance, tokens dark-mode, contraste validé par le validateur dataviz), mesures corporelles (5 champs, upsert par date), photos de progression privées (bucket Storage RLS par dossier utilisateur, URLs signées), carte « Proposition de Kémia » avec explication en une phrase et accepter/refuser (objectif historisé).
- Génération de proposition : à la visite de `/poids` (1×/semaine max, seuil de bruit 3 %) + route cron `/api/cron/adaptive-tdee` (Vercel Cron dimanche 18 h UTC, nécessite `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET`) — ADR-011.
- Migration `202608301630` (body_measurements, tdee_proposals, bucket + policies Storage), types mis à jour, liens d'accès depuis Journal et Moi. 47 tests verts au total.

## Fait — Session 4 (Base alimentaire & journal)
- Base `foods` : 3 185 aliments **Ciqual** importés (nutriments/100 g, 2 297 avec kcal — le reste est absent de la source), classification casher heuristique (ADR-009), flags hametz/kitniyot, recherche full-text FR + trigram (`search_foods` RPC RLS-aware). Seed versionné + `scripts/import-ciqual.py`.
- Tables `food_logs` + `food_favorites` (RLS), migration `202608301550`.
- Journal : barre unique texte + **voix** (Web Speech) + **photo** (vision) + **scanner code-barres** (@zxing) ; agent `food_logger` (claude-sonnet-5, structured output Zod, prompt versionné) avec **fallback sans IA** (parser quantités + recherche base) tant que `ANTHROPIC_API_KEY` absent ; carte de confirmation éditable ; favoris ; « comme hier » ; anneaux kcal/protéines ; classe casher par repas ; **minuteur viande → lait** selon le délai du profil ; proxy OpenFoodFacts (cache 30 j, indication non certifiée).
- Tests : parser fallback, totaux, classification repas, minuteur (28 tests verts au total).

## Fait — Session 3 (Onboarding & profil)
- Migration `202608301545` : `profiles`, `user_settings`, `health_profile`, `goals`, `weight_logs` — RLS partout, triggers `updated_at`, un seul objectif actif par utilisateur. Types générés dans `src/db/types.ts`.
- Onboarding 9 étapes : bienvenue Kémia → consentement santé distinct + flags médicaux → profil → objectif → activité → mode → contraintes casher → allergies/aversions → récap TDEE.
- TDEE Mifflin-St Jeor × activité ; bornes §3.4 appliquées client ET serveur (jamais < 1 200/1 500 kcal, déficit ≤ 25 %, rythme 0,25–1 %/sem) — tests unitaires dédiés.
- Refus < 16 ans ; 16–18 ans et flags médicaux → mode accompagnement général (aucune cible chiffrée).
- Garde d'accès : `(app)` redirige vers `/onboarding` tant que le profil n'est pas complété.
- Profil : infos + objectif, refaire l'onboarding, **export JSON** (`/api/account/export`), **suppression des données** self-service, disclaimer permanent.

## Fait — Session 2 (Charte graphique & kit UI)
- Tokens `@theme` complets (palette §2.2) avec **dark mode** par inversion ink/paper (orange inchangé, ombres paper 30 %) — vérifié par screenshots light + dark.
- shadcn/ui installé et re-thémé « sticker » : Button, Card, Input, Sheet, Dialog, Tabs, Badge, Progress, Toast (sonner) — bordures ink 2 px, radius 20 px, ombres dures `shadow-sticker`.
- Composants BBP : `KashrutPill`, `MacroRing`, `StickerCard`, `CoachBubble` (avec respiration Framer Motion + reduced-motion), `EmptyState`.
- Avatar Kémia SVG ×5 expressions (sourire, clin, surprise, fière, douce) ; 12 illustrations SVG line-art ; logo BBP ×4 variantes + tranche de boutargue dans le B.
- `public/brand/` : SVG sources + `scripts/export-brand.mjs` (sharp) → PNG 32/192/512/maskable + logos 1024 ; `src/app/icon.svg` (favicon).
- Page `/design` complète (couleurs, typo, boutons, cartes, formulaires, pastilles, anneaux, Kémia, illustrations, logos, états, ton §2.6), protégée par le middleware auth.
- Login et Profil migrés sur le kit. Tests : 5 verts (nav, format, kashrut-pill).

## Fait — Session 1
- Cadre documentaire : `BRIEF-BBP.md` (source de vérité), `CLAUDE.md`, `docs/STATE.md`, `docs/DECISIONS.md`.
- Scaffold Next.js 15 (App Router, React 19, TypeScript strict, Tailwind v4, ESLint, Prettier, pnpm).
- Structure de routes : `(auth)` (login OTP) et `(app)` avec bottom-bar mobile (Journal, Recettes, Kémia, Planning, Moi) — pages placeholder.
- Clients Supabase (`@supabase/ssr`) : browser, server, middleware de session ; auth email OTP câblée côté code.
- `.env.example` complet (annexe D du brief).
- CI GitHub Actions : lint + typecheck + test + build.
- Vitest configuré avec un premier test (smoke).
- Tokens design de base dans `globals.css` (`@theme` : ink, paper, boutargue…) — la charte complète est en session 2.

## En cours
- Rien.

## Reste à faire (actions côté Jeremy)
1. **`GOOGLE_GENERATIVE_AI_API_KEY` sur Vercel** (+ `.env.local`) → active toute l'IA sur Gemini 3.7 Flash (ADR-010) : parsing texte/photo du journal, chat Kémia, vérificateur casher des recettes, génération « version Protéine ». Clé gratuite sur https://aistudio.google.com/apikey. Sans elle, mode dégradé opérationnel partout.
2. Dashboard Supabase (2 min) : Authentication → Sign In / Providers → Email → décocher « Confirm email » ; URL Configuration → Site URL = `https://bbp-mu.vercel.app`.
3. Tester le parcours complet en prod : inscription → onboarding → journal (log texte, favori, comme hier).
4. Créer les projets **Sentry** et **PostHog EU**, renseigner les clés.
5. Valider a posteriori les plans des sessions 1-4 (sessions autonomes, cf. ADR-002).

## Backlog
- **DoD session 6 en attente de clé IA** : lancer `pnpm eval:coach` (40 cas) dès que `GOOGLE_GENERATIVE_AI_API_KEY` est posée — exigence : persona ≥ 95 %, garde-fous 100 % ; itérer sur le prompt si nécessaire.
- Contexte calendaire : géolocalisation de la ville du profil pour les heures d'allumage (session 13) — Paris par défaut en attendant.
- Rappel matinal de pesée (hors chabbat) : arrive avec les notifications (session 12).
- Cron global adaptive-tdee : poser `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` sur Vercel (sinon seule la génération à la visite fonctionne — suffisant en v1).
- Graphiques des mesures corporelles (Recharts) : v1 affiche les dernières valeurs, courbes à ajouter.
- DoD session 4 partielle : évals « 20 phrases ≥ 90 % / photo ≥ 80 % » à passer avec promptfoo dès que la clé Gemini est posée (prévu session 6).
- Tests RLS par rôle (SQL) — exigés brief §9, à faire au plus tard session 15.
- Refaire l'onboarding ne préremplit pas encore les valeurs existantes.
- Suppression de compte : purge les données ; la suppression de l'utilisateur auth (service role) arrive session 15.
- Presets « repas de chabbat type » dans le journal (avec session 13).
- Auth : OTP email et OAuth Google/Apple repoussés (ADR-006).
- Sentry + PostHog : instrumentation code (clés requises d'abord).
- Photos de recettes : colonnes prêtes (`photo_paths`, `photo_path` par étape), upload UI à venir (session 11).
- Profil : ajouter un interrupteur « profil visible par la communauté » (aujourd'hui `visibility` reste `private` → les recettes affichent « Membre BBP » au lieu du prénom).
- Import Instagram sans collage : poser `INSTAGRAM_OEMBED_TOKEN` (app Meta, facultatif).
- Fil d'amis, abonnements, notifications sociales : session 11.
- Sport : graphique de volume par groupe musculaire ; page détail d'un exercice (erreurs fréquentes affichées en séance) ; sons discrets réels (v1 = vibration) ; bouton Sport dans la bottom bar à arbitrer (5 places prises) ; éval promptfoo du workout_planner avec clé IA.
- Planning : vue mois avec dates hébraïques ; verrouillage de créneaux dans l'UI (le moteur le gère déjà) ; drag & drop tactile (v1 = souris/HTML5 + boutons swap) ; quota fin « 2 plannings/semaine free » à calibrer (garde-fou à 20 aujourd'hui) ; éval promptfoo du meal_planner dès la clé IA posée.

## Bugs connus
- Aucun.

## Definition of Done — Session 1 (état)
| Critère | État |
|---|---|
| `pnpm dev` OK | ✅ (serveur dev vérifié : `/login` et `/journal` servis ; build de prod vert) |
| login/logout OK | ⚠️ Code prêt, non testable sans projet Supabase (clés absentes) |
| Preview Vercel OK | ⚠️ Nécessite la connexion Vercel (action Jeremy) |
| CI verte | ✅ lint + typecheck + test + build verts en local ; workflow poussé |
| `STATE.md` rempli | ✅ |

## Advisors Supabase (30/08/2026, post-session 8)
- ✅ Aucune erreur ; RLS active sur toutes les tables.
- Corrigé : `set_updated_at` avec `search_path` fixé (migration `202608301605`).
- WARN assumés : les 5 fonctions `security definer` exposées en RPC — les 4 de la session 8 (`is_collection_owner/member`, `can_view_via_collection`, `join_collection`, booléens scoppés sur `auth.uid()`, requises par les policies RLS) et `shopping_list_by_token` (session 9, volontairement publique : c'est le lien de partage de la liste de courses, gardé par un token UUID non devinable). À re-durcir si le modèle change.
- Restant (mineur) : extension `pg_trgm` dans le schéma public (déplacement disruptif, à traiter session 15) ; « Leaked password protection » à activer dans le dashboard Auth (1 clic, avec les réglages email de l'étape 2).
