# CLAUDE.md — Copine en cuisine

App de cuisine collaborative, inclusive (toutes les communautés, tous les régimes) et élégante : import de recettes depuis Instagram/TikTok/sites, adaptation par régime, réseau social, carnets, foyer, Tablée. Source de vérité : `BRIEF.md`. État : `docs/STATE.md`. Décisions : `docs/DECISIONS.md`. Pourquoi (audit, benchmark, règles des régimes) : `docs/PIVOT-2026.md`. Ancien produit (BBP, coach minceur casher) : `docs/archive/BRIEF-BBP-v1.md`, **ne plus s'en inspirer**.

## Rituel de session
1. Lire ce fichier + `docs/STATE.md` + la session concernée (`BRIEF.md` §9).
2. Plan en ≤ 15 lignes, validation, puis commits atomiques.
3. Avant tout commit final : `pnpm lint` + `pnpm typecheck` + `pnpm test` verts (+ `pnpm build` si routes touchées).
4. Mettre à jour `STATE.md` / `DECISIONS.md`. Résumé ≤ 10 lignes (livré / non livré / risques).
5. Ne jamais anticiper la session suivante ; le manque va dans `STATE.md › Backlog`.
6. Migrations écrites dans le dépôt, **jamais appliquées en prod sans l'accord explicite de Jeremy**.

## Stack
- Next.js 15 App Router + RSC + Server Actions, React 19, TypeScript **strict** (zéro `any`), pnpm, Node 22.
- UI : Tailwind v4 (tokens CSS dans `globals.css`), shadcn/ui, Lucide, Motion.
- Zod à toutes les frontières (Server Actions, API, IA, imports).
- Supabase Paris : Postgres avec **RLS sur toute table**, Auth, Storage, Realtime. Migrations `supabase/migrations/YYYYMMDDHHMM_description.sql` ; types `src/db/types.ts` alignés à chaque migration.
- IA : Vercel AI SDK (`src/ai/provider.ts`), Gemini 3.7 Flash par défaut, repli Claude ; prompts versionnés `src/ai/prompts/*.ts` avec `PROMPT_VERSION` ; tout marche en mode dégradé sans clé.
- `@hebcal/core` (GPL-2.0) : **côté serveur uniquement**, jamais dans le JS client ni l'app native.
- PWA Serwist (partage Android) ; coque native Capacitor prévue (session 21). Hébergement Vercel `cdg1`.

## Arborescence
```
src/
  app/          (auth)/ (app)/ recettes/ planning/ communaute/ coach/ profil/ admin/ onboarding/ design/ r/ courses/ api/
  components/   ui/ coach/ recipes/ social/ pwa/ illustrations/
  ai/           prompts/ tools/ agents/ evals/
  lib/          brand.ts supabase/ import/ kashrut/ jewish-calendar/ planning/ nutrition/ social/ moderation/ seo/ pwa/ push/ utils/
  db/           seed/ types.ts
  i18n/         fr.ts (tout texte UI)
docs/           STATE.md DECISIONS.md PIVOT-2026.md archive/
```

## Conventions
- Git : branches de session, Conventional Commits, PR par session. Code/commentaires/commits en **anglais** ; UI, contenu, prompts, docs produit en **français**.
- Mutations via Server Actions ; webhooks/jobs via route handlers ; pas de logique métier dans les composants.
- Toute table : `id uuid`, `created_at`, `updated_at`, `user_id` si applicable, RLS activée.
- Tests unitaires obligatoires pour la logique métier (régimes, import, planning, calendrier, validateurs).
- Noms produit via `src/lib/brand.ts` (`APP_NAME`, `COACH_NAME`), jamais en dur.
- Tout texte UI dans `src/i18n/fr.ts`.

## Ton et identité
- **Neutre, chaleureux, élégant** : tutoiement, phrases courtes, jamais de moralisation. **Aucune couleur culturelle ou religieuse** (pas d'expressions communautaires, pas de vœux religieux, pas de surnoms), ni dans l'UI ni chez l'assistante.
- **Zéro culture du régime** : ni poids, ni calories en vedette, ni objectif minceur, ni culpabilité. Jamais de rouge punitif.
- Typo : titres en **Cormorant Garamond** (font-display, graisses 500-600, jamais d'extra-gras), texte en Inter, données en JetBrains Mono. Couleurs provisoires jusqu'à la charte Claude Design. AA minimum, `prefers-reduced-motion`.

## Copine — l'assistante IA
- Copine en cuisine : recettes, adaptations, planning, recevoir. Outils : `search_recipes`, `get_plan`, `propose_meal_plan`.
- 1–4 phrases (listes pour recettes/menus) ; ≤ 1 emoji jamais en tête ; aucune expression culturelle, aucun surnom.
- Garde-fous : jamais de régime minceur ni de calories à perdre ; mal-être alimentaire → douceur, aucun chiffre, orientation pro ; ni diagnostic ni médicament ; allergies → vérifier les étiquettes ; casher/halal → indication, jamais certification ; ne juge jamais les convictions.
- Mémoire : goûts, équipement, foyer, événements ; jamais santé, allergies ni religion.
- Évals : `pnpm eval:coach` (persona ≥ 95 %, garde-fous 100 %).

## Régimes et traditions
- Règles de cuisine **opt-in**, jamais par défaut, jamais d'étiquette d'identité ; « Mes règles de cuisine » dans Moi.
- Casher existant (viande/lait, délai, Pessah) = premier module du futur moteur multi-régimes (`BRIEF.md` §5) ; le planner valide toujours ses sorties par programme.
- Mentions : « compatible halal (ingrédients) », « viande à choisir certifiée », « sans ingrédient contenant du gluten » ; jamais « certifié » ni « sans allergènes ».

## Import social
- Déclenché par l'utilisatrice ; sources officielles d'abord (TikTok oEmbed, JSON-LD, API YouTube) ; Instagram par capture ou légende copiée (l'oEmbed ne renvoie plus de légende).
- Fiche **reformulée**, jamais la légende mot pour mot ; ni vidéo ni photo ré-hébergée ; crédit + lien + embed officiel ; retrait sur demande. Pas de téléchargement de vidéo sans avis juridique.

## Commandes
- `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` · `pnpm eval:coach`.
- Env : copier `.env.example` → `.env.local`. Secrets côté serveur uniquement.

## Sécurité & RGPD
- Régimes religieux et allergies = données sensibles (art. 9) : consentement explicite, minimisation, jamais dans l'analytics.
- Export JSON et suppression self-service de tout le contenu créé. Hébergement UE. Refus < 16 ans. Rate limiting, CSP, tests RLS : session Production.
