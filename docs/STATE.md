# STATE.md — État du projet BBP

Dernière mise à jour : 30/08/2026 · Sessions 1 à 14

## Fait — Session 14 (Refonte UI/UX « pro & chaleureux », ADR-022)
- **Direction validée par Jeremy sur maquettes** (canevas « Refonte BBP » : 6 écrans desktop, 1 mobile, 2 pistes alternatives) : fini l'effet BD, la marque reste (Bricolage/Inter/JetBrains Mono, orange boutargue rationné, pastilles casher, jamais de rouge punitif).
- **Tokens & kit** (`globals.css` + `components/ui/*`) : filets 1 px (`--line`), ombres douces (`shadow-soft`/`shadow-pop`), radius 14 px, fond coquille `--shell` + cartes blanches, boutons pleins rectangulaires, tabs segmentées douces, badges teintés — dark mode recalé sur les nouvelles surfaces.
- **Nouvelle architecture** : sidebar desktop à deux groupes **MON SUIVI** (Aujourd'hui, Journal, Progrès, Sport, Planning) / **CUISINE & COMMUNAUTÉ** (Recettes, Communauté) + Kémia et Moi en pied ; bottom bar mobile 5 onglets (Accueil, Journal, Cuisine, Kémia, Moi, l'onglet Cuisine couvre `/recettes` + `/communaute`) ; conteneur `max-w-6xl` (fini la colonne mobile de 512 px sur desktop).
- **`/accueil`** : nouveau hub du jour (anneau calories, protéines, tendance poids EWMA, série journal, assiette du jour + dîner planifié, résumé sport de la semaine, carte Kémia contextuelle, prochain allumage) ; la racine `/` y redirige.
- **Fusion `/poids` → `/progres`** : pesée/tendance/graphique/proposition TDEE/mesures/photos + niveau/séries/badges/défis sur grilles desktop ; `/poids` redirige.
- **Passe desktop + balayage complet** : plus aucune classe sticker dans `src/` (bordures 2 px, `shadow-sticker`, translations au clic) ; grilles responsives sur Recettes (cartes 2-3 col.), Sport (2 col.), Profil (2 col.), Journal (rail résumé), largeurs de lecture sur Communauté/Coach ; `/design` documente le nouveau style. 191 tests verts, lint/typecheck/build OK.

## Fait — Session 13 (Calendrier juif avancé)
- **Moteur unifié** (`lib/jewish-calendar/engine.ts`) : chaque jour porte chag / erev / jeûne / Pessah (erev + chol hamoed inclus) / Chavouot / Hanouka / **« budget kiff »** (fête joyeuse) + heures d'allumage et de sortie. **DoD : dates 2027 testées contre référence indépendante** (Pourim 23/03, Pessah 21-29/04, Chavouot 11/06, Ticha BeAv 12/08, Roch Hachana 02/10, Kippour 11/10, Hanouka 25/12) — 16 tests.
- **Ville du profil** : ~45 villes (France, Israël, diaspora) → coordonnées + fuseau réels pour les heures d'allumage (fuzzy, Paris par défaut) ; **délai bougies paramétrable** (18/20/30/40 min) ; **jeûnes mineurs opt-in** (Kippour/Ticha BeAv toujours affichés) ; **option Israël** (yom tov 1 jour, automatique si ville israélienne) — le tout éditable dans **Moi › Ma pratique**, avec kitniyot et poisson+viande.
- **Cache `jewish_calendar_cache`** (migration `202608302330`) : ~12 mois par utilisateur, hash des réglages — un changement de ville/minhag recalcule tout au prochain accès. Branché : planning (grille + générateur), journal, recettes.
- **Planning** : jours de fête = **budget kiff** (cible kcal non imposée, badge 🎉 sur la grille) ; **Chavouot : dîner lacté** (halavi/parvé) dans le générateur déterministe ; correction d'un bug latent (les restes du mercredi ignoraient les règles Pessah du jour). **DoD scénarios end-to-end** : semaine réelle de Pessah 2027 (zéro hametz, kitniyot selon minhag, validateur vert) et semaine de Kippour 2027 (aucun repas en journée, heures calmes de Kol Nidré à la sortie) — 9 tests.
- **Journal** : bannière jeûne (conseils hydratation, **aucun objectif calorique ce jour-là**, anneau sans cible), bannière Pessah avec **détection du hametz réellement loggé** (et kitniyot si profil strict) + rappel « cacher léPessah » pour les produits scannés, bannière chabbat/fête en cours (heure de sortie), **presets « repas de chabbat »** dans les chips (vendredi/samedi/chag), bannière **mode après-fêtes** (7 jours après Tichri, Pessah, Hanouka — recadrage doux, zéro culpabilité).
- **Kémia** : contexte calendaire réécrit — **vœux automatiques** (chabbat chalom, hag saméah, tsom kal, hanouka saméah), budget kiff (« aucun discours de déficit »), Chavouot lacté, mode après-fêtes, heures selon la ville du profil.
- **Badges débloqués** : `pessah-sans-hametz` (jours de Pessah journalisés sans hametz), `apres-fetes` (≥ 5 jours de journal dans la semaine post-fêtes), `kif-kif` (mois stable en mode Boutargue : tendance ±2 % sur ≥ 21 jours). Nudges : heures calmes **par ville** + aucun nudge les jours de jeûne. 191 tests verts.

## Fait — Session 12 (Gamification & notifications)
- **XP & niveaux** (migration `202608302230`) : XP **recalculée de façon déterministe** (journal ×10, pesée ×5, séance ×20, recette publiée ×30, import ×10, post ×5, km de marche ×2, +50 par badge — aucun journal d'événements à désynchroniser), 5 niveaux §4.10 (Apprenti·e boulette → Roi/Reine de la boutargue), barre de progression sur `/progres`.
- **Séries (streaks)** journal / sport / pesée avec la **tolérance chabbat & fêtes : un jour exempt ne casse jamais une série et ne compte jamais** (samedi + chag via hebcal) ; flamme + record par carte.
- **16 badges annexe B** seedés et attribués par règles pures — **DoD : chaque badge testé attribué ET retenu sur fixtures** (45 nouveaux tests, 166 verts). Badges fêtes (Pessah sans hametz, après-fêtes, kif-kif) : stats branchées en session 13, verrouillés d'ici là.
- **6 défis annexe C** seedés : rejoindre/quitter, progression personnelle (journal, séances, recettes protéinées) et **défis collectifs** (Paris–Tel Aviv 3 300 km : total via RPC `challenge_totals`) ; « Défi Elloul » prêt pour le calendrier.
- **Web Push maison** (`public/sw.js`, table `push_subscriptions`) : carte Notifications dans Moi — activer = permission navigateur + clé VAPID, **désabonnement en 1 clic (DoD)**, messages d'état si navigateur incompatible/bloqué/serveur non configuré.
- **Nudger Kémia** : cron quotidien `/api/cron/nudges` (7 h UTC, un seul cron — plan Vercel Hobby limité à 2) qui infère le créneau — **vendredi : « lancer la dafina » (erev chabbat)**, dimanche : récap hebdo (+ email Resend si clé), sinon pesée du matin ; `?slot=matin|soir|dafina|recap` pour un tir manuel. 1 phrase Kémia par IA légère, sinon rotation de phrases maison. **Garde-fous : heures calmes hebcal (jamais pendant chabbat/chag pour les pratiquants — DoD testée, y compris chabbat+Roch Hachana enchaînés), plafond 2/jour via la table `notifications`, créneau dafina réservé aux profils calendrier activé.**
- Journal des notifications en base (kinds : nudge matin/soir, erev chabbat, récap, badge), nettoyage automatique des abonnements morts (410).

## Fait — Session 11 (Social)
- **Feed communautaire `/communaute`** (migrations `202608302130` + `202608302140`) : posts 5 types (texte / recette attachée / progrès / plat de chabbat — suggéré le vendredi / séance), onglets Tout le monde · Abonnements · Groupes, **réactions ×3 (Bsahtek 🧡 / Mabrouk ⭐ / Ya ouili 😮**, une par personne, switchable), commentaires dépliables, suppression par l'auteur du post/commentaire.
- **Modération à deux étages** : filtre heuristique FR (haine/harcèlement, pro-TCA, médical dangereux, sensible→flag) — **DoD : 20 cas bloqués testés** (28 tests) — + agent `moderator` (IA légère) dès la clé posée. Bloqué = jamais publié (motifs affichés) ; sensible = publié + flaggé. **File `/admin/moderation`** (signalements + flaggés : retirer/rétablir/ignorer) — admins seedés : tes 2 comptes (`admin_users`, ajout via SQL).
- **Suivre / bloquer / signaler** sur chaque post ; page membre `/communaute/membre/[id]` ; **interrupteur « profil visible » dans Moi** (sinon « Membre BBP » partout) ; **charte communautaire** (`/communaute/charte` : respect, pas de lachon hara, zéro conseil médical dangereux).
- **Groupes publics** : création (icône, description, modérée), rejoindre/quitter, fil dédié réservé aux membres pour publier. RLS 3 paliers : privé (auteur), groupe (membres via `group_readable`), communauté.
- **Partage externe** : bouton « Partager au fil » sur les recettes, page publique `/r/[slug]` sans compte + **image OG dynamique** (`/api/og/recette/[slug]`, style sticker : icône, titre, pastille casher, temps) — le lien copié depuis la fiche a une belle preview partout. 121 tests verts.

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
0. **Notifications push** : générer les clés (`npx web-push generate-vapid-keys`) puis poser `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto:ton@email) + `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` sur Vercel. Sans elles, la carte Notifications l'explique et le cron répond 501 (aucun crash).
1. **`GOOGLE_GENERATIVE_AI_API_KEY` sur Vercel** (+ `.env.local`) → active toute l'IA sur Gemini 3.7 Flash (ADR-010) : parsing texte/photo du journal, chat Kémia, vérificateur casher des recettes, génération « version Protéine ». Clé gratuite sur https://aistudio.google.com/apikey. Sans elle, mode dégradé opérationnel partout.
2. Dashboard Supabase (2 min) : Authentication → Sign In / Providers → Email → décocher « Confirm email » ; URL Configuration → Site URL = `https://bbp-mu.vercel.app`.
3. Tester le parcours complet en prod : inscription → onboarding → journal (log texte, favori, comme hier).
4. Créer les projets **Sentry** et **PostHog EU**, renseigner les clés.
5. Valider a posteriori les plans des sessions 1-4 (sessions autonomes, cf. ADR-002).

## Backlog
- Refonte : fiche recette et import encore mono-colonne sur desktop (2 col. à envisager) ; message Kémia de `/accueil` déterministe (brancher l'IA légère comme les nudges) ; onglet mobile Cuisine → accès Communauté à fluidifier (lien croisé dans l'en-tête des deux pages).
- **DoD session 6 en attente de clé IA** : lancer `pnpm eval:coach` (40 cas) dès que `GOOGLE_GENERATIVE_AI_API_KEY` est posée — exigence : persona ≥ 95 %, garde-fous 100 % ; itérer sur le prompt si nécessaire.
- Calendrier : ville libre hors liste (~45 villes) → horaires de Paris (géocodage complet à envisager) ; Yom HaAtsmaout optionnel non affiché ; vue mois du planning toujours en backlog.
- Notifications : le créneau du soir (`?slot=soir`, bilan du jour + jeudi courses) existe dans le code mais n'est pas planifié — le plan Vercel Hobby autorise 2 crons max (pris par adaptive-tdee et nudges du matin). Passer Pro ou ajouter un ping externe pour l'activer. Badge « Nouveau ! » : notification push à l'attribution d'un badge à brancher (kind `badge` prêt en base).
- Gamification : les 16 badges ont désormais tous leurs vraies stats (session 13).
- Cron global adaptive-tdee : poser `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` sur Vercel (sinon seule la génération à la visite fonctionne — suffisant en v1).
- Graphiques des mesures corporelles (Recharts) : v1 affiche les dernières valeurs, courbes à ajouter.
- DoD session 4 partielle : évals « 20 phrases ≥ 90 % / photo ≥ 80 % » à passer avec promptfoo dès que la clé Gemini est posée (prévu session 6).
- Tests RLS par rôle (SQL) — exigés brief §9, à faire au plus tard session 15.
- Refaire l'onboarding ne préremplit pas encore les valeurs existantes.
- Suppression de compte : purge les données ; la suppression de l'utilisateur auth (service role) arrive session 15.
- Journal : le réglage « pas de poisson avec la viande » est appliqué structurellement par le planner (un plat par créneau) et signalé à Kémia ; pas encore de contrôle dans le journal libre.
- Auth : OTP email et OAuth Google/Apple repoussés (ADR-006).
- Sentry + PostHog : instrumentation code (clés requises d'abord).
- Photos de recettes : colonnes prêtes (`photo_paths`, `photo_path` par étape), upload UI à venir (session 11).
- Profil : ajouter un interrupteur « profil visible par la communauté » (aujourd'hui `visibility` reste `private` → les recettes affichent « Membre BBP » au lieu du prénom).
- Import Instagram sans collage : poser `INSTAGRAM_OEMBED_TOKEN` (app Meta, facultatif).
- Social : feed Realtime (v1 = rafraîchissement), mentions @, groupes privés sur invitation, réactions sur commentaires, pagination du feed (v1 = 30 derniers), Communauté dans la bottom bar à arbitrer ; notifications sociales (bsahtek/commentaire reçus) non branchées — l'infra push de la session 12 est prête à les porter.
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

## Advisors Supabase (30/08/2026, post-session 12)
- ✅ Aucune erreur ; RLS active sur toutes les tables.
- Corrigé : `set_updated_at` avec `search_path` fixé (migration `202608301605`).
- WARN assumés : les fonctions `security definer` exposées en RPC — session 8 (`is_collection_owner/member`, `can_view_via_collection`, `join_collection` : booléens scoppés sur `auth.uid()`, requis par les policies RLS), `shopping_list_by_token` (session 9, volontairement publique : lien de partage gardé par un token UUID non devinable), session 11 (`is_admin`, `is_group_member`, `group_readable`, `admin_set_moderation` : auto-scopés ou gardés par `is_admin`) et `challenge_totals` (session 12 : agrégats anonymes des défis collectifs, zéro donnée personnelle). À re-durcir si le modèle change.
- Restant (mineur) : extension `pg_trgm` dans le schéma public (déplacement disruptif, à traiter session 15) ; « Leaked password protection » à activer dans le dashboard Auth (1 clic, avec les réglages email de l'étape 2).
