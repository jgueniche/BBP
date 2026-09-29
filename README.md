# Copine en cuisine

**Tes recettes, à plusieurs mains.**

L'app de cuisine collaborative et inclusive : importe tes recettes depuis Instagram, TikTok ou n'importe quel site, adapte-les à chaque table (casher, halal, vegan, sans gluten…), partage-les dans la communauté, avec ton foyer et tes invités. Avec Copine, ta copine en cuisine (assistante IA).

- **Source de vérité** : [`BRIEF.md`](./BRIEF.md)
- **Guide opérationnel** : [`CLAUDE.md`](./CLAUDE.md)
- **Pourquoi ce pivot** (audit, benchmark, régimes) : [`docs/PIVOT-2026.md`](./docs/PIVOT-2026.md)
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
