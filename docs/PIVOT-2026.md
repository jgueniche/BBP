# PIVOT-2026.md — BBP devient une app de cuisine collaborative

Session 17 · 29/09/2026 · Statut : **proposition à valider** (voir §8 Questions). Rien n'est encore décidé hormis la suppression du sport (ADR-027).

## 1. La demande
La femme de Jeremy reprend l'application pour en faire une **app de cuisine collaborative**, beaucoup plus **girly**, qui ne soit plus centrée sur le casher mais qui **propose du casher, du halal, du vegan, du végétarien indien, du pescétarien, du végétalien…** : toutes les communautés, tous les régimes. On **garde l'import de recettes depuis les réseaux sociaux (extrêmement important)**. La partie **sport est supprimée**. La charte graphique sera repensée en profondeur dans une session dédiée Claude Design : ici, seulement une direction et un brief.

## 2. Audit de l'existant

### 2.1 En bref
BBP est une app **solide techniquement et très avancée** (16 sessions, ~29 000 lignes TypeScript après retrait du sport, 43 tables Postgres avec RLS partout, 205 tests unitaires + 3 e2e, CI lint/typecheck/test/build, prod sur Vercel Paris + Supabase Paris, Lighthouse accessibilité 100). Mais elle a été pensée comme un **coach minceur casher** : le « régime » (calories, poids, TDEE, garde-fous TCA) et le **judaïsme** (casher, chabbat, hebcal, expressions judéo-arabes de Kémia) sont diffusés partout.

- **~40 % du code sert directement la nouvelle app** (import social, recettes, carnets partagés, mode cuisine, communauté, PWA/SEO) et se garde presque tel quel.
- **~25 % est un bon moteur à généraliser** (casher → multi-régimes, calendrier juif → calendrier des fêtes multi-traditions, planning individuel → planning du foyer, Kémia → sous-cheffe).
- **~35 % sort du périmètre** (sport — supprimé dans cette session —, journal alimentaire, poids, TDEE, progrès, gamification minceur, nudges de pesée).
- Les notions casher/juives touchent **66 fichiers (670 lignes)**, le suivi santé **29 fichiers**, Kémia **100 mentions** : le pivot est un vrai chantier, pas un simple rethème.

### 2.2 Module par module
| Module | Taille | Ce qui existe | Verdict |
|---|---|---|---|
| **Import de recettes** | ~700 l. + agent IA | Lien web (JSON-LD schema.org), TikTok/YouTube (oEmbed officiel), Instagram (oEmbed si jeton Meta, sinon légende collée), texte collé, photo/capture (IA vision), parseur FR sans IA, crédit auteur verrouillé, partage Android (Web Share Target) | **GARDER + RENFORCER** — c'est le cœur. Manque : vidéo (IA multimodale), plusieurs captures d'un carrousel, Pinterest/Facebook, parcours iPhone, file d'attente + statut, quotas de coût IA, photo de couverture, traduction EN→FR, détection de doublons |
| **Recettes** (fiche, éditeur, fork « Ma version », versions liées, notes perso, likes/saves/commentaires, mode cuisine plein écran avec minuteurs multiples) | ~4 300 l. | Très complet | **GARDER** — généraliser `origin` (6 origines maghrébines/juives → cuisines du monde), `category`, `version_kind` (boutargue/protéine → variantes par régime) |
| **Carnets partagés** (collections, membres éditeur/lecteur, invitation par lien) | inclus | La seule vraie brique collaborative | **GARDER + ÉTENDRE** (rôles, activité, commentaires, temps réel, notifications) |
| **Nutrition des recettes** (Ciqual 3 185 aliments, kcal/portion en SQL) | ~1 300 l. | Fiable (DoD ±10 %) | **GARDER EN OPTION** — info discrète, et Ciqual devient la base d'ingrédients des attributs régimes |
| **Planning + liste de courses** | ~3 000 l. | Validateur programmatique, générateur IA + déterministe, rayons, partage par lien en lecture seule | **TRANSFORMER** — aujourd'hui individuel, centré calories + casher : passer au **foyer partagé** (liste cochable à plusieurs, en temps réel), contraintes multi-régimes, zéro cible calorique |
| **Moteur casher** (bassari/halavi/parvé, délai viande→lait, Pessah) | ~370 l. | Règles + LLM si doute, indication jamais certification | **GÉNÉRALISER** — devient un module d'un moteur de régimes (halal, vegan, végétarien, pescétarien, végétarien indien, jaïn, sans porc, sans alcool, sans gluten, allergènes…) |
| **Calendrier juif** (hebcal, 45 villes, cache, fêtes, jeûnes, heures calmes) | ~1 150 l. | Excellent, testé sur 2027 | **GÉNÉRALISER (opt-in)** — « calendrier des fêtes » multi-traditions |
| **Communauté** (fil, groupes, réactions ×3, modération 2 étages, file admin, charte) | ~1 700 l. | Complet, sans algorithme | **GARDER + RETHÉMATISER** — réactions « bsahtek/mabrouk/ya ouili » et posts « plat de chabbat » à universaliser |
| **Kémia** (chat streaming, conversations, outils, mémoires, quotas, 40 évals) | ~900 l. + agents IA | Infra IA propre (Gemini Flash + repli Claude, sans IA = mode dégradé) | **TRANSFORMER** — rôle de sous-cheffe (adapter, substituer, planifier, répondre en cuisine) ; persona à trancher |
| **Journal alimentaire, poids, TDEE adaptatif, progrès, garde-fous minceur, nudges de pesée** | ~5 000 l. | Très abouti… pour une app de régime | **SUPPRIMER (recommandé)** — hors sujet, lourd en RGPD (données de santé), et la « diet culture » est un risque pour une cible féminine |
| **Gamification** (XP, niveaux, badges, séries, défis) | ~670 l. | Liée au journal et au poids | **REFONDRE ou SUPPRIMER** |
| **Sport** | ~2 000 l. | Programmes, séances guidées, 188 exercices | **SUPPRIMÉ** dans cette session (migration de nettoyage prête, non appliquée) |
| **PWA** (hors ligne, installation, push, share target) + **SEO** (`/r/[slug]`, JSON-LD, sitemap) | ~850 l. | Solide | **GARDER** |
| **Charte « pro & chaleureux »** : kit UI shadcn (~1 100 l.) + logo BBP, illustrations maghrébines, avatar Kémia (~600 l.) | ~1 700 l. | Cohérente mais pas « girly » | **KIT : GARDER** (rethème par les tokens CSS) · **IDENTITÉ : REMPLACER** via Claude Design |
| **Onboarding** (TDEE, consentement santé, objectifs) | ~840 l. | Parcours minceur | **REFAIRE** — prénom, régimes & allergies, foyer, invitations |
| **Auth** (email + mot de passe) | — | OTP et Google/Apple repoussés | **COMPLÉTER** — Apple/Google indispensables sur mobile |

### 2.3 Dette et risques à traiter quoi qu'il arrive
- **La session « Production, RGPD, Club » du brief (§10.15) n'a jamais été faite** : pas de CGU/politique de confidentialité, pas de CSP, pas de rate limiting, pas de tests RLS par rôle, pas de Sentry/PostHog, pas de Stripe.
- **Export et suppression RGPD incomplets** : l'export ne contient ni recettes, ni carnets, ni posts, ni conversations Kémia ; la suppression laisse recettes, posts, commentaires et le compte auth.
- **Import sans quota ni suivi de coût** (chaque import appelle l'IA), et synchrone (pas de statut si ça dure).
- **Pas d'upload de photos de recettes** (colonnes prêtes, UI jamais faite) — rédhibitoire pour une app de cuisine visuelle.
- **RGPD après pivot** : les préférences « casher » / « halal » révèlent une conviction religieuse et les allergies sont des données de santé → **données sensibles (art. 9)** même sans suivi du poids : consentement explicite, minimisation, jamais d'étiquette « juive » / « musulmane » sur une personne.
- **Données en dur** : valeurs casher dans les contraintes SQL (`origin`, `version_kind`, couleurs `halavi`/`bassari` des carnets…) → migrations de généralisation à prévoir.
- Plan Vercel Hobby limité à 2 crons ; e2e hors CI.

## 3. Le marché

> Veille en cours (apps d'import social, marché français et fonctions collaboratives, règles des régimes, créatrices et tendances visuelles) : cette section sera complétée dans la même session.

## 4. La vision proposée

### 4.1 Pitch
> **Le carnet de recettes qui se remplit tout seul depuis Insta et TikTok, s'adapte à chaque table (casher, halal, vegan, sans gluten…) et se cuisine à plusieurs.**

### 4.2 Pour qui
Des femmes de 22 à 45 ans, francophones, qui cuisinent pour elles, leur couple, leur famille ou leurs colocs, et qui reçoivent. Elles enregistrent des dizaines de recettes sur Instagram et TikTok sans jamais les retrouver, et composent avec des régimes variés autour de la table : une amie vegan, un conjoint qui mange halal, un enfant allergique, une belle-mère qui mange casher.

### 4.3 Trois problèmes, trois piliers
| Problème | Pilier | Ce que fait l'app |
|---|---|---|
| « Mes recettes sont éparpillées » (captures, enregistrements Insta, TikTok, Pinterest, cahier de mamie) | **Capturer** | Import en un geste depuis n'importe où (lien, partage, capture, photo d'un livre, recette manuscrite, vidéo), rangement automatique, crédit à la créatrice |
| « Je ne sais pas si ça convient à tout le monde » | **Adapter** | Pastilles de compatibilité par régime et par personne, adaptation IA expliquée (« rends-la vegan / halal / sans gluten »), portions et conversions |
| « Organiser les repas à plusieurs est pénible » | **Partager** | Carnets partagés, foyer (planning + liste de courses en temps réel), **Tablée** : dîner avec invités, menu compatible avec tout le monde, « qui apporte quoi » |

### 4.4 Principes produit
- **Zéro diet culture** : ni poids, ni calories en vedette, ni culpabilité. L'info nutritionnelle reste discrète et optionnelle.
- **Toutes les traditions, sans étiquette** : un régime religieux est une *règle de cuisine* choisie par la personne, jamais une identité affichée. Indication, jamais certification.
- **Les créatrices d'abord** : chaque recette importée garde l'autrice, le lien, et renvoie du trafic vers elle.
- **Un geste pour importer, dix secondes pour retrouver.**
- **Beau, doux, lisible** : girly assumé, mais contraste AA et pas de cliché « tout rose ».

### 4.5 Parcours clés de la V1
1. **Importer** : partage depuis Insta/TikTok → fiche propre (photo, ingrédients, étapes, temps) + pastilles régimes + crédit.
2. **Retrouver** : recherche en langage naturel (« poulet sans four en 30 min »), filtres régime/cuisine/temps, carnets.
3. **Adapter** : variante liée à l'originale, substitutions expliquées, validée par le moteur de règles (comme le planning casher aujourd'hui).
4. **Partager** : carnet avec sa sœur ou ses copines ; foyer avec son conjoint.
5. **Planifier** : semaine du foyer + liste de courses cochable à plusieurs, en temps réel.
6. **Recevoir (Tablée)** : je crée un dîner, j'invite, chacun indique ses contraintes, l'app propose un menu compatible et répartit les plats.
7. **Cuisiner** : mode cuisine existant (étapes, minuteurs, écran allumé), portions ajustables.

### 4.6 Plus tard (V2+)
Communauté publique et profils de créatrices · calendrier des fêtes multi-traditions (Ramadan/Aïd, Chabbat/Pessah, Noël/Carême, Diwali, Nouvel an lunaire…) · « frigo » (que cuisiner avec ce que j'ai) · cuisine à plusieurs en direct · livre de famille en PDF · courses en drive · premium.

## 5. Architecture cible (on garde la stack)
Next.js 15 + Supabase Paris + Vercel + Gemini Flash (repli Claude) restent : ils sont en prod, testés, et conviennent.

| Brique | Évolution |
|---|---|
| Moteur de régimes (`lib/diets/`) | Attributs par ingrédient (origine animale, espèce, poisson à écailles, crustacés, lait, œuf, miel, gélatine, alcool, racines, alliacées, gluten, 14 allergènes…) + règles par régime + niveaux de rigueur ; le casher actuel (viande/lait, délai, Pessah) devient un module ; tests unitaires par régime |
| Profils alimentaires | Pour moi, les membres du foyer (y compris un enfant sans compte) et les invités récurrents : régimes, rigueur, allergies, dégoûts |
| Recettes | `origin` → cuisines du monde, `category` élargie, `version_kind` → variantes (originale, vegan, halal, casher, sans gluten, légère…), photo de couverture, pastilles de compatibilité calculées |
| Import | Table de jobs asynchrones avec statut, quotas et coût IA, vidéo via IA multimodale, captures multiples, dédoublonnage |
| Foyer & Tablée | `households`, `household_members`, planning et listes de courses rattachés au foyer (Supabase Realtime) ; `tablees`, invités, plats assignés |
| Agents IA | `recipe_importer` v2, `diet_classifier` (ex-`kashrut_checker`), `recipe_adapter` (ex-« version Protéine »), `menu_planner` (ex-`meal_planner`, contraintes multi-régimes), `moderator` conservé ; `food_logger`, `nudger` et TDEE supprimés |
| Calendrier | `lib/calendars/` : le moteur juif actuel + islamique, chrétien, hindou, chinois, en opt-in |
| Mobile | PWA aujourd'hui ; coque native (Capacitor) avec extension de partage iOS/Android à planifier (voir benchmark) |

## 6. Direction visuelle (pour la session Claude Design)

> En cours de rédaction : trois pistes de palettes et typographies + brief prêt à coller.

## 7. Feuille de route

> En cours de rédaction.

## 8. Questions de cadrage

Les quatre premières bloquent l'écriture du brief v2. Pour les autres, une réponse par défaut est proposée : sans avis contraire, c'est elle qui sera retenue.

### Bloquantes
1. **Suivi santé** (journal alimentaire, poids, calories, TDEE, progrès, coach minceur) : on le **supprime** (recommandé), on le **met en sommeil** (masqué, réactivable), ou on le **garde** ?
2. **« Collaboratif »**, quelles priorités ? Foyer (couple, famille : planning et courses partagés) · Tablée (dîners avec invités aux régimes différents) · Carnets partagés (copines, famille, recettes de mamie) · Communauté publique (fil, créatrices) · Cuisine en direct à plusieurs. *Recommandé : foyer + carnets + Tablée en V1, communauté en V2.*
3. **Kémia** : garder la tata judéo-tunisienne telle quelle · la garder mais en « copine en cuisine » multiculturelle, sans minceur (recommandé) · un assistant discret sans personnage · plusieurs personnages au choix ?
4. **Plateforme** : PWA d'abord puis stores · app native (App Store / Play Store) prioritaire pour partager depuis Instagram sur iPhone ?

### Avec réponse par défaut
5. **Nom** : BBP (Boukha = alcool, Protéines = fitness) ne colle plus. *Défaut : nouveau nom à choisir, pistes plus bas, disponibilité à vérifier (INPI, EUIPO, stores, domaine).*
6. **Données existantes** : *défaut : on garde le projet Supabase/Vercel, les comptes, les 35 recettes et les carnets ; les données santé sont purgées avec le module.*
7. **Régimes de la V1** : *défaut : végétarien, vegan, pescétarien, sans porc, sans alcool, halal, casher, végétarien indien, sans gluten, sans lactose, 14 allergènes ; jaïn et bouddhiste en V2.*
8. **Langue** : *défaut : français seul, traduction automatique des recettes étrangères à l'import ; anglais plus tard.*
9. **Modèle économique** : *défaut : gratuit au lancement, puis freemium (imports IA limités par mois, premium pour l'illimité, le foyer et les Tablées).*
10. **Cible** : *défaut : femmes 22-45 ans francophones, toutes cultures ; l'app reste utilisable par tout le monde.*
11. **Calendrier des fêtes multi-traditions** (Ramadan/Aïd, Chabbat/Pessah, Noël/Carême, Diwali, Nouvel an lunaire) : *défaut : oui, en V2, opt-in.*
12. **Organisation** : la femme de Jeremy devient product owner. *Défaut : la product owner valide les briefs et les maquettes ; les comptes (GitHub, Vercel, Supabase, clé Gemini) restent au nom de Jeremy tant qu'aucun transfert n'est décidé.*
