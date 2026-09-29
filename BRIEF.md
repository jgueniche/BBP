# BRIEF.md — Copine en cuisine
**Document maître pour Claude Code** · v2.0 · 29/09/2026 · Product owner : la femme de Jeremy · Décisions : ADR-027 à ADR-029
**Statut** : source de vérité. Remplace `docs/archive/BRIEF-BBP-v1.md` (coach minceur casher, abandonné). Le contexte détaillé (audit, benchmark, sources) est dans `docs/PIVOT-2026.md`.

---
## 0. Mode d'emploi
| Règle | Détail |
|---|---|
| Fichiers de contexte | `BRIEF.md` (ce fichier) · `CLAUDE.md` · `docs/STATE.md` · `docs/DECISIONS.md` · `docs/PIVOT-2026.md` (pourquoi) |
| Rituel | 1) Lire `CLAUDE.md` + `STATE.md` + la section §9 de la session. 2) Plan ≤ 15 lignes, validation. 3) Commits atomiques. 4) `pnpm lint` + `pnpm typecheck` + `pnpm test` (+ `pnpm build`) verts. 5) `STATE.md` / `DECISIONS.md` à jour. 6) Résumé ≤ 10 lignes : livré / non livré / risques. |
| Périmètre | Ne jamais anticiper la session suivante ; le manque va dans `STATE.md › Backlog`. |
| Migrations | Écrites dans le dépôt, **jamais appliquées en prod sans l'accord explicite de Jeremy** (surtout les destructives). |
| Langue | Code, commentaires, commits : anglais. UI, contenu, prompts IA, docs produit : français. |

---
## 1. Vision
### 1.1 Pitch
> **Le carnet de recettes qui se remplit tout seul depuis Insta et TikTok, s'adapte à chaque table (casher, halal, vegan, sans gluten…) et se cuisine à plusieurs.**

### 1.2 Pour qui
Des femmes de 22 à 45 ans, francophones, de toutes cultures, qui cuisinent pour elles, leur couple, leur famille ou leurs colocs, et qui reçoivent. L'app reste utilisable par tout le monde. Elles enregistrent des dizaines de recettes sur les réseaux sans les retrouver, et composent avec des régimes variés autour de la table.

### 1.3 Trois piliers
| Pilier | Promesse |
|---|---|
| **Capturer** | Import en un geste depuis n'importe où (partage Insta/TikTok, lien, capture, livre, recette manuscrite, YouTube), rangement automatique, crédit à la créatrice |
| **Adapter** | Pastilles de compatibilité par régime et par personne, variantes IA expliquées et vérifiées par le moteur de règles, portions et conversions |
| **Partager** | Réseau social (actus, likes, commentaires, abonnements), carnets partagés, foyer (planning + courses en temps réel), **Tablée** (dîner avec invités aux régimes différents) |

### 1.4 Ce qui la rend unique (benchmark `docs/PIVOT-2026.md` §3)
1. Personne ne gère un repas pour des convives aux contraintes mixtes, ni un foyer où chacun mange autrement.
2. Aucune app d'import ne propose de filtre casher ou halal ; aucune ne combine import, collaboration et régimes par personne.
3. Un vrai moteur de règles (hérité du moteur casher) plutôt que de simples étiquettes.

### 1.5 Principes produit (non négociables)
- **Zéro culture du régime** : ni poids, ni calories en vedette, ni objectif minceur, ni culpabilité. Les kcal par portion restent une info discrète.
- **Toutes les traditions, sans étiquette** : un régime religieux est une règle de cuisine choisie par la personne, jamais une identité affichée ni demandée. Indication, jamais certification.
- **Neutralité de ton** : aucune couleur culturelle ou religieuse dans l'interface ni chez l'assistante (pas d'expressions communautaires, pas de vœux religieux, pas de surnoms).
- **Les créatrices d'abord** : crédit visible, lien en un tap, embed officiel, texte reformulé, retrait sur demande.
- **Un geste pour importer, dix secondes pour retrouver.** Mobile d'abord, app native pour le partage iPhone.
- **Élégant et épuré** : girly assumé mais classe, jamais de gros caractères ludiques ; accessibilité AA.

---
## 2. Identité
| Élément | Spécification |
|---|---|
| Nom | **Copine en cuisine** (constante `APP_NAME`, `src/lib/brand.ts`) |
| Signature | « Tes recettes, à plusieurs mains. » (provisoire) |
| Assistante | **Copine** (constante `COACH_NAME`) — ta copine en cuisine |
| Typographie | Titres : **Cormorant Garamond** (serif fine, 500-600, jamais d'extra-gras) ; texte : Inter ; données : JetBrains Mono |
| Couleurs | Provisoires (tokens actuels) jusqu'à la session Claude Design ; piste recommandée « Beurre & Cerise » (`docs/PIVOT-2026.md` §7) |
| Logo | Provisoire : mot-symbole en Cormorant + monogramme « C » ; identité finale via Claude Design (brief prêt : `docs/CLAUDE-DESIGN-BRIEF.md`) |
| Ton UI | Tutoiement, chaleur, phrases courtes, élégance ; jamais de moralisation, jamais de rouge punitif |

---
## 3. Copine, l'assistante IA
- **Rôle** : aider à choisir, adapter et réussir des recettes, organiser la semaine, recevoir. Outils : `search_recipes`, `get_plan`, `propose_meal_plan` (à étendre : adapter une recette, composer une Tablée).
- **Voix** : 1 à 4 phrases (listes pour recettes et menus), chaleureuse, simple, positive, élégante ; au plus un emoji jamais en tête ; **aucune expression culturelle ou religieuse, aucun surnom**.
- **Garde-fous** (prompt + serveur) : jamais de régime minceur ni de calories à perdre ; mal-être autour de la nourriture → douceur, aucun chiffre, orientation vers un professionnel ; ni diagnostic ni médicament ; allergies → vérifier les étiquettes ; casher/halal → indication, jamais certification ; ne commente jamais les convictions.
- **Mémoire** : goûts, équipement, taille du foyer, événements datés ; jamais de santé, d'allergie ni de religion (ces données vivent dans le profil, avec consentement).
- **Évals** : `pnpm eval:coach` (promptfoo) — persona ≥ 95 %, garde-fous 100 %.

---
## 4. Périmètre fonctionnel
| Module | État | Cible |
|---|---|---|
| Import de recettes | Sites (JSON-LD), TikTok (oEmbed), texte, photo (vision), partage Android | + app native (partage iPhone), YouTube (description + vidéo via Gemini), Pinterest, carrousels par captures, file de jobs avec statut et quotas, reformulation, doublons, photo de couverture, traduction |
| Recettes | Fiche, éditeur, carnet, fork, notes, mode cuisine, variante végétarienne IA | + cuisines du monde, catégories élargies, variantes par régime, portions/conversions, « même plat, toutes les tables », photos |
| Régimes | Casher (opt-in) | Moteur multi-régimes (§5) + profils alimentaires (moi, foyer, invités) + pastilles de compatibilité |
| Réseau social | Fil sans algorithme, actus / « j'ai cuisiné » / recettes, réactions J'adore · Bravo · Miam, commentaires, abonnements, groupes, modération 2 étages | + photos dans les posts, notifications (réactions, commentaires, abonnés), temps réel, mentions, profils publics et de créatrices (revendicables, statistiques) |
| Carnets partagés | Membres éditeur/lecteur, invitation par lien | + activité, commentaires, temps réel |
| Foyer | — | Planning et liste de courses partagés en temps réel, « qui cuisine ce soir » |
| Tablée | — | Invités + contraintes → menu compatible → qui apporte quoi → liste partagée |
| Planning & courses | Semaine générée (IA + déterministe), validateur, rayons, partage lecture seule | Rattaché au foyer, contraintes multi-régimes |
| Calendrier des fêtes | Juif (opt-in, hebcal côté serveur) | + islamique, chrétien/orthodoxe, hindou, lunaire, en opt-in (§5.3) |
| Supprimé | Sport (S17), suivi santé : journal, poids, TDEE, progrès, gamification, nudges (S18) | — |

---
## 5. Régimes et traditions
### 5.1 Modèle
Attributs par ingrédient (origine animale, espèce, abattage rituel requis, poisson à nageoires et écailles, sous-produits : gélatine, saindoux, fond, nuoc-mâm, carmin…, origine incertaine, lait, présure, alcool : trace/extrait/boisson + issu du raisin, partie de plante : racine/bulbe…, alliacées, fermenté, céréale à gluten, Pessah, allergènes et traces, provenance + confiance) → **règles par régime** (dures ou souples) + **contraintes de repas et de temps** → verdict par recette et par personne : **compatible · adaptable (substitutions) · incompatible · à vérifier**. Les nuances sont des réglages du profil. Chaque substitution est revérifiée contre tous les régimes actifs.

### 5.2 Régimes V1
Végétarien, vegan, pescétarien, sans porc, sans alcool, halal, casher, végétarien indien, sans gluten, sans lactose, 14 allergènes UE. Plus tard : jaïn, bouddhiste, sattvique, low-FODMAP, flexitarien. Règles détaillées et substitutions : `docs/PIVOT-2026.md` §5.

### 5.3 Calendriers (opt-in)
Juif (hebcal, **GPL-2.0 : uniquement côté serveur**) · ramadan/Aïds (`Intl` islamique ±1 jour, fourchette affichée ; iftar/suhour via `adhan`) · Pâques, Carême, orthodoxe (comput) · Nouvel An lunaire, Diwali, fêtes jaïnes (tables annuelles). Faits uniquement : aucun vœu, aucun discours religieux.

### 5.4 Données
Ciqual 2025 (Etalab, par **codes** de groupes) + Open Food Facts (ODbL) + table d'attributs maison (règles → IA → relecture). Aucune API externe ne couvre le halal.

---
## 6. Stack & architecture
| Couche | Choix |
|---|---|
| App | Next.js 15 App Router + RSC + Server Actions, React 19, TypeScript strict (zéro `any`), pnpm, Node 22 |
| UI | Tailwind v4 (tokens CSS), shadcn/ui, Lucide, Motion ; `prefers-reduced-motion` |
| Backend | Supabase Paris : Postgres (RLS sur toute table), Auth, Storage, Realtime ; migrations `supabase/migrations/YYYYMMDDHHMM_*.sql`, types `src/db/types.ts` |
| IA | Vercel AI SDK : Gemini 3.7 Flash par défaut, repli Claude ; prompts versionnés `src/ai/prompts/*.ts` ; sorties Zod ; mode dégradé sans clé |
| Mobile | PWA (partage Android) ; **coque Capacitor avec extension de partage iOS** ; les Server Actions sont doublées de routes `/api` pour l'app |
| Hébergement | Vercel `cdg1` + Supabase eu-west-3 ; UE uniquement |
| Tests | Vitest, Playwright, promptfoo |

---
## 7. Sécurité, RGPD, légal
- **Données sensibles (art. 9)** : régime casher/halal/jaïn = conviction religieuse ; allergies = santé → consentement explicite distinct, règles neutres (« sans porc ») sans jamais demander le motif, aucun de ces champs dans l'analytics.
- **Export et suppression self-service** : tout ce que la personne a créé (recettes, carnets, posts, conversations, plannings) ; suppression du compte auth à brancher (service role).
- **Import social** : déclenché par l'utilisatrice ; fiche reformulée, jamais la légende mot pour mot ; ni vidéo ni photo ré-hébergée ; crédit + lien + embed officiel ; retrait sur demande ; **téléchargement de vidéos Instagram/TikTok interdit sans avis juridique**.
- **Mentions** : « compatible halal (ingrédients) », « viande à choisir certifiée », « sans ingrédient contenant du gluten » ; jamais « certifié » ni « sans allergènes ».
- **Mineurs** : service refusé sous 16 ans (déclaration à l'onboarding).
- **À faire (session Production)** : CGU, politique de confidentialité, CSP, rate limiting, tests RLS par rôle, Sentry/PostHog sans PII, DSA (notification/retrait).

---
## 8. Monétisation (défaut, à confirmer)
Gratuit au lancement ; ensuite imports IA limités en gratuit (≈ 5 par semaine) et abonnement (40-60 €/an) pour l'illimité et les fonctions IA ; **la collaboration et le réseau social restent gratuits** ; plus tard : affiliation drive, partage de revenus avec les créatrices.

---
## 9. Feuille de route
| # | Session | Livrable clé |
|---|---|---|
| 17 | ✅ Audit & vision | Pivot documenté, sport supprimé |
| 18 | ✅ Brief v2 & grand ménage | Suivi santé supprimé, Copine, renommage, typo élégante, vocabulaire social universel, onboarding express |
| 19 | Moteur multi-régimes | Attributs d'ingrédients, règles §5, profils alimentaires, pastilles de compatibilité ; casher = module ; allergies avec consentement |
| 20 | Import v2 | File de jobs, quotas, YouTube, Pinterest, captures multiples, reformulation, doublons, photos de recettes |
| 21 | App iPhone & Android | Coque Capacitor + extension de partage, routes `/api`, mode cuisine hors ligne, notifications ; TestFlight |
| 22 | Réseau social v2 | Photos dans les posts, notifications, temps réel, mentions, profils et créatrices |
| 23 | Foyer | Planning et courses partagés en temps réel, invitations |
| 24 | Tablée | Invités, contraintes, menu compatible, qui apporte quoi |
| 25 | Adapter | Variantes par régime vérifiées par le moteur, portions, conversions, « même plat, toutes les tables » |
| 26 | Nouvelle identité | Design system issu de Claude Design (à avancer dès qu'il existe) |
| 27 | Production | RGPD complet, CGU, sécurité, avis juridique import, abonnement, stores |
