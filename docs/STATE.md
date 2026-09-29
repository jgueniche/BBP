# STATE.md — État du projet Copine en cuisine (ex-BBP)

Dernière mise à jour : 29/09/2026 · Sessions 1 à 18 + charte Claude Design (tokens)

## Fait — Charte Claude Design : tokens appliqués (ADR-030)
- **Canevas Claude Design** (privé, à partager depuis son menu) : https://claude.ai/artifact/FJCbHw9jW7rQzZGwxJ9EXD — logo, monogramme, avatar Copine, palette clair/sombre, typo, composants, pastilles, icônes d'app, OG, 11 écrans mobiles + onboarding, fiche recette et fil desktop, états.
- **Palette validée par Jeremy** : fond **blanc**, texte encre prune `#2B2230`, accent unique **framboise** `#C0265E`, pastels de panneaux (rose, lilas, menthe, beurre, pêche, ciel), états ok/attention/neutre/à vérifier, régimes en un seul style neutre.
- **`globals.css`** : nouveaux tokens (`encre`, `framboise`, `nacre`, pastels, `neutral`, `verify`, `diet`) + tokens shadcn remappés ; anciens noms BBP (`ink`, `paper`, `boutargue`…) gardés en **alias** pour que toute l'app bascule sans réécrire les composants. Mode sombre prune nuit.
- `themeColor` (layout), manifeste, OG recette et vitrine `/design` alignés sur la palette.
- **Pastels posés dans les écrans** (`src/lib/utils/pastel.ts`, testé) : carnets (couleurs existantes remappées sans migration, noms accessibles), vignettes de recettes et groupes (pastel stable par slug), charte (un pastel par règle), Copine (bulles lilas / rose, mémoires lilas), Moi (règles lilas, notifications ciel), composer beurre (l'état vide du fil est rose), type de post beurre, substitutions menthe, avertissements casher en attention, minuteur menthe, note perso beurre, onboarding lilas, aides import/éditeur ciel, états vides rose ; variantes pastel du `Badge`. Textes noirs en dur sur fond teinté remplacés (lisibles en sombre).
- **Vitrine `/design` refaite** (palette, pastels et leurs usages, échelle typo, badges pastel, cartes recette/carnet réelles, bulles Copine, logo, signature, ton éditorial) ; textes BBP retirés (mode diète, calories, chabbat). **Logo** aligné sur le canevas (« Copine » droit + « en cuisine » italique framboise, médaillon à double filet) ; utilitaire **`vichy`** (liseré signature) ; token `framboise-soft`.
- **Identité exportée** (`public/brand/`) : logos `logo-on-light` / `logo-on-dark` / `logo-on-framboise` + `lockup-on-light` (médaillon + mot-symbole), médaillon `mark`, icône d'app (`icon`, `icon-square`), `mark-maskable` (zone sûre 80 %), `favicon`, `badge` monochrome pour les notifications ; favicon.ico 16/32/48 et apple-icon régénérés ; manifeste (+ maskable 192) et badge du service worker mis à jour ; anciens logos BBP supprimés.
- **Accessibilité** : interrupteurs de « Mes règles de cuisine » contrastés (contour et pastille `ink-50`, ≥ 3:1 sur pastel), mention du composer passée de `ink-30` à `ink-50`.
- **Rendu vérifié par captures** (clair + sombre, mobile + desktop) avec un **compte démo temporaire** créé via l'API admin (données privées uniquement : carnets, notes, planning, courses, Copine ; aucune publication), **supprimé après les captures**.
- Lint, typecheck, 121 tests, build verts.

## Fait — Session 18 (Brief v2 & grand ménage : BBP devient Copine en cuisine — ADR-029)
- **Nouvelles demandes de Jeremy** : l'app s'appelle **Copine en cuisine** ; Kémia devient **Copine**, au ton neutre (aucune orientation culturelle) ; typographie **classe, épurée, élégante** ; un **vrai réseau social** (actus, likes…).
- **Brief v2** : `BRIEF.md` (source de vérité), ancien brief archivé dans `docs/archive/BRIEF-BBP-v1.md` ; `CLAUDE.md` et `README.md` réécrits ; nom du paquet `copine-en-cuisine`.
- **Suivi santé supprimé** : journal (texte/voix/photo/code-barres, favoris, file hors ligne), poids, mesures, photos de progression, TDEE adaptatif, progrès, accueil calorique, gamification (XP, séries, badges, défis), nudges et crons (`vercel.json` sans cron), onboarding santé, agents `food_logger`/`nudger`, outils santé de l'assistante ; le planning n'a plus de cible calorique ni d'envoi au journal (kcal retirées de la grille).
- **Copine** : prompt **v2.0.0** neutre (pas d'expressions communautaires, pas de surnoms, pas de minceur, garde-fous cuisine/allergies/certification), outils `search_recipes`/`get_plan`/`propose_meal_plan`, contexte réduit au prénom + règles choisies, calendrier factuel sans vœux, mémoire sans santé ni religion ; avatar monogramme « C » ; évals promptfoo réécrites (12 persona + 10 garde-fous, contrôle mécanique des termes culturels et surnoms) — **à relancer avec la clé Gemini**.
- **Identité provisoire** : `src/lib/brand.ts` (`APP_NAME`, `COACH_NAME`), mot-symbole en **Cormorant Garamond** (titres en graisse 500-600, plus d'extra-gras), illustrations culturelles retirées (cocotte neutre), textes neutralisés partout (plus de bsahtek/mabrouk…), OG image, manifeste (`start_url` `/recettes`, raccourci Importer), métadonnées. Couleurs inchangées en attendant Claude Design.
- **Navigation** : Recettes · Planning · Communauté · Copine · Moi (mobile) ; sidebar Cuisine / Ensemble ; `/` → `/recettes`.
- **Onboarding express** : prénom + « j'ai 16 ans ou plus », rien d'autre.
- **Réseau social** : réactions universelles **J'adore ❤️ · Bravo 👏 · Miam 😋** (validées Zod), posts **Actu / J'ai cuisiné / Recette**, charte réécrite (toutes les cuisines et convictions bienvenues). Les fonctions sociales avancées sont planifiées en session 22.
- **Règles de cuisine opt-in** : casher et calendrier juif désactivés par défaut pour tout nouveau compte (code + migration), carte « Mes règles de cuisine » dans Moi.
- **« Version Protéine » → variante végétarienne** (même mécanique de recette liée, prompt sans régime).
- **RGPD** : export JSON étendu (recettes, carnets, notes, commentaires, posts, conversations, mémoires, plannings) ; suppression étendue au contenu créé.
- **Migrations appliquées en prod** (constaté le 29/09 via `list_migrations`) : `202609291100_drop_health_tracking.sql` (tables santé/gamification, bucket photos, colonnes profil, défauts opt-in) et `202609291110_universal_social_kinds.sql` (réactions et types de posts renommés, vue `post_stats` recréée). Types alignés.
- 117 tests verts (−88 : moteurs santé/gamification/file hors ligne supprimés), lint/typecheck/build OK ; rendu vérifié (`/login`, `/design`).

## Fait — Session 17 (Pivot : audit, veille, vision ; suppression du sport — ADR-027)
- **Pivot demandé par Jeremy** : sa femme reprend BBP pour en faire une app de cuisine **collaborative**, « girly », ouverte à **toutes les communautés et tous les régimes** (casher, halal, vegan, végétarien, pescétarien, végétarien indien…), l'**import depuis les réseaux sociaux** restant central ; charte à refaire en session dédiée Claude Design.
- **Audit complet + benchmark + vision + feuille de route + questions de cadrage** : `docs/PIVOT-2026.md` (verdict module par module : garder / généraliser / transformer / supprimer ; dette à traiter ; brief prêt à coller dans Claude Design). Version lisible et partageable (privée, à partager depuis son menu) : https://claude.ai/artifact/4ShBW5owYGYhAEYb9UmNbA
- **Veille (4 recherches web)** : aucun concurrent ne gère un repas pour des convives aux régimes mixtes ni de filtre casher/halal ; sur iPhone, une PWA ne peut pas recevoir de partage (coque native requise) ; l'oEmbed Instagram ne renvoie plus ni légende ni autrice depuis le 03/11/2025 (notre chemin à jeton Meta est obsolète) ; `@hebcal/core` (GPL-2.0) vérifié côté serveur uniquement.
- **Sport supprimé** : pages `/sport` (programme, séance guidée, log rapide), moteur `lib/workout` + agent `workout_planner` + seed des 188 exercices, outil Kémia `create_workout_program` (prompt coach **v1.2.0**), carte sport de l'accueil, liens journal/profil, série « sport », badges `yalla`/`marcheur-belleville`, défis `paris-tel-aviv`/`hanouka-8-8`, posts « séance », illustrations haltère/chaussure, récap hebdo sans séances. Les niveaux d'activité de l'onboarding restent (ils nourrissent le TDEE).
- **Migration `202609291000_drop_sport_module.sql` écrite mais NON appliquée** : supprime `workout_sessions`, `workout_programs`, `exercises`, convertit les posts « séance » en messages, retire série/badges/défis sport et resserre les contraintes. Types `src/db/types.ts` alignés sur le schéma post-migration.
- **Cadrage validé par Jeremy (ADR-028)** : suivi santé supprimé ; V1 collaborative = foyer + Tablée + carnets partagés + communauté publique ; Kémia devient une copine en cuisine multiculturelle ; app iPhone/Android rapidement (coque native + extension de partage). Réponses par défaut des questions 5 à 12 retenues sauf objection.
- 205 tests verts (−10 : moteur sport et badges sport), lint/typecheck/build OK.

## Fait — Session 16 (PWA, performance, accessibilité, SEO — brief §10.14, ADR-025/026)
- **PWA Serwist (`@serwist/turbopack`)** : service worker compilé par esbuild et servi par la route `/serwist/sw.js` (scope `/` via `Service-Worker-Allowed`), précache de l'app shell (`/_next/static`, marque, page `/~offline`), stratégies par défaut Next + **cache dédié des recettes consultées** (`/recettes/[slug]`, mode cuisine, `/r/[slug]` — 60 entrées, 14 jours) ; **fallback `/~offline`** pour toute page non mise en cache. **Web Push intégré** dans le même worker (handlers `push`/`notificationclick` portés de `public/sw.js`, supprimé) : même scope, l'enregistrement est mis à jour en place — **les abonnements existants sont conservés**.
- **Manifest** (`/manifest.webmanifest`) : icônes 192/512 + maskable, `standalone`, couleurs de la coquille, raccourcis Journal/Kémia, **Web Share Target** (GET → `/recettes/importer?url=&text=&title=`) : un lien partagé depuis TikTok/Instagram/un site est analysé automatiquement, un texte est prérempli. Icône Apple 180 px, `theme-color` clair/sombre, `viewport-fit=cover`.
- **Install prompt** : carte flottante au-dessus de la bottom bar dès que le navigateur le permet (« Plus tard » = silence 30 jours), carte « Installer BBP » dans Moi (état installé / bouton / consigne iOS).
- **File hors ligne du journal** : sans réseau, la saisie texte/voix est découpée localement (parseur FR), confirmée puis **mise en attente** (localStorage, Zod) avec les favoris ; bandeau « Hors ligne » puis « N repas en attente » + bouton Synchroniser ; **rejeu automatique** au retour du réseau, au focus et au montage via `syncQueuedMeal` (les aliments sont ré-appariés à la base côté serveur, calories comprises). Liste « En attente de synchronisation » dans le journal (retrait possible). Photo, scan et « comme hier » restent réseau (message explicite).
- **SEO pages publiques** : `/r/[slug]` en **SSG + ISR 1 h** (`generateStaticParams` sur les 200 dernières recettes communautaires) avec ingrédients, étapes, nutrition par portion et **JSON-LD `Recipe`** (durées ISO 8601, `HowToStep`, `NutritionInformation`, crédit auteur `isBasedOn`) ; `sitemap.xml` (recettes publiques + login, revalidé 1 h), `robots.txt` (app privée interdite), canonical + Open Graph `article`, `metadataBase` (`NEXT_PUBLIC_SITE_URL` ou domaine Vercel), **`noindex` sur tout l'espace connecté**, page 404 brandée. Image OG passée au style « pro & chaleureux ».
- **Accessibilité AA** : lien d'évitement « Aller au contenu » + `main#main` partout, **focus visible** global (outline ring 2 px) en complément des rings du kit, `--ink-50` remonté à `#6b6b6b` (contraste 5,3:1 sur blanc, 4,8:1 sur la coquille — l'ancien `#7a7a7a` était à 4,48:1), libellés FR des boutons de fermeture (dialog/sheet), `prefers-reduced-motion` respecté globalement, libellés de navigation externalisés.
- **Performance** : polices `display: swap`, images AVIF/WebP, `poweredByHeader` off, précache incrémental (79 entrées, 3,5 Mo au premier install — chunks hashés réutilisés d'un déploiement à l'autre).
- **Nudger** : `maxOutputTokens` 100 → **512** + `thinkingLevel: low` (Gemini 3.7 Flash raisonne avant de répondre, la phrase était tronquée).
- **Tests** : 215 unitaires verts (+15 : file hors ligne rejouée offline → online, entrée toxique abandonnée après 5 tentatives, parsing du partage, règle de la bannière d'installation, JSON-LD) ; **3 tests Playwright** (`pnpm test:e2e`, build de prod requis, Chromium via `CHROME_PATH`) : manifest + SW enregistré sur `/serwist/sw.js` scope `/`, **page jamais visitée servie par le shell hors ligne**, lien d'évitement premier focus. lint/typecheck/build OK.

### Audit Lighthouse mobile (DoD §10.14) — build de production locale, Lighthouse 13.4, Chromium 141, émulation mobile
| Page | Performance | Accessibilité | Bonnes pratiques | SEO |
|---|---|---|---|---|
| `/login` | 92 (LCP 3,3 s, TBT 60 ms, CLS 0) | 100 | 100 | 100 |
| `/~offline` | 98 (LCP 2,5 s, CLS 0) | 100 | 100 | 63 (`noindex` volontaire) |

Limites : la base Supabase de BBP n'est pas exposée au connecteur MCP de cette session, donc `/r/[slug]` et les pages connectées (qui nécessitent une session) n'ont pas pu être auditées en local ; à re-mesurer sur la prod (Chrome DevTools › Lighthouse, mobile) après connexion.

### Vérification de production (03/09/2026, PR #5 mergée → déploiement Vercel `28a561e` READY sur `bbp-mu.vercel.app`, région cdg1)
- Smoke test OK : `/login`, `/~offline`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml` (35 recettes publiques, URLs canoniques prod), `/apple-icon.png`, `/serwist/sw.js` (47 Ko, `Service-Worker-Allowed: /`, handlers push présents, entrée `/~offline` précachée), ancien `/sw.js` en 404 attendu, `/r/couscous-au-poisson` avec JSON-LD `Recipe` + canonical + image OG (PNG 58 Ko).
- Audit Lighthouse **de la prod** non réalisable depuis la sandbox de session : le proxy de sortie coupe les connexions TLS de Chromium (refus de politique, pas un défaut de l'app) et le quota anonyme de PageSpeed Insights était épuisé. Les scores ci-dessus proviennent du même build en local ; à confirmer d'un clic dans Chrome DevTools › Lighthouse (mobile) sur `https://bbp-mu.vercel.app/login` et `/r/couscous-au-poisson`.

### DoD « log hors ligne resaisi → synchronisé au retour du réseau »
- Logique testée unitairement (`offline-queue.test.ts` : échec réseau → file conservée → rejeu intégral au retour) et parcours e2e du shell hors ligne. Le parcours complet avec compte (saisie sans réseau → bandeau → reconnexion → repas en base avec calories) est à rejouer en prod une fois connecté : Chrome DevTools › Network › Offline, saisir « couscous et boulettes », confirmer, repasser en ligne.

## Fait — Session 15 (Kémia : conversations multiples + passe UI/UX du chat, ADR-024)
- **Conversations multiples** : liste (panneau latéral Historique), bascule via `/coach?c=<id>` (défaut = plus récente), **nouvelle conversation** (bouton + dans l'en-tête et le panneau), **suppression** avec confirmation en deux taps (messages en cascade, mémoires conservées). Titre auto = premier message (60 car., figé), tri par activité (`updated_at` retouché à chaque échange). L'API `/api/coach` reçoit `conversationId` (vérifié possédé, zod) — le fil actif ne peut plus sauter sur une autre conversation. Lien « Ce que Kémia sait de toi » déplacé dans le panneau.
- **Bug d'affichage corrigé** : la barre de saisie `sticky` sans fond passait par-dessus les messages (« mange le texte »). Le chat a désormais sa propre zone de défilement (hauteur calée sur le viewport, en-tête et composer fixes) — plus aucun chevauchement, auto-scroll fiable dans le conteneur.
- **Passe UI/UX** : composer en carte (textarea auto-extensible jusqu'à 6 lignes, Entrée envoie / Maj+Entrée à la ligne, bouton désactivé si vide), indicateur « Kémia réfléchit » en vraie bulle à points animés (reduced-motion respecté), `whitespace-pre-wrap` + `break-words` sur les bulles (retours à la ligne et longues URLs), historique par conversation (50 derniers messages, plus de fuite entre fils), rafraîchissement de la liste en fin de réponse.
- 200 tests verts, lint/typecheck/build OK.

## Fait — Session 14 (Refonte UI/UX « pro & chaleureux », ADR-022)
- **Direction validée par Jeremy sur maquettes** (canevas « Refonte BBP » : 6 écrans desktop, 1 mobile, 2 pistes alternatives) : fini l'effet BD, la marque reste (Bricolage/Inter/JetBrains Mono, orange boutargue rationné, pastilles casher, jamais de rouge punitif).
- **Tokens & kit** (`globals.css` + `components/ui/*`) : filets 1 px (`--line`), ombres douces (`shadow-soft`/`shadow-pop`), radius 14 px, fond coquille `--shell` + cartes blanches, boutons pleins rectangulaires, tabs segmentées douces, badges teintés — dark mode recalé sur les nouvelles surfaces.
- **Nouvelle architecture** : sidebar desktop à deux groupes **MON SUIVI** (Aujourd'hui, Journal, Progrès, Sport, Planning) / **CUISINE & COMMUNAUTÉ** (Recettes, Communauté) + Kémia et Moi en pied ; bottom bar mobile 5 onglets (Accueil, Journal, Cuisine, Kémia, Moi, l'onglet Cuisine couvre `/recettes` + `/communaute`) ; conteneur `max-w-6xl` (fini la colonne mobile de 512 px sur desktop).
- **`/accueil`** : nouveau hub du jour (anneau calories, protéines, tendance poids EWMA, série journal, assiette du jour + dîner planifié, résumé sport de la semaine, carte Kémia contextuelle, prochain allumage) ; la racine `/` y redirige.
- **Fusion `/poids` → `/progres`** : pesée/tendance/graphique/proposition TDEE/mesures/photos + niveau/séries/badges/défis sur grilles desktop ; `/poids` redirige.
- **Passe desktop + balayage complet** : plus aucune classe sticker dans `src/` (bordures 2 px, `shadow-sticker`, translations au clic) ; grilles responsives sur Recettes (cartes 2-3 col.), Sport (2 col.), Profil (2 col.), Journal (rail résumé), largeurs de lecture sur Communauté/Coach ; `/design` documente le nouveau style. 191 tests verts, lint/typecheck/build OK.
- **Progrès recentré sur le programme (ADR-023)** : carte « Mon objectif » en tête de `/progres` — départ → aujourd'hui → cible (cible **modifiable en place**, garde-fou serveur : jamais sous IMC 18,5 via `minHealthyTargetKg`), % du chemin, rythme prévu vs réel, arrivée prévue vs estimée, badge d'écart au plan (jamais culpabilisant) ; **trajectoire prévue en pointillés** sur le graphique de poids (lib pure `nutrition/goal-plan` : décroissance composée au `weekly_rate_pct`, interpolation, 9 tests — 200 verts), axe passé sur une vraie échelle de temps avec fenêtre passé + futur par période ; mode accompagnement = message doux sans chiffres. **Progrès entre dans la bottom bar mobile** (Accueil, Journal, Progrès, Cuisine, Kémia) ; « Moi » passe sur l'avatar de l'en-tête d'Accueil.

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
- `public/brand/` : SVG sources (texte vectorisé, Cormorant Garamond) + `node scripts/export-brand.mjs` (sharp) → PNG icônes 192/512, maskable 192/512, favicon 32, badge 96, logos 1024, `src/app/apple-icon.png` et `src/app/favicon.ico` ; `src/app/icon.svg` (favicon vectoriel).
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
- **Migrations bloquées (29/09)** : le compte Supabase connecté aux sessions Claude ne contient pas le projet de l'app (seulement « Alpha Report » et « ShiftX »). Les appliquer depuis le SQL Editor du projet, ou connecter le bon compte Supabase.
- **Au déploiement** : appliquer dans l'ordre `202609291000_drop_sport_module.sql`, `202609291100_drop_health_tracking.sql`, `202609291110_universal_social_kinds.sql` (destructives : historique sport et santé supprimés). Sans elles, les pages sociales lisent encore les anciens noms de réactions (`post_stats`) : **appliquer la 1110 en même temps que le déploiement**.
- **Session Claude Design** : brief prêt dans `docs/CLAUDE-DESIGN-BRIEF.md` (en précisant : typographie classe, épurée, élégante ; Cormorant Garamond en place provisoirement).
- **Relancer `pnpm eval:coach`** avec la clé Gemini pour valider la voix de Copine (DoD : persona ≥ 95 %, garde-fous 100 %).
- (Facultatif) domaine et `NEXT_PUBLIC_SITE_URL` au nom de Copine en cuisine ; renommer le projet Vercel.
- `GOOGLE_GENERATIVE_AI_API_KEY` sur Vercel pour l'IA (import, Copine, variantes, planning) ; sans elle, mode dégradé.
- Dashboard Supabase : « Confirm email » et Site URL (cf. ADR-006) ; clés Sentry/PostHog le moment venu.

## Backlog
- **Opt-in casher à faire respecter** : la fiche recette affiche la pastille Bassari/Halavi et la mention « demande à ton rabbin » même quand les règles de cacherout sont désactivées (constaté sur le compte démo) → à traiter avec le moteur multi-régimes (S19).
- **Charte (suite)** : migrer les composants des alias BBP (`ink`, `boutargue`…) vers les tokens Copine, pastels à poser sur les futurs écrans Tablée et compatibilité, image de partage Open Graph du site (attend de vraies photos), repenser les couleurs halavi/bassari dans le moteur multi-régimes.
- **Régimes (S19)** : moteur multi-régimes, profils alimentaires, allergies et dégoûts avec consentement (les anciennes allergies du profil santé ont disparu avec lui) ; filtres Recettes « Origine » encore maghrébins et « Casher » seul ; catégories à élargir.
- **Import (S20)** : chemin Instagram par jeton Meta obsolète (l'oEmbed ne renvoie plus de légende) → capture/légende copiée ; YouTube ne lit que le titre ; pas de quota ni de file de jobs ; pas d'upload de photos de recettes.
- **Réseau social (S22)** : photos dans les posts, notifications (réactions, commentaires, abonnés — infra push `lib/push/send.ts` conservée, sans usage aujourd'hui), temps réel, mentions, pagination du fil (30 derniers), réactions sur commentaires, profils de créatrices.
- **Copine** : outils « adapter une recette » et « composer une Tablée » ; renommer une conversation ; recherche dans l'historique.
- **Variantes (S25)** : la variante végétarienne est la seule ; `version_kind` garde ses clés historiques (`boutargue`/`proteine`, libellés Originale/Variante).
- **Planning** : rattachement au foyer (S23) ; vue mois ; verrouillage de créneaux ; drag & drop tactile ; le validateur garde sa logique de cible calorique inactive (toujours `null`).
- **PWA** : Web Share Target perd `url/text` si non connecté (ajouter `next=`) ; précache à affiner ; e2e hors CI.
- **Production (S27)** : CGU, confidentialité, CSP, rate limiting, tests RLS par rôle, suppression du compte auth (service role), Sentry/PostHog sans PII, OAuth Apple/Google.
- Branches distantes obsolètes (`feat/coach-conversations`, `claude/kemia-agent-ui-ux-moo7wp`) à supprimer après accord.

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
