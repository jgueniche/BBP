# STATE.md — État du projet BBP

Dernière mise à jour : 30/08/2026 · Sessions 1 à 4

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
1. **`ANTHROPIC_API_KEY` sur Vercel** (+ `.env.local`) → active le parsing IA texte/photo du journal. Sans elle, mode dégradé (recherche directe) opérationnel.
2. Dashboard Supabase (2 min) : Authentication → Sign In / Providers → Email → décocher « Confirm email » ; URL Configuration → Site URL = `https://bbp-mu.vercel.app`.
3. Tester le parcours complet en prod : inscription → onboarding → journal (log texte, favori, comme hier).
4. Créer les projets **Sentry** et **PostHog EU**, renseigner les clés.
5. Valider a posteriori les plans des sessions 1-4 (sessions autonomes, cf. ADR-002).

## Backlog
- DoD session 4 partielle : évals « 20 phrases ≥ 90 % / photo ≥ 80 % » à passer avec promptfoo dès que la clé Anthropic est posée (prévu session 6).
- Tests RLS par rôle (SQL) — exigés brief §9, à faire au plus tard session 15.
- Refaire l'onboarding ne préremplit pas encore les valeurs existantes.
- Suppression de compte : purge les données ; la suppression de l'utilisateur auth (service role) arrive session 15.
- Presets « repas de chabbat type » dans le journal (avec session 13).
- Auth : OTP email et OAuth Google/Apple repoussés (ADR-006).
- Sentry + PostHog : instrumentation code (clés requises d'abord).
- Session 5 : poids, tendance EWMA, TDEE adaptatif.

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
