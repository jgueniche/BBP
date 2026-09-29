# BRIEF.md — Copine en cuisine
**Document maître pour Claude Code** · v3.0 · 29/09/2026 · Product owner : la femme de Jeremy · Décisions : ADR-027 à ADR-032
**Statut** : source de vérité. Remplace la v2 (carnet collaboratif) ; s'appuie sur `docs/PLAN-SOCIAL-2026.md` (proposition validée par Jeremy le 29/09/2026) et la veille `docs/BENCHMARK-SOCIAL-2026.md`. Le pourquoi du pivot initial reste dans `docs/PIVOT-2026.md` ; l'ancien produit (BBP) dans `docs/archive/BRIEF-BBP-v1.md`.

---
## 0. Mode d'emploi
| Règle | Détail |
|---|---|
| Fichiers de contexte | `BRIEF.md` (ce fichier) · `CLAUDE.md` · `docs/STATE.md` · `docs/DECISIONS.md` · `docs/PLAN-SOCIAL-2026.md` (feuille de route et pourquoi) |
| Rituel | 1) Lire `CLAUDE.md` + `STATE.md` + la section §9 de la session. 2) Plan ≤ 15 lignes, validation. 3) Commits atomiques. 4) `pnpm lint` + `pnpm typecheck` + `pnpm test` (+ `pnpm build`) verts. 5) `STATE.md` / `DECISIONS.md` à jour. 6) Résumé ≤ 10 lignes : livré / non livré / risques. |
| Périmètre | Ne jamais anticiper la session suivante ; le manque va dans `STATE.md › Backlog`. |
| Migrations | Écrites dans le dépôt et testées sur un Postgres local, **jamais appliquées en prod sans l'accord explicite de Jeremy** (surtout les destructives). |
| Langue | Code, commentaires, commits : anglais. UI, contenu, prompts IA, docs produit : français. |

---
## 1. Vision
### 1.1 Pitch
> **Copine en cuisine, le réseau social de la cuisine.**
> On y suit ses copines et ses créatrices préférées, on garde toutes les recettes vues sur Insta et TikTok, et on cuisine ensemble, quelle que soit la table.

La cuisine vit sur les réseaux, mais on n'y cuisine pas. Les recettes se perdent dans les captures, les créatrices perdent leur trafic, les sites noient la recette sous la pub, et les applis de recettes restent des carnets solitaires. Copine en cuisine réunit les deux : un vrai réseau social pour s'inspirer, montrer ce qu'on a cuisiné et suivre celles qui donnent envie, et des outils concrets pour passer à table (carnet qui se remplit tout seul, planning et courses du foyer, dîners entre amis).

Signature : *Tes recettes, à plusieurs mains.*

### 1.2 Pour qui
Des femmes de 22 à 45 ans, francophones, de toutes cultures, qui cuisinent pour elles, leur couple, leur famille ou leurs colocs, et qui reçoivent ; les créatrices culinaires qui veulent retrouver crédit, trafic et revenus. L'app reste utilisable par tout le monde.

### 1.3 Le constat qui guide la construction
Le réseau social de la cuisine ne naîtra pas d'un fil, mais d'un carnet : **l'utilité d'abord, les petits cercles ensuite, le public en dernier**. Ce qui retient les gens est attaché à la recette (« j'ai cuisiné », astuces votées, collections reliées aux courses). **Indicateur clé : la part des recettes importées qui deviennent un « j'ai cuisiné ».** **Modèle économique : monétiser la table, pas le fil** (pas de publicité dans le fil).

### 1.4 Principes produit (non négociables)
- **Utile seule, meilleure à plusieurs** : chaque fonction sert d'abord à la personne qui l'utilise ; le social vient par-dessus.
- **La recette au centre** : chaque échange (photo, astuce, version, réaction) est rattaché à une recette.
- **Crédit et trafic aux créatrices**, toujours : crédit visible, lien vers l'original, embed officiel, texte reformulé, profil revendicable, retrait sur demande.
- **Toutes les tables, sans étiquette** : des règles de cuisine simples et facultatives ; l'app n'entre pas dans le détail des traditions ; la compatibilité s'affiche sur les recettes, jamais sur les personnes.
- **Zéro culture du régime** : ni poids, ni calories en vedette, ni objectif minceur, ni culpabilité, ni séries punitives ou classements au volume.
- **Neutralité de ton** : aucune couleur culturelle ou religieuse dans l'interface ni chez l'assistante.
- **Bienveillance modérée** : signalement simple, règles claires, modération active dès le premier jour.
- **Élégant et épuré** : charte Claude Design (fond blanc, pastels, accent framboise), accessibilité AA, mobile d'abord.

---
## 2. Identité
| Élément | Spécification |
|---|---|
| Nom | **Copine en cuisine** (constante `APP_NAME`, `src/lib/brand.ts`) |
| Signature | « Tes recettes, à plusieurs mains. » |
| Assistante | **Copine** (constante `COACH_NAME`), ta copine en cuisine |
| Typographie | Titres : **Cormorant Garamond** (500-600, jamais d'extra-gras) ; texte : Inter ; données : JetBrains Mono |
| Couleurs | Charte Claude Design (ADR-030) : fond blanc, encre prune `#2B2230`, accent unique framboise `#C0265E`, pastels de panneaux ; états compatible / adaptable / incompatible (gris neutre) / à vérifier ; tous les régimes dans un seul style neutre |
| Logo | Mot-symbole « Copine *en cuisine* » + médaillon « C » (`public/brand/`) |
| Ton UI | Tutoiement, chaleur, phrases courtes ; jamais de moralisation, jamais de rouge punitif |

---
## 3. Copine, l'assistante IA
- **Rôle** : aider à choisir, adapter et réussir des recettes, organiser la semaine, recevoir. Outils : `search_recipes` (avec le verdict de la personne), `get_plan`, `propose_meal_plan`.
- **Voix** : 1 à 4 phrases (listes pour recettes et menus), chaleureuse, simple, élégante ; au plus un emoji jamais en tête ; aucune expression culturelle ou religieuse, aucun surnom.
- **Contexte** : prénom, règles de cuisine, allergies et dégoûts consentis, date du jour. Plus aucun calendrier religieux.
- **Garde-fous** (prompt + serveur) : jamais de régime minceur ni de calories à perdre ; mal-être autour de la nourriture → douceur, aucun chiffre, orientation vers un professionnel ; ni diagnostic ni médicament ; allergies → vérifier les étiquettes ; casher/halal → indication, jamais certification ; ne commente ni ne questionne jamais les convictions.
- **Mémoire** : goûts, équipement, taille du foyer, événements datés ; jamais de santé, d'allergie ni de religion (ces données vivent dans « Mes règles de cuisine », avec consentement).
- **AI Act art. 50** (avant l'ouverture publique) : mention permanente « Copine est une IA » et marquage des contenus générés.
- **Évals** : `pnpm eval:coach` (promptfoo) — persona ≥ 95 %, garde-fous 100 %.

---
## 4. Périmètre fonctionnel
| Module | État (fin session 19) | Cible |
|---|---|---|
| Import de recettes | Sites (JSON-LD), TikTok (oEmbed), texte, photo (vision), partage Android | Sites FR en priorité, YouTube, Pinterest, captures multiples, file de jobs et quotas, reformulation, doublons (S23) ; partage iPhone via la coque native (S24) |
| Recettes | Fiche, éditeur, carnet, fork, notes, mode cuisine, variante végétarienne IA, cuisines du monde, verdict « Pour toi » et pastilles « toutes les tables » | « J'ai cuisiné » attaché à la recette, astuces votées, versions avec crédit en chaîne, étiquettes libres et catégories (S20) ; photos |
| Régimes | Préférences simples + verdict par recette (§5) | Foyer et invités (S26-S27) ; IA pour les ingrédients inconnus |
| Réseau social | Fil sans algorithme, actus / « j'ai cuisiné » / recettes, réactions J'adore · Bravo · Miam, commentaires, abonnements, groupes, modération 2 étages | Profils publics, journal, liste « À cuisiner », fil des copines, notifications sobres (S21) ; créatrices (S22) ; clubs, défis, récap annuel (S28) |
| Carnets partagés | Membres éditeur/lecteur, invitation par lien | Activité, commentaires, temps réel |
| Foyer | — | Planning et courses partagés en temps réel (S26) |
| Tablée | — | Invitation par lien sans appli, règles de chaque invité, menu compatible, qui apporte quoi (S27) |
| Planning & courses | Semaine générée (IA + déterministe) avec les seules recettes compatibles, contrôle programmatique, rayons, partage lecture seule | Rattaché au foyer |
| Supprimé | Sport (S17), suivi santé (S18), module casher détaillé et calendrier juif (S19) | — |

### Priorités fonctionnelles (plan social, validé)
- **P0** : « j'ai cuisiné » attaché à la recette ; astuces votées « utile » ; journal + liste « À cuisiner » ; « Ma version » avec crédit en chaîne ; profils créatrices revendicables ; étiquettes libres et catégories créées par les membres ; Tablée partageable sans appli.
- **P1** : récap annuel sans calories ; clubs et défis avec une vraie récompense ; fil « Mes copines ont cuisiné » ; import des sites français ; lien « Enregistrer dans Copine en cuisine » pour les créatrices ; pages publiques référencées **uniquement** pour les recettes originales des membres et les carnets publics.
- **P2** : abonnements et collections payantes des créatrices (partage de revenus), courses achetables en drive, cuisine en direct et cours.
- **Garde-fous** : pas de séries punitives ni de classements au volume ; notifications rares et utiles ; géolocalisation retirée des photos ; pas de parrainage obligatoire ni de liste d'attente ; la Tablée reste strictement non marchande.

---
## 5. Régimes, simplement (ADR-031, ADR-032)
### 5.1 Préférences
Facultatives, dans « Moi › Mes règles de cuisine », **jamais affichées sur le profil** : végétarien, vegan, pescétarien, sans porc, sans alcool, halal, casher, sans gluten, sans lactose ; les **14 allergènes UE** ; des mots « je n'aime pas ». Régimes et allergies ne sont enregistrés qu'après un **consentement explicite** (RGPD art. 9) ; « Tout effacer » le retire.

### 5.2 Le moteur (`src/lib/diets/`)
- **Attributs neutres par ingrédient** (viande, porc, lapin, cheval, sang, poisson, poisson sans écailles, crustacés, mollusques, produit laitier, fromage, œuf, miel, gélatine, carmin, alcool, produit de la vigne, gluten) + allergènes propagés depuis les produits composés (sauce soja → soja + gluten, bouillon → céleri possible). Lus sur le libellé, puis sur l'aliment de référence lié quand le libellé ne dit rien de certain.
- **Verdict par recette, 4 états de la charte** : **compatible** · **adaptable** (substitutions revérifiées contre toutes les règles actives, ou ingrédient d'appoint à retirer) · **incompatible** (gris neutre) · **à vérifier** (ce qu'on ne peut pas savoir depuis les ingrédients).
- **Mentions prudentes** : « compatible halal (ingrédients) », « casher (indication) », « viande à choisir certifiée », « sans ingrédient contenant du gluten », « vérifie toujours les étiquettes » ; jamais « certifié » ni « sans allergènes ».
- **Pas de sous-classes religieuses** : ni viande/lait/parvé affichés, ni délais d'attente, ni Pessah, ni calendriers religieux. Seule règle de composition conservée : pas de produit laitier avec de la viande pour « casher ».
- **Toutes les tables** : pastilles des régimes que les ingrédients respectent tels quels, publiques car elles décrivent la recette, jamais une personne.
- Calcul à la lecture (aucun attribut stocké) : un dictionnaire amélioré profite aussitôt à toutes les recettes.

### 5.3 La finesse vient des membres (S20)
Étiquettes libres (#ramadan, #shabbat, #diwali, #batchcooking…) et catégories créées par les membres et les créatrices, synonymes fusionnés sous une étiquette de référence (modèle AO3). Une étiquette « #halal » ne remplace jamais le verdict calculé ; un désaccord est signalé.

### 5.4 Données
Ciqual (Etalab) pour la nutrition, liée par code ; dictionnaire d'attributs maison testé régime par régime. Aucune API externe ne couvre le halal.

---
## 6. Stack & architecture
| Couche | Choix |
|---|---|
| App | Next.js 15 App Router + RSC + Server Actions, React 19, TypeScript strict (zéro `any`), pnpm, Node 22 |
| UI | Tailwind v4 (tokens CSS), shadcn/ui, Lucide, Motion ; `prefers-reduced-motion` |
| Backend | Supabase Paris : Postgres (RLS sur toute table), Auth, Storage, Realtime ; migrations `supabase/migrations/YYYYMMDDHHMM_*.sql`, types `src/db/types.ts` |
| IA | Vercel AI SDK : Gemini 3.7 Flash par défaut, repli Claude ; prompts versionnés `src/ai/prompts/*.ts` ; sorties Zod ; mode dégradé sans clé |
| Mobile | PWA (partage Android) ; coque Capacitor avec extension de partage iOS (S24) ; Server Actions doublées de routes `/api` pour l'app |
| Hébergement | Vercel `cdg1` + Supabase eu-west-3 ; UE uniquement |
| Tests | Vitest, Playwright, promptfoo ; migrations rejouées sur un Postgres local avant commit |

Plus aucune dépendance GPL : `@hebcal/core` est retiré (S19).

---
## 7. Sécurité, RGPD, légal
- **Données sensibles (art. 9)** : régimes religieux et allergies → consentement explicite distinct, minimisation, jamais publics, jamais dans l'analytics ni sur une carte partageable (pas de « ton année casher »), jamais demandés au nom d'un tiers (les invités d'une Tablée saisissent eux-mêmes leurs règles).
- **Export et suppression self-service** de tout le contenu créé ; suppression du compte auth à brancher (service role).
- **DSA** (petite entreprise) : signalement (art. 16), motivation de chaque décision de modération (art. 17), CGU (art. 14), points de contact (art. 11-12).
- **Droit d'auteur** : import déclenché par l'utilisatrice ; fiche reformulée, jamais la légende mot pour mot ; ni vidéo ni photo ré-hébergée ; crédit « d'après @X » + lien + embed officiel ; imports privés par défaut ; retrait sur demande ; **pas de téléchargement de vidéos sans avis juridique** ; pas d'aspiration massive des sites.
- **Dépendance aux plateformes** : les CGU développeurs de TikTok interdisent de constituer des bases de contenus → multiplier les sources d'import.
- **Responsabilité du fait des produits** (logiciel = produit au 09/12/2026) : prudence sur les allergènes, historique des versions de prompts et de modèles.
- **Mineurs** : service refusé sous 16 ans.
- **Session Production (S25)** : CGU, confidentialité, CSP, rate limiting, tests RLS par rôle, Sentry/PostHog sans PII, modération, stores.

---
## 8. Monétisation
Gratuit au lancement. Ensuite : imports IA limités en gratuit et abonnement pour l'illimité et les fonctions IA ; **la collaboration et le réseau social restent gratuits** ; pas de publicité dans le fil ; puis abonnements des créatrices avec partage de revenus, courses en drive, cuisine en direct.

---
## 9. Feuille de route
| # | Session | Livrable clé |
|---|---|---|
| 17 | ✅ Audit & vision | Pivot documenté, sport supprimé |
| 18 | ✅ Brief v2 & grand ménage | Suivi santé supprimé, Copine, renommage, typo élégante, vocabulaire social universel |
| — | ✅ Charte Claude Design | Tokens, pastels, logo et icônes |
| 19 | ✅ Brief v3 & régimes simples | Ce brief et `CLAUDE.md` ; module casher détaillé et calendrier juif retirés (fin de la contrainte GPL) ; préférences simples + verdict par recette ; migration vers des attributs neutres ; catalogue de départ diversifié |
| 20 | La recette sociale | « J'ai cuisiné » attaché à la recette, astuces votées, versions avec crédit, étiquettes libres et catégories, photos dans les posts (sans géolocalisation) |
| 21 | Profils & journal | Profils publics, abonnements, journal, liste « À cuisiner », fil des copines, notifications sobres |
| 22 | Créatrices | Profils revendicables, statistiques, badge, « d'après @X », retrait sur demande |
| 23 | Import v2 | Sites FR en priorité, YouTube, Pinterest, captures ; prudence sur TikTok |
| 24 | App iPhone & Android | Coque Capacitor + extension de partage, notifications |
| 25 | Production & conformité | DSA, AI Act, RGPD, modération, CGU, stores → **bêta privée** |
| 26 | Foyer | Planning et courses partagés en temps réel |
| 27 | Tablée partageable | Invitation par lien sans appli, régimes des invités, menu compatible, qui apporte quoi |
| 28 | Croissance | Clubs, défis mensuels, récap annuel, référencement → **lancement public** |
| Ensuite | Revenus | Abonnements et partage de revenus créatrices, courses en drive, cuisine en direct |
