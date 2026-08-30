# CLAUDE.md — BBP (Bouhra, Boutargue & Protéine)

Coach nutrition + sport + communauté, casher-natif, culturellement judéo-oriental. Source de vérité : `BRIEF-BBP.md`. État courant : `docs/STATE.md`. Décisions : `docs/DECISIONS.md`.

## Rituel de session
1. Lire ce fichier + `docs/STATE.md` + la section §10.<N> de `BRIEF-BBP.md`.
2. Plan en ≤ 15 lignes, validation, puis commits atomiques.
3. Avant tout commit final : `pnpm lint` + `pnpm typecheck` + `pnpm test` verts.
4. Mettre à jour `STATE.md` / `DECISIONS.md`. Résumé ≤ 10 lignes (livré / non livré / risques).
5. Ne jamais anticiper la session suivante ; le manque va dans `STATE.md › Backlog`.

## Stack (brief §6)
- Next.js 15 App Router + RSC + Server Actions, React 19, TypeScript **strict** (zéro `any`), pnpm, Node 22.
- UI : Tailwind v4 (tokens `@theme`), shadcn/ui re-thémé, Lucide, Framer Motion, Recharts.
- Client : TanStack Query, Zustand (léger), Zod à toutes les frontières (API, IA, imports).
- Backend : Supabase Paris (eu-west-3) — Postgres, Auth (email OTP + Google + Apple), Storage, Realtime, pg_cron, pgmq. RLS sur **toute** table. Migrations SQL versionnées `YYYYMMDDHHMM_description.sql` dans `supabase/migrations/` (ADR-004) ; types générés dans `src/db/types.ts`, régénérés à chaque migration.
- IA : Vercel AI SDK multi-provider. Extraction/classification : `gemini-3.7-flash` par défaut (coût, ADR-010), Anthropic en fallback si seule sa clé est posée. Coach Kémia (session 6) : modèle à trancher avec Jeremy. Prompts versionnés dans `src/ai/prompts/*.ts` avec `PROMPT_VERSION`.
- Calendrier juif : `@hebcal/core` (offline). Nutrition : Ciqual (table `foods`) + OpenFoodFacts (cache 30 j).
- PWA : Serwist. Email : Resend. Observabilité : Sentry + PostHog EU. Tests : Vitest + Playwright + promptfoo. Hébergement : Vercel `cdg1`.

## Arborescence
```
src/
  app/          (auth)/ (app)/ journal/ poids/ coach/ recettes/ planning/ sport/ communaute/ profil/ design/ admin/ api/
  components/   ui/ coach/ journal/ recipes/ planner/ workout/ social/ illustrations/
  ai/           prompts/ tools/ agents/ evals/
  lib/          supabase/ kashrut/ jewish-calendar/ nutrition/ import/ push/ utils/
  db/           seed/ types.ts (migrations : supabase/migrations/, cf. ADR-004)
  i18n/         fr.ts (tout texte UI)
docs/           STATE.md DECISIONS.md RGPD.md API.md
```

## Conventions (brief §11)
- Git : trunk-based, branches `feat/` `fix/` `chore/`, Conventional Commits, PR par session.
- Langue : code / commentaires / commits en **anglais** ; UI / contenu / prompts IA / docs produit en **français**.
- Mutations via Server Actions ; webhooks et jobs via route handlers ; pas de logique métier dans les composants.
- Toute table : `id uuid`, `created_at`, `updated_at`, `user_id` si applicable, RLS activée.
- Tests unit obligatoires pour la logique métier (`kashrut`, `nutrition`, `jewish-calendar`, validateurs).
- Tout texte UI dans `src/i18n/fr.ts`, ton §2.6 du brief (tutoiement, chaleur, jamais de moralisation).

## Design (brief §2) — « sticker néo-brutaliste doux »
- Palette : `ink #0B0B0B`, `paper #FBFAF6`, accent `boutargue #F26A1B` (**rare, ≤ 10 %** — max 3 éléments orange par écran), `ok #2E7D4F`, `warn #B54708`. Pastilles casher : halavi `#5B7DB1`, bassari `#A63D2F`, parvé `#7A7A7A`. **Jamais de rouge punitif.**
- Typo : Bricolage Grotesque (display 700–800), Inter (corps, `tnum`), JetBrains Mono (données).
- Cartes : bordure ink 2 px, radius 20 px, ombre dure `4px 4px 0` sans flou. Boutons primaires : pill orange, bordure ink.
- Dark mode : inversion ink/paper, orange inchangé. Respecter `prefers-reduced-motion`. Icônes Lucide stroke 2 px.

## Kémia — coach IA (brief §3)
- Tata judéo-tunisienne, chaleureuse, drôle, directe. Constante `COACH_NAME=Kémia`.
- Voix : 1–4 phrases ; ≤ 1 expression judéo-arabe/hébraïque par message (jamais la même 2× en 5 messages) ; ≤ 1 surnom ; ≤ 1 emoji jamais en début ; chiffres arrondis ; jamais culpabilisant ; jamais de sermon religieux.
- **Garde-fous (prompt ET serveur, non négociables)** : jamais < 1 200 kcal/j (femme) / 1 500 (homme) ; déficit max 25 % TDEE ; perte 0,25–1 %/semaine ; signaux TCA → sortie du mode coach, aucun chiffre, orientation pro, `wellbeing_flag` ; grossesse/allaitement/< 18 ans/pathologie → mode accompagnement général ; jours de jeûne religieux → aucun objectif calorique ; jamais de certification casher (indication seulement) ; ni diagnostic ni posologie.

## Casher (brief §5) — dans chaque feature
- Classification bassari / halavi / parvé par règles + LLM si confiance < 0,8 ; poisson = parvé avec `is_fish`.
- Délai viande → lait paramétrable {6, 5.5, 3, 1} h ; chabbat/fêtes via hebcal (ville du profil) ; Pessah : hametz/kitniyot.
- Le planner ne viole jamais ces règles : post-validation programmatique obligatoire.

## Commandes
- `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` (Vitest) · `pnpm test:e2e` (Playwright).
- Env : copier `.env.example` → `.env.local` (annexe D du brief). Secrets côté serveur uniquement.

## Sécurité & RGPD (brief §9)
- Données de santé art. 9 : consentement explicite distinct, export JSON et suppression cascade self-service.
- Hébergement UE uniquement. Refus < 16 ans. Rate limiting, CSP stricte, Sentry sans PII, validation Zod partout.
- Import social : oEmbed officiel uniquement, jamais de scraping authentifié, crédit auteur obligatoire.
