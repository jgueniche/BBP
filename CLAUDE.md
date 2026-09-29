# CLAUDE.md — Copine en cuisine

Le réseau social de la cuisine : on suit ses copines et ses créatrices, on garde toutes les recettes vues sur Insta et TikTok (import crédité), et on cuisine ensemble quelle que soit la table (règles de cuisine simples, carnets, planning, foyer, Tablée). Source de vérité : `BRIEF.md` (v3). État : `docs/STATE.md`. Décisions : `docs/DECISIONS.md`. Feuille de route et pourquoi : `docs/PLAN-SOCIAL-2026.md` (+ veille `docs/BENCHMARK-SOCIAL-2026.md`, pivot initial `docs/PIVOT-2026.md`). Ancien produit (BBP) : `docs/archive/BRIEF-BBP-v1.md`, **ne plus s'en inspirer**.

## Rituel de session
1. Lire ce fichier + `docs/STATE.md` + la session concernée (`BRIEF.md` §9).
2. Plan en ≤ 15 lignes, validation, puis commits atomiques.
3. Avant tout commit final : `pnpm lint` + `pnpm typecheck` + `pnpm test` verts (+ `pnpm build` si routes touchées).
4. Mettre à jour `STATE.md` / `DECISIONS.md`. Résumé ≤ 10 lignes (livré / non livré / risques).
5. Ne jamais anticiper la session suivante ; le manque va dans `STATE.md › Backlog`.
6. Migrations écrites dans le dépôt et rejouées sur un Postgres local, **jamais appliquées en prod sans l'accord explicite de Jeremy**.

## Stack
- Next.js 15 App Router + RSC + Server Actions, React 19, TypeScript **strict** (zéro `any`), pnpm, Node 22.
- UI : Tailwind v4 (tokens CSS de la charte Claude Design dans `globals.css`), shadcn/ui, Lucide, Motion.
- Zod à toutes les frontières (Server Actions, API, IA, imports).
- Supabase Paris : Postgres avec **RLS sur toute table**, Auth, Storage, Realtime. Migrations `supabase/migrations/YYYYMMDDHHMM_description.sql` ; types `src/db/types.ts` alignés à chaque migration.
- IA : Vercel AI SDK (`src/ai/provider.ts`), Gemini 3.7 Flash par défaut, repli Claude ; prompts versionnés `src/ai/prompts/*.ts` avec `PROMPT_VERSION` ; tout marche en mode dégradé sans clé.
- Aucune dépendance GPL. PWA Serwist (partage Android) ; coque native Capacitor prévue (session 24). Hébergement Vercel `cdg1`.

## Arborescence
```
src/
  app/          (auth)/ (app)/ recettes/ planning/ communaute/ coach/ profil/ admin/ onboarding/ design/ r/ courses/ api/
  components/   ui/ diets/ recipes/ social/ coach/ pwa/ illustrations/
  ai/           prompts/ tools/ agents/ evals/
  lib/          brand.ts diets/ recipes/ supabase/ import/ planning/ nutrition/ social/ moderation/ seo/ pwa/ push/ utils/
  db/           seed/ types.ts
  i18n/         fr.ts (tout texte UI)
scripts/        générateurs de graines (Ciqual, recettes de départ)
docs/           STATE.md DECISIONS.md PLAN-SOCIAL-2026.md BENCHMARK-SOCIAL-2026.md PIVOT-2026.md archive/
```

## Conventions
- Git : branches de session, Conventional Commits, PR par session. Code/commentaires/commits en **anglais** ; UI, contenu, prompts, docs produit en **français**.
- Mutations via Server Actions ; webhooks/jobs via route handlers ; pas de logique métier dans les composants.
- Toute table : `id uuid`, `created_at`, `updated_at`, `user_id` si applicable, RLS activée.
- Tests unitaires obligatoires pour la logique métier (régimes, import, planning, validateurs).
- Noms produit via `src/lib/brand.ts` (`APP_NAME`, `COACH_NAME`), jamais en dur.
- Tout texte UI dans `src/i18n/fr.ts`.

## Produit
- **Utile seule, meilleure à plusieurs** ; **la recette au centre** (chaque photo, astuce, version, réaction s'y rattache) ; **crédit et trafic aux créatrices**, toujours.
- Ordre de construction : l'utilité d'abord, les petits cercles ensuite, le public en dernier. Indicateur clé : part des recettes importées qui deviennent un « j'ai cuisiné ». Pas de publicité dans le fil.
- Pas de séries punitives ni de classements au volume ; notifications rares et utiles ; géolocalisation retirée des photos ; modération active dès le premier jour.

## Ton et identité
- **Neutre, chaleureux, élégant** : tutoiement, phrases courtes, jamais de moralisation. **Aucune couleur culturelle ou religieuse** (pas d'expressions communautaires, pas de vœux religieux, pas de surnoms), ni dans l'UI ni chez l'assistante.
- **Zéro culture du régime** : ni poids, ni calories en vedette, ni objectif minceur, ni culpabilité. Jamais de rouge punitif.
- Charte Claude Design (ADR-030) : fond blanc, encre prune, accent framboise, pastels de panneaux. Titres en **Cormorant Garamond** (500-600), texte en Inter, données en JetBrains Mono. AA minimum, `prefers-reduced-motion`.

## Copine — l'assistante IA
- Copine en cuisine : recettes, adaptations, planning, recevoir. Outils : `search_recipes` (renvoie le verdict de la personne), `get_plan`, `propose_meal_plan`.
- 1–4 phrases (listes pour recettes/menus) ; ≤ 1 emoji jamais en tête ; aucune expression culturelle, aucun surnom.
- Contexte : prénom, règles de cuisine, allergies et dégoûts consentis, date du jour ; aucun calendrier religieux.
- Garde-fous : jamais de régime minceur ni de calories à perdre ; mal-être alimentaire → douceur, aucun chiffre, orientation pro ; ni diagnostic ni médicament ; allergies → vérifier les étiquettes ; casher/halal → indication, jamais certification ; ne juge ni ne questionne jamais les convictions.
- Mémoire : goûts, équipement, foyer, événements ; jamais santé, allergies ni religion.
- Évals : `pnpm eval:coach` (persona ≥ 95 %, garde-fous 100 %).

## Régimes (ADR-031, ADR-032)
- **Préférences simples, opt-in** dans « Moi › Mes règles de cuisine » : végétarien, vegan, pescétarien, sans porc, sans alcool, halal, casher, sans gluten, sans lactose, 14 allergènes UE, « je n'aime pas ». Jamais sur le profil, jamais d'étiquette d'identité.
- Moteur `src/lib/diets/` : attributs **neutres** par ingrédient → verdict par recette **compatible · adaptable · incompatible (gris neutre) · à vérifier** ; chaque substitution est revérifiée contre toutes les règles actives. Calcul à la lecture, rien de stocké sur les recettes.
- **Plus de sous-classes religieuses** : ni viande/lait/parvé, ni délais, ni Pessah, ni calendriers religieux. La finesse vient des étiquettes et catégories créées par les membres (session 20).
- La compatibilité s'affiche sur les recettes, jamais sur les personnes. Le planner ne planifie que des recettes compatibles et valide toujours ses sorties par programme.
- Mentions : « compatible halal (ingrédients) », « casher (indication) », « viande à choisir certifiée », « sans ingrédient contenant du gluten » ; jamais « certifié » ni « sans allergènes ».

## Import social
- Déclenché par l'utilisatrice ; sources officielles d'abord (TikTok oEmbed, JSON-LD, API YouTube) ; Instagram par capture ou légende copiée (l'oEmbed ne renvoie plus de légende).
- Fiche **reformulée**, jamais la légende mot pour mot ; ni vidéo ni photo ré-hébergée ; crédit « d'après @X » + lien + embed officiel ; retrait sur demande. Pas de téléchargement de vidéo sans avis juridique. Pages publiques référencées uniquement pour les recettes originales des membres.

## Commandes
- `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` · `pnpm eval:coach`.
- Env : copier `.env.example` → `.env.local`. Secrets côté serveur uniquement.

## Sécurité & RGPD
- Régimes religieux et allergies = données sensibles (art. 9) : consentement explicite (enregistré avec sa date, revérifié côté serveur et par contrainte SQL), minimisation, jamais dans l'analytics ni sur une carte partageable.
- Export JSON et suppression self-service de tout le contenu créé. Hébergement UE. Refus < 16 ans. DSA (signalement, motivation, CGU, contacts), AI Act art. 50, CSP, rate limiting, tests RLS : session Production (25).
