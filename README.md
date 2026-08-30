# BBP — Bouhra, Boutargue & Protéine

**Mange. Bouge. Bsahtek.**

Coach nutrition + sport + communauté, casher-natif et culturellement judéo-oriental. Suivi du poids et de l'alimentation, coach IA (Kémia), recettes du patrimoine en versions Boutargue (authentique) et Protéine (allégée), planning de repas qui respecte viande/lait, chabbat et fêtes.

- **Source de vérité** : [`BRIEF-BBP.md`](./BRIEF-BBP.md)
- **Guide opérationnel** : [`CLAUDE.md`](./CLAUDE.md)
- **État du projet** : [`docs/STATE.md`](./docs/STATE.md) · **Décisions** : [`docs/DECISIONS.md`](./docs/DECISIONS.md)

## Démarrage

Prérequis : Node 22, pnpm 10.

```bash
pnpm install
cp .env.example .env.local   # puis remplir les clés (Supabase, etc.)
pnpm dev
```

Sans clés Supabase, l'app démarre quand même : l'authentification est simplement désactivée (bannière sur `/login`).

## Scripts

| Commande | Rôle |
|---|---|
| `pnpm dev` | Serveur de développement (Turbopack) |
| `pnpm build` / `pnpm start` | Build et serveur de production |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript strict |
| `pnpm test` | Tests unitaires (Vitest) |
| `pnpm format` | Prettier |

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind v4 · Supabase (Paris) · Anthropic via Vercel AI SDK · `@hebcal/core` · Vercel. Détails : brief §6.
