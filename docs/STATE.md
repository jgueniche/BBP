# STATE.md — État du projet BBP

Dernière mise à jour : 30/08/2026 · Session 1 (Fondations)

## Fait
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

## Reste à faire (actions côté Jeremy — bloquantes pour un environnement fonctionnel)
1. ~~Créer le projet Supabase~~ ✅ Fait : projet « BBP » `apxrducsgrddwujnibcf`, eu-west-3 (Paris), sain.
2. Coller les variables d'environnement sur Vercel (bloc fourni en fin de session 1bis) et dans `.env.local`.
3. GitHub : définir `master` comme branche par défaut (Settings → General → Default branch).
4. Vercel : vérifier que la Production Branch = `master` (Settings → Git) après le changement GitHub.
5. Activer les providers Auth Google + Apple dans Supabase (email OTP fonctionne sans config supplémentaire).
6. Créer les projets **Sentry** et **PostHog EU**, renseigner les clés.
7. Valider le plan de la session 1 a posteriori (session lancée en autonome, cf. ADR-002).

## Backlog (hors périmètre session 1)
- Session 2 : charte graphique complète, kit UI, `/design`, logo, illustrations, avatar Kémia.
- Providers OAuth Google/Apple : pages et boutons UI (le code auth OTP est prêt, les boutons OAuth viendront avec le kit UI session 2/3).
- Supabase local (`supabase init` + première migration + types générés) : à faire dès que le projet Supabase existe, pour caler les types sur la vraie instance.
- Sentry + PostHog : instrumentation code (clés requises d'abord).

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
