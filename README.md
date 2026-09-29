# Copine en cuisine

**Tes recettes, à plusieurs mains.**

Le réseau social de la cuisine : suis tes copines et tes créatrices préférées, garde toutes les recettes vues sur Instagram, TikTok ou n'importe quel site, et cuisine ensemble quelle que soit la table (végétarien, halal, sans gluten, allergies…). Avec Copine, ta copine en cuisine (assistante IA).

- **Source de vérité** : [`BRIEF.md`](./BRIEF.md)
- **Guide opérationnel** : [`CLAUDE.md`](./CLAUDE.md)
- **Feuille de route sociale** : [`docs/PLAN-SOCIAL-2026.md`](./docs/PLAN-SOCIAL-2026.md) · veille : [`docs/BENCHMARK-SOCIAL-2026.md`](./docs/BENCHMARK-SOCIAL-2026.md) · pivot initial : [`docs/PIVOT-2026.md`](./docs/PIVOT-2026.md)
- **État du projet** : [`docs/STATE.md`](./docs/STATE.md) · **Décisions** : [`docs/DECISIONS.md`](./docs/DECISIONS.md)
- Ancien produit (BBP) : [`docs/archive/BRIEF-BBP-v1.md`](./docs/archive/BRIEF-BBP-v1.md)

## Démarrage

Prérequis : Node 22, pnpm 10.

```bash
pnpm install
cp .env.example .env.local   # puis remplir les clés (Supabase, Gemini…)
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
| `pnpm eval:coach` | Évaluations de l'assistante Copine (promptfoo) |
| `pnpm format` | Prettier |

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind v4 · Supabase (Paris) · Vercel AI SDK (Gemini, repli Claude) · Vercel. Détails : `BRIEF.md` §6.
