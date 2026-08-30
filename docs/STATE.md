# STATE.md — État du projet BBP

Dernière mise à jour : 30/08/2026 · Sessions 1 (Fondations) + 2 (Charte & kit UI)

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
1. ~~Créer le projet Supabase~~ ✅ Projet « BBP » `apxrducsgrddwujnibcf`, eu-west-3 (Paris), sain.
2. ~~Projet Vercel + env vars~~ ✅ Projet `bbp` créé, prod déployée depuis `master` en `cdg1` : https://bbp-ruby.vercel.app (login OTP vérifié servi, Supabase branché).
3. Dashboard Supabase (2 min) : Authentication → Sign In / Providers → Email → décocher « Confirm email » (sinon l'inscription attend une confirmation par lien qui pointe vers localhost) ; Authentication → URL Configuration → Site URL = `https://bbp-ruby.vercel.app`.
4. Tester la création de compte + login mot de passe sur la prod.
5. Renseigner `.env.local` en local avec les mêmes clés que Vercel.
6. Créer les projets **Sentry** et **PostHog EU**, renseigner les clés.
7. Valider le plan de la session 1 a posteriori (session lancée en autonome, cf. ADR-002).

## Backlog
- Validation visuelle de `/design` par Jeremy (DoD session 2) ; itérer sur logo/avatar/illustrations selon retours.
- Auth : OTP email et OAuth Google/Apple repoussés (ADR-006) ; réactiver plus tard avec Site URL corrigée.
- Supabase local (`supabase init` + première migration + types générés) : à faire en session 3 avec les premières tables.
- Sentry + PostHog : instrumentation code (clés requises d'abord).
- Session 3 : onboarding & profil (TDEE, modes, contraintes casher, consentement santé).

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
