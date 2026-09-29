# PIVOT-2026.md — BBP devient une app de cuisine collaborative

Session 17 · 29/09/2026 · Statut : **proposition à valider** (voir §9 Questions). Rien n'est encore décidé hormis la suppression du sport (ADR-027).

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
| **Import de recettes** | ~700 l. + agent IA | Lien web (JSON-LD schema.org), TikTok (oEmbed : légende + autrice), YouTube (titre seulement), Instagram (oEmbed avec jeton Meta — **obsolète** : Meta ne renvoie plus ni légende ni autrice, donc légende à coller), texte collé, photo/capture (IA vision), parseur FR sans IA, crédit auteur verrouillé, partage Android (Web Share Target) | **GARDER + RENFORCER** — c'est le cœur. Manque : partage depuis iPhone (coque native), description et vidéo YouTube, plusieurs captures d'un carrousel, Pinterest, file d'attente + statut, quotas de coût IA, photo de couverture, reformulation (pas de copie mot pour mot), détection de doublons |
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
- **Import Ciqual** : le script compare d'anciens libellés de groupes, or Ciqual 2025 (3 484 aliments) a renommé ses groupes → passer aux codes avant toute réimport.
- `@hebcal/core` est sous licence GPL-2.0 : il ne tourne aujourd'hui que côté serveur (vérifié dans le build), à garder ainsi.
- Plan Vercel Hobby limité à 2 crons ; e2e hors CI.

## 3. Le marché

Veille du 29/09/2026 (4 recherches web parallèles). Les chiffres marqués « déclaré » viennent des entreprises elles-mêmes et n'ont pas été vérifiés en source primaire.

### 3.1 Ce qu'il faut retenir
- **Le marché français repose sur deux modèles** : des médias gratuits financés par la pub (Marmiton, CuisineAZ, 750g, Journal des Femmes) et Jow, rémunéré par la grande distribution. **Aucun acteur majeur ne combine import social et collaboration.**
- **Les importeurs Insta/TikTok sont nombreux** (ReciMe, Honeydew, Deglaze, Flavorish, GoomY, RecetteClic…). Certains partagent une bibliothèque dans un foyer, mais **aucun ne gère des régimes différents par personne, et aucun ne propose de filtre casher ou halal**.
- **Personne ne gère le repas pour des convives aux contraintes mixtes** (un vegan + un halal + un sans gluten + un casher) ni le foyer où chacun suit un régime différent. Seules des micro-apps américaines s'y essaient (Safe Plate Potluck Planner, ReciBites, Ollie), sans règles composites (viande + lait, alcool, ail/oignon jaïn) ni badge de compatibilité par convive.
- **La chaîne est cassée partout** : aucune app ne relie recette importée → menu de groupe → qui apporte quoi → liste partagée → drive.
- **Les apps d'industriels ferment ou sont revendues** : Yummly a fermé en décembre 2024, Mealime annonce sa fermeture pour le 21/10/2026, Kitchen Stories a été revendue en 2025. **L'export des données devient un argument de confiance.**

### 3.2 Les acteurs
| Acteur | Audience | Modèle | Régimes | Social / collaboratif |
|---|---|---|---|---|
| Marmiton | 16,8 M visiteurs/mois, n°1 | Gratuit + pub, cible femmes 35-49 ans | Filtres régime ; halal/casher non trouvés | Avis, planning ; plaintes : pubs, favoris perdus |
| CuisineAZ, Cuisine Actuelle, 750g, Journal des Femmes | n°2 à n°5 | Médias SEO + pub ; 750g sans pub à 9,99 €/an | Standards | Faible |
| **Jow** | 3,5 M actifs FR (2024) | Recettes → panier drive chez 7 enseignes, commission < 10 % | Sans porc, végé, vegan, sans gluten/lactose ; **ni halal ni casher** | Un seul profil par foyer |
| Cookidoo (Thermomix) | > 6 M abonnés monde | 60 €/an, lié au robot | Non documentés | Liste partageable |
| Kitchen Stories | ~2 M visiteurs/mois | 79,99 €/an | Végé/vegan | Import réseaux ajouté |
| Samsung Food (ex-Whisk) | En France depuis 2023 | Freemium, 59,99 $/an | 14 régimes | Communautés privées, listes partagées, « Made It! » |
| **ReciMe** | 15 M utilisateurs (déclaré) | Import Insta/TikTok, 5 imports/sem. gratuits, ≤ 49,99 €/an | Macros | Partage par lien/PDF |
| Frigo Magic | 120 k réguliers (2022) | Gratuit + pub | Limité | Non |
| Chefclub | 110 M abonnés sociaux | Vidéo virale, livres, kits | — | Audience, pas communauté |
| Nouveaux FR (Cuisto, The Pitance, GoomY) | Sans traction publique | Import IA, planning | — | The Pitance : partage foyer |

Référents collaboratifs hors cuisine pure : **Bring!** et **Listonic** (listes partagées, > 10 M), **AnyList** (planning + recettes du foyer), **Heirloom** (carnet familial avec historique « qui a modifié quoi »), **SignUpGenius / PerfectPotluck** (qui apporte quoi, sans aucune gestion des régimes).

### 3.3 L'audience
- **Instagram** : 45,2 M visiteurs/mois en France (54 % de femmes, les 25-34 ans en sont le premier groupe) ; **TikTok** : 26,4 M ; **Pinterest** : 15 M (67 % de femmes). Médiamétrie 07/2026.
- **Chez les 18-34 ans, les influenceurs sont la 1re source de découverte de recettes** (45 %) et **81 % ont déjà cuisiné une recette vue sur les réseaux** (Episto/Webedia 2025).
- **43 % des femmes suivent des comptes food** contre 31 % des hommes (OpinionWay/SIAL 2026).
- **Charge mentale** : 41 % de la charge mentale quotidienne est liée aux repas ; 70 % des Français rentrent des courses sans savoir quoi cuisiner (81 % chez les moins de 35 ans) ; 81 % des femmes décident de ce que mange le foyer.
- **« Cimetière de captures »** : aux États-Unis, 20 % de ceux qui sauvegardent des recettes ne les cuisinent presque jamais. **Aucune donnée française** : à mesurer nous-mêmes.

### 3.4 Les créatrices et créateurs
- **Grands comptes FR** : Chefclub, FastGoodCuisine (7,5 M YouTube), Hervé Cuisine, @louloukitchen_ (2,6 M IG), Cédric Grolet (13,6 M IG), L'atelier de Roxane (2,6 M IG), Not So Superflu (1,5 M IG, anti-gaspi), Roro Cuistot.
- **Cuisine maghrébine : énorme sur YouTube** (Oum Walid 10,8 M abonnés, Amour de Cuisine) ; ramadan et Aïd sont des pics.
- **Casher, indien, africain, antillais, vegan : petites audiences en France** (Marie Laforêt 102 k, Je cuisine créole 136 k, Chef Anto, comptes casher peu mesurés ; aucun créateur de cuisine indienne basé en France avec audience vérifiable). **Une niche sous-servie à recruter activement.**
- **International** : Busy in Brooklyn et Jake Cohen (casher/juif moderne), Nisha Vora (vegan, plans repas payants = 45 % de son CA), Hebbar's Kitchen (indien végétarien, a sa propre app), Carolina Gelen, Nara Smith, Maangchi.
- **Leur économie** : « commente RECETTE » en DM (ManyChat), e-books, newsletters, plans repas payants. Des blogueurs disent avoir perdu 30 à 80 % de trafic à cause des résumés IA ; Pestle a été critiquée pour avoir caché le lien source. **Une app d'import sera jugée sur un seul point : rend-elle crédit et trafic aux créatrices, ou les capte-t-elle ?**
- **Droit français** : une recette en tant que telle n'est pas protégée (TGI Paris 1997), mais son texte, ses photos et ses vidéos le sont.
- **Exigences produit** : crédit visible (nom, avatar, lien en un tap), vidéo en embed officiel jamais ré-hébergée, pas de copie mot pour mot du texte, profil créatrice revendicable avec statistiques (sauvegardes, clics sortants), retrait sur demande, partage de revenus à terme.

### 3.5 Monétisation observée
| App | Prix |
|---|---|
| Cookidoo | 60 €/an |
| Kitchen Stories | 7,99 €/mois · 79,99 €/an |
| ReciMe | ≤ 49,99 €/an (5 imports/sem. gratuits) |
| Samsung Food+ | 6,99 $/mois · 59,99 $/an |
| AnyList | 9,99 $/an solo · 14,99 $/an foyer |
| Heirloom | 39,99 $/an (partage familial gratuit) |
| 750g (sans pub) | 9,99 €/an |

- Conversion (RevenueCat 2026) : 10,7 % avec paywall dur contre 2,1 % en freemium ; les **essais longs** (17-32 j) convertissent mieux (42,5 %).
- Affiliation : le drive dépasse 10 Md€ en France (39 % des Français y achètent) ; modèles Jow (commission) ou Mealz (retail media en marque blanche).
- **Pistes** : brider les imports IA en gratuit (≈ 5/semaine), **jamais la collaboration** (c'est elle qui fait venir les autres), essai long, abonnement 40-60 €/an, affiliation drive, puis partage de revenus avec les créatrices.

### 3.6 Idées tirées des tendances contenu
- **« Même plat, toutes les tables »** : le chou farci existe en version juive (holishkes), turque (dolma), coréenne… Relier les versions communautaires d'une même recette.
- **Gélatine → agar** (tendance *Gimme Gummy*) : substitution qui rend une recette casher, halal et vegan d'un coup.
- **Cartes-recettes à envoyer et cahier de famille collaboratif** (tendances *Pen Pals*, *Throwback Kid*).
- **Filtres positifs** (riche en fibres, en protéines) plutôt que des calories : jamais culpabilisants.
- **« La tendance du moment, version de ta communauté »** : le viral naît souvent d'une cuisine communautaire (chocolat de Dubaï = knafeh revisité).

### 3.7 L'import social : concurrents et faisabilité
Le marché des « importeurs » est saturé : tous branchent de l'IA sur la feuille de partage du téléphone. Le parcours standard : **partager le post depuis Instagram/TikTok → l'app lit la légende, puis transcrit l'audio, puis lit le texte incrusté, puis cherche le site d'origine**, environ 5 imports gratuits puis 25 à 60 $/an.

| App | Plateformes | Comment elle importe | Collaboratif | Prix | Note App Store US / FR |
|---|---|---|---|---|---|
| **ReciMe** | iOS, Android, Chrome | Légende → audio → site d'origine ; capture | Partage par lien ; planning et courses | 5 imports/sem., puis ≈ 30-60 $/an | 4,8 (300 k) / 4,6 (2 k) |
| **Honeydew** | iOS, Android, Chrome | Partage, capture, recette manuscrite ; l'IA « regarde » la vidéo (déclaré) | Foyer, planning IA, courses par rayon | 39,99 $/an | 4,8 / 4,9 |
| **Pestle** | Apple | Partage, IA sur l'appareil | Foyers, **cuisine à distance via SharePlay** | 24,99 $/an | 4,7 / 4,6 |
| **Deglaze** | iOS, Android, web | **4 signaux** : légende, audio, texte incrusté, scènes | Foyer, suivre amis et créateurs | 49,99 $/an | 4,9 |
| **Flavorish** | iOS, Android, web | Légende + « deep import » ; le plus fiable au test d'Android Police (nov. 2025) | Collections partagées, courses en temps réel | 49,99 $/an | 4,7 |
| Samsung Food | iOS, Android, web | Sites (schema.org), scan photo ; pas de vidéo | 5 400 communautés, 14 régimes | 59,99 $/an | 4,8 / 4,6 |
| Crouton, Mela, Paprika | Apple (Paprika partout) | Web + description, OCR | iCloud / aucun | Achat unique | 4,6-4,9 |
| Stashcook, Recipe Keeper, cooked.wiki | Multi | Web, IG/TikTok, OCR | Partage familial, planning | 20-30 $/an ou achat unique | 4,5-4,8 |
| **GoomY** (FR) | iOS, Android | Partage ; « visuel + texte » | Communauté publique, créateurs mis en avant | 3,99-29,99 € | FR 4,6 (2,1 k), n°11 Cuisine |
| **RecetteClic** (FR) | iOS, Android | Lien, photo **ou vidéo** ; légende + audio + texte à l'écran | — | 29,99 €/an, hébergement UE | FR 5,0 (5) |

**Le créneau libre** : certaines apps partagent une bibliothèque dans un foyer (Honeydew, Deglaze, Pestle, Stashcook), mais **aucune ne combine positionnement féminin, collaboration de groupe et régimes différents par personne**. Les filtres de régime sont rares, et **aucun filtre casher ou halal n'existe**.

**Ce que ça implique techniquement** (vérifié le 29/09/2026) :
- **iPhone : une app web ne peut pas apparaître dans la feuille de partage.** Le Web Share Target n'est toujours pas pris en charge (y compris iOS 26 ; bug WebKit ouvert). Les contournements (raccourci iOS, bouton « Coller le lien ») ajoutent beaucoup de friction. **Il faut une coque native avec extension de partage.** Sur Android, la PWA actuelle suffit.
- **Instagram ne donne plus la légende.** Depuis le 03/11/2025, l'oEmbed ne renvoie plus ni auteur ni vignette ; il est accessible sans jeton depuis juin 2026, mais réservé à l'affichage, et Meta interdit d'en extraire le contenu. **Le chemin Instagram actuel de BBP (jeton Meta) ne sert plus à rien** : on passe par une **capture d'écran ou la légende copiée**, lues par l'IA.
- **TikTok** : l'oEmbed public renvoie bien la légende et l'auteur (le code actuel l'utilise). Troncature des longues légendes non vérifiée ; usage pour extraction = zone grise des CGU.
- **YouTube** : la **description complète** est accessible par l'API officielle (1 unité de quota), et **Gemini accepte directement une URL YouTube publique** pour analyser la vidéo (≈ 6 k tokens pour un Short de 60 s). Le code actuel ne lit que le titre.
- **Pinterest** : oEmbed non documenté mais fonctionnel ; la page de l'épingle mène au site d'origine, dont on lit le JSON-LD `Recipe`.
- **Vidéos Instagram/TikTok** : les concurrents qui transcrivent l'audio téléchargent forcément la vidéo, hors de toute API officielle — contraire aux CGU et aux règles App Store 5.2.2/5.2.3. Toléré en pratique aujourd'hui, mais **à ne développer qu'après un avis juridique**.
- **Droit d'auteur** : on ne recopie pas la légende mot pour mot (11 mots peuvent suffire à constituer une reproduction, CJUE *Infopaq*), on ne ré-héberge ni vidéo ni photo. Pratique la plus sûre : import déclenché par l'utilisatrice, fiche **reformulée**, crédit + lien + embed officiel, pas de republication publique sans accord, retrait sur demande.
- **Coque native** : **Capacitor** (plugin `@capgo/capacitor-share-target`, extension iOS via App Group) réutilise l'app web existante ; les Server Actions devront être doublées de routes `/api` pour l'app. Charger simplement le site Vercel dans la coque augmente le risque de refus Apple (règle 4.2 : pas de « site reconditionné ») : il faudra de vraies fonctions natives (extension de partage, mode cuisine hors ligne, notifications, widgets). **Expo/React Native** donnerait un rendu plus natif au prix d'une réécriture de l'interface.

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

## 5. Tous les régimes : le moteur à construire

### 5.1 Principe
On remplace la détection par mots-clés (aujourd'hui : listes « viande / lait / poisson / non casher ») par des **attributs d'ingrédient**, évalués par des **règles par régime** et des **contraintes de repas et de temps** (viande puis lait, délais, pas de repas après le coucher du soleil pour les jaïns, jeûnes). Pour chaque recette et chaque personne, le moteur répond : **compatible · adaptable (avec substitutions) · incompatible · à vérifier**. Les nuances (école juridique pour le halal, délai casher, kitniyot, présure, alcool cuit) deviennent des **réglages du profil**, pas des régimes séparés.

### 5.2 Les règles, régime par régime
| Régime | Exclut | Nuances à régler dans le profil |
|---|---|---|
| **Casher** | Porc, lapin, cheval…, poissons sans nageoires ni écailles, fruits de mer, insectes (E120), sang ; viande, vin, présure et gélatine « à choisir certifiés » ; au même repas : viande + lait, poisson + viande ; à Pessah : hametz (+ kitniyot selon la tradition) | Délai viande → lait {6 ; 5,5 ; 3 ; 1} h ; 6 h après un fromage affiné ; poisson + lait (beaucoup de Séfarades l'évitent) |
| **Halal** | Porc et dérivés, sang, carnassiers, boissons alcoolisées ; viande « à choisir certifiée » | Extrait de vanille, vin cuit, gélatine, présure ; fruits de mer selon l'école (hanafite : poissons seulement) |
| **Végan** | Tout produit animal, miel inclus ; E120, E901, E904… | Vins et bières collés |
| **Végétarien** | Chair ; gélatine, saindoux, fonds, nuoc-mâm, anchois (Worcestershire, César), E120 | Présure animale (parmesan) |
| **Pescétarien** | Mammifères, oiseaux, gélatine terrestre | Fruits de mer oui ou non |
| **Végétarien indien** | Bœuf, chair, **œuf**, gélatine, présure animale | Sans oignon ni ail, sans champignons ; profil « vrat » (jeûne) |
| **Jaïn** | Chair, œuf, miel, alcool, racines, tubercules et bulbes (pomme de terre, oignon, ail, carotte), champignons, fermentés | Pas de repas après le coucher du soleil |
| **Bouddhiste (mahayana)** | Végétarien + ail, oignon, poireau, ciboulette, asa-fœtida ; alcool | Œuf et laitages selon les écoles |
| **Sans porc** | Porc, sanglier, saindoux, lardons, boyaux ; E471 et gélatine « à vérifier » | — |
| **Sans alcool** | Boissons, extraits (vanille, mirin) | Plat au vin même cuit : ≈ 5 % de l'alcool reste après 2 h 30 de mijotage, ≈ 75 % après flambage |
| **Sans gluten** | Blé (épeautre, semoule, boulgour, couscous, seitan), orge, seigle, avoine non certifiée | Cœliaque : contamination croisée |
| **Sans lactose** | Lait, crème, fromages frais | Fromages affinés et beurre tolérés en mode souple |
| **14 allergènes UE** | Gluten, crustacés, œufs, poissons, arachides, soja, lait, fruits à coque, céleri, moutarde, sésame, sulfites, lupin, mollusques | Propagés depuis les sous-ingrédients (bouillon → céleri, sauce soja → soja + blé) |

Low-FODMAP, sattvique et flexitarien : plus tard (règles floues ou qui dépendent des quantités).

### 5.3 Les attributs d'ingrédient
`animal_source[]` · `species` · `ritual_slaughter_required` · `fish_fins_scales` · `by_product` (gélatine, saindoux, fond, nuoc-mâm, carmin…) · `origin_uncertain` · `dairy` · `rennet` · `alcohol` (aucun, trace, extrait, boisson) + `grape_derived` · `plant_part` (racine, tubercule, bulbe…) · `pungent` (ail, oignon…) · `fermented` · `gluten_cereal` · `pessah` · `allergens[]` / `traces[]` · `fodmap[]` · `provenance` (règle, IA, Open Food Facts, Ciqual, manuel + confiance).

La classe bassari / halavi / parvé actuelle devient un attribut dérivé. **Chaque substitution est réévaluée contre tous les régimes actifs** : l'asa-fœtida convient au jaïn mais pas au bouddhiste et contient souvent du blé ; le lait d'amande est un fruit à coque ; le lait d'avoine non certifié n'est pas sans gluten.

### 5.4 Substitutions de base
| Ingrédient | Remplacé par | Rend compatible | Attention |
|---|---|---|---|
| Vin de cuisson | Jus de raisin + vinaigre, ou bouillon + vinaigre de cidre | Halal, sans alcool | Casher : produits de la vigne certifiés |
| Vanille en extrait, rhum, mirin | Gousse de vanille, fleur d'oranger, vinaigre de riz + sucre | Halal strict, sans alcool | — |
| Gélatine | Agar-agar, pectine | Végé, végan, halal, casher | Dosage différent |
| Beurre, crème dans un plat de viande | Huile d'olive, margarine ou crème végétale | Casher, végan, sans lactose | Soja allergène |
| Œuf | Aquafaba, lin moulu + eau | Végan, jaïn, indien | — |
| Lardons | Dinde ou bœuf fumés certifiés ; tofu fumé | Halal, casher, sans porc ; végé | Soja |
| Nuoc-mâm, anchois | Sauce soja ou tamari + miso, kombu | Végé, végan | Soja, gluten |
| Miel | Sirop d'érable, d'agave, de datte | Végan, jaïn | — |
| Oignon, ail | Asa-fœtida, gingembre, graines de fenouil | Jaïn, indien | Conflits ci-dessus |
| Farine de blé | Riz, sarrasin, maïs, pois chiche | Sans gluten | Pessah ashkénaze : kitniyot |

### 5.5 Les données
Aucune API ne couvre le halal (Edamam et Spoonacular, américaines, servent de référence). Socle proposé : **Ciqual 2025** (3 484 aliments, licence Etalab ; notre script d'import compare d'anciens libellés de groupes, il faudra passer aux codes) + **Open Food Facts** (analyse vegan/végétarien, labels halal et casher sur moins de 1 % des produits, allergènes ; licence ODbL) + **une table d'attributs maison** (règles, puis IA, puis relecture humaine).

### 5.6 Le calendrier des fêtes multi-traditions
| Tradition | Calcul hors ligne | Méthode et limites |
|---|---|---|
| Juive | Oui | `@hebcal/core` actuel. Licence GPL-2.0 : exécuté uniquement côté serveur (vérifié dans le build), à garder ainsi, jamais dans l'app native |
| Ramadan, Aïds | Oui, à ±1 jour | Calendrier islamique `Intl` ; afficher une fourchette (Grande Mosquée de Paris et CFCM divergent parfois) ; iftar et suhour via `adhan` (MIT), angle 12° ou 18° au choix |
| Pâques, Carême, Noël, orthodoxe | Oui | Comput de Pâques ; +13 jours pour le calendrier julien ; jeûnes orthodoxes ≈ végans |
| Nouvel An lunaire | Table | Le calcul intégré se trompe pour 2027 (7/02 au lieu du 6/02) → table officielle |
| Diwali, Holi, Navratri | Partiel | Dépend du lieu → table annuelle validée pour Paris |
| Jaïn, bouddhiste | Table | Coucher du soleil calculable |

### 5.7 Juridique et RGPD
- **Halal et casher n'ont pas de définition légale** : écrire « compatible halal (ingrédients) » ou « viande à choisir certifiée », jamais « certifié » ni « 100 % halal ».
- **Sans gluten** : « sans ingrédient contenant du gluten » + « choisis des produits étiquetés sans gluten » (le seuil légal de 20 mg/kg vise les produits, pas les recettes).
- **Allergènes** : texte + icône, espèce précise (« cajou »), traces à part, jamais « sans allergènes », toujours « vérifie l'étiquette ».
- **RGPD** : un profil halal, casher ou jaïn révèle une conviction religieuse ; allergies et cœliaquie sont des données de santé. Consentement explicite distinct (art. 9), y compris pour les déductions indirectes (CJUE C-184/20). Proposer des règles neutres (« sans porc », « sans alcool ») sans jamais demander le motif, et exclure ces champs des outils d'analyse.

## 6. Architecture cible (on garde la stack)
Next.js 15 + Supabase Paris + Vercel + Gemini Flash (repli Claude) restent : ils sont en prod, testés, et conviennent.

| Brique | Évolution |
|---|---|
| Moteur de régimes (`lib/diets/`) | Attributs par ingrédient (origine animale, espèce, poisson à écailles, crustacés, lait, œuf, miel, gélatine, alcool, racines, alliacées, gluten, 14 allergènes…) + règles par régime + niveaux de rigueur ; le casher actuel (viande/lait, délai, Pessah) devient un module ; tests unitaires par régime |
| Profils alimentaires | Pour moi, les membres du foyer (y compris un enfant sans compte) et les invités récurrents : régimes, rigueur, allergies, dégoûts |
| Recettes | `origin` → cuisines du monde, `category` élargie, `version_kind` → variantes (originale, vegan, halal, casher, sans gluten, légère…), photo de couverture, pastilles de compatibilité calculées |
| Import | Table de jobs asynchrones avec statut, quotas et coût IA. Chaîne : sources officielles d'abord (légende TikTok par oEmbed, description YouTube par l'API, site d'origine d'une épingle Pinterest et son JSON-LD), puis structuration Gemini validée par Zod ; Instagram par capture d'écran ou légende copiée ; vidéo YouTube par URL passée à Gemini ; fiche reformulée, jamais la légende brute ; dédoublonnage |
| Foyer & Tablée | `households`, `household_members`, planning et listes de courses rattachés au foyer (Supabase Realtime) ; `tablees`, invités, plats assignés |
| Agents IA | `recipe_importer` v2, `diet_classifier` (ex-`kashrut_checker`), `recipe_adapter` (ex-« version Protéine »), `menu_planner` (ex-`meal_planner`, contraintes multi-régimes), `moderator` conservé ; `food_logger`, `nudger` et TDEE supprimés |
| Calendrier | `lib/calendars/` : le moteur juif actuel + islamique, chrétien, hindou, chinois, en opt-in ; `@hebcal/core` (GPL-2.0) reste côté serveur |
| Mobile | PWA aujourd'hui (le partage Android fonctionne déjà) ; **coque native Capacitor avec extension de partage iOS**, indispensable sur iPhone (§3.7) ; les Server Actions devront être doublées de routes `/api` pour l'app |

## 7. Direction visuelle (pour la session Claude Design)

### 7.1 Ce que disent les tendances 2025-2026
- **On sort du beige**. Pinterest 2026 mise sur des couleurs pleines (bleu froid, jade, prune noire, wasabi, **persimmon**). Le **butter yellow** s'installe comme neutre doux. La couleur Pantone 2026 est un blanc, *Cloud Dancer*, accueilli tièdement.
- **Serifs doux seventies** (Fraunces, héritière libre de Cooper/Souvenir), italiques expressives, rondes « cosy ». *Instrument Serif* est partout et risque de faire banal.
- **Imperfection assumée** : collage, stickers, trait à la main ; photo culinaire « vraie » plutôt que parfaite (mains dans le cadre, aplats de couleur).
- **Le coquette vieillit mal** (infantilisant, peu inclusif) ; ses héritiers 2026 sont plus adultes : dentelle et napperons, timbres (*Pen Pals*), textures gélifiées.
- **Pièges** : « shrink it and pink it » (réduire le féminin au rose), pastels illisibles (un rose #F4B6C2 sur blanc = 1,7:1), exclure les hommes et les personnes non binaires (viser la chaleur plutôt que le genre), duos de couleurs qui évoquent un drapeau ou une religion.
- Marques à regarder : **Our Place** (pastels sourds, collection pour le Nouvel An lunaire et Diwali), **Graza** (vert olive et jaune, typo épaisse pensée pour la vidéo), **Omsom** (couleurs saturées, racines vietnamiennes), **Finch** (ton doux, sans jugement, inclusif).

### 7.2 Trois pistes (contrastes WCAG vérifiés)
| Rôle | A · Beurre & Cerise | B · Marché Persimmon | C · Dentelle & Pistache |
|---|---|---|---|
| Humeur | La cuisine de grand-mère réinventée : gourmande, rétro seventies, féminine sans rose bonbon | Un marché du monde le samedi matin : plurielle, joyeuse, étiquettes collées ; la plus neutre en genre | Romantique et tendre, un coquette adulte : papeterie, timbres, napperons ; fêtes et transmission |
| Fond | `#FFF7E6` crème | `#F0EEE9` Cloud Dancer | `#FFF5F3` blush |
| Surface | `#FBE7A1` beurre | `#BCD7EC` bleu froid | `#F6D5D8` rose poudré (cartes bordées) |
| Texte | `#2B1D14` espresso — 15,3:1 | `#2A1426` prune noire — 14,8:1 | `#3A1F2B` aubergine — 13,9:1 |
| Texte secondaire | `#6A4E3E` — 7,1:1 | `#5E4A5B` — 7,0:1 | `#6E4B5A` — 7,0:1 |
| Bouton principal | `#B0172F` cerise, texte blanc 7,0:1 | `#E8561F` persimmon, texte prune 4,7:1 (jamais de blanc dessus) | `#8E2F52` framboise, texte blanc 7,8:1 |
| Accents | `#A47764` Mocha Mousse (icônes), `#9DBE8A` pistache (décor) | `#6FAE8C` jade (tags écrits en prune), `#D4E157` wasabi (stickers) | `#B9D3A0` pistache (tags), `#F7E3A3` beurre (surlignage) |
| Polices (Google Fonts) | Fraunces + DM Sans (+ Caveat pour les annotations) | Bricolage Grotesque + Figtree | Instrument Serif + Nunito |

**Recommandation** : **A comme base** (féminine sans cliché, couleurs « comestibles »), des touches de **B** pour les espaces communauté, **C** en thème optionnel pour les fêtes. B est la plus proche de la marque actuelle (Bricolage, orange). À tester auprès de quelques utilisatrices de chaque communauté visée.

### 7.3 Le brief à coller dans Claude Design

```text
Conçois l'identité visuelle et le design system mobile-first d'une app de cuisine collaborative
(nom provisoire à choisir). Public : femmes de 22 à 45 ans, francophones, de toutes cultures
(casher, halal, vegan, végétarien indien, sans gluten…), qui enregistrent leurs recettes sur
Instagram et TikTok et cuisinent pour leur foyer et leurs invités.

Promesse : « le carnet de recettes qui se remplit tout seul depuis Insta et TikTok, s'adapte à
chaque table et se cuisine à plusieurs ».

Ton visuel : girly assumé mais chic et adulte — chaleureux, gourmand, doux ; pas de rose bonbon
partout, pas de clichés « princesse ». Les photos de plats sont les héroïnes. Une touche ludique
(stickers, étiquettes, motif vichy ou autre élément signature) utilisée avec parcimonie.
Point de départ : la piste « Beurre & Cerise » (crème #FFF7E6, beurre #FBE7A1, espresso #2B1D14,
cerise #B0172F, Mocha Mousse #A47764, pistache #9DBE8A ; Fraunces + DM Sans + Caveat).

Contraintes :
- Accessibilité WCAG AA (texte ≥ 4,5:1), mode clair ET sombre, mouvements réduits respectés.
- Pastilles de régime lisibles sans connotation identitaire (casher, halal, vegan, végétarien,
  pescétarien, végétarien indien, sans porc, sans alcool, sans gluten, sans lactose, allergènes) :
  forme + icône + texte, jamais la couleur seule.
- Jamais de rouge « punitif », jamais d'imagerie régime ou minceur.
- Livrables compatibles Tailwind v4 + shadcn/ui : tokens CSS nommés (--background, --foreground,
  --card, --primary, --primary-foreground, --secondary, --accent, --muted, --border, --ring,
  --radius + couleurs de marque et de régimes), échelle typographique, rayons, ombres, espacements.
- Polices Google Fonts uniquement.

Écrans à maquetter (mobile d'abord, puis desktop pour l'accueil et la fiche recette) :
1. Accueil : « continuer à cuisiner », dernières recettes importées, bouton Importer bien visible.
2. Import : partager ou coller un lien Insta/TikTok → « on lit la recette… » → fiche à relire.
3. Fiche recette : photo, crédit de la créatrice, pastilles de compatibilité (« OK pour toi et
   Léa ; adaptable pour Sami : halal »), ingrédients avec portions, étapes, bouton Mode cuisine.
4. Mode cuisine : une étape à la fois, minuteurs, gros caractères.
5. Carnets partagés : grille de carnets (couverture, membres).
6. Tablée : un dîner, les invités et leurs contraintes, le menu proposé, qui apporte quoi.
7. Liste de courses du foyer : par rayon, cochée à plusieurs en temps réel.
8. Profil alimentaire : mes régimes, mes allergies, les membres du foyer.
Inclure : logo et icône d'app, états vides, chargement, erreurs, notifications, onboarding en 3 écrans.
```

## 8. Feuille de route proposée

Une session Claude Code ≈ un livrable testé et déployable, comme jusqu'ici. L'ordre suit une règle : **d'abord ce qui rend l'import et les régimes irréprochables, ensuite ce qui fait venir les autres** (foyer, Tablée), puis l'habillage et la communauté. À ajuster selon les réponses aux questions.

| # | Session | Livrable clé |
|---|---|---|
| 17 | ✅ Audit & vision | Ce document, suppression du sport |
| 18 | Brief v2 & grand ménage | Nouveau brief validé ; retrait du suivi santé (journal, poids, progrès, TDEE, nudges, garde-fous minceur) ; navigation recentrée sur la cuisine ; onboarding express (prénom, régimes, allergies) ; nom provisoire |
| 19 | Moteur multi-régimes | Attributs d'ingrédients, règles par régime avec niveaux de rigueur, pastilles de compatibilité par recette et par personne, profils alimentaires (moi, foyer, invités) ; le casher devient un module ; tests par régime |
| 20 | Import v2 | File de jobs avec statut et quotas, description et vidéo YouTube (Gemini), Pinterest, captures multiples (carrousels Instagram), reformulation, dédoublonnage, traduction, **photos de recettes** (upload + couverture) |
| 21 | App iPhone & Android | Coque Capacitor avec **extension de partage**, routes `/api` pour l'app, mode cuisine hors ligne, notifications ; TestFlight puis stores |
| 22 | Foyer | Planning et liste de courses partagés en temps réel, invitations, « qui cuisine ce soir » |
| 23 | Tablée | Dîner avec invités : contraintes de chacun → menu compatible → qui apporte quoi → liste partagée |
| 24 | Adapter | Variantes IA par régime validées par le moteur de règles, portions et conversions, « même plat, toutes les tables » |
| 25 | Nouvelle identité | Design system issu de la session Claude Design appliqué partout, logo, icônes, illustrations |
| 26 | Communauté v2 | Profils de créatrices revendicables (stats, retrait), groupes par cuisine ou tradition, calendrier des fêtes multi-traditions |
| 27 | Production | RGPD art. 9 (régimes religieux + allergies), export/suppression complets, CGU, CSP, rate limiting, tests RLS, observabilité, avis juridique sur l'import, abonnement |

La session Claude Design peut se tenir **dès maintenant, en parallèle** : plus tôt la charte existe, moins il y a d'écrans à refaire (la session 25 peut alors remonter juste après la 18).

## 9. Questions de cadrage

Les quatre premières bloquent l'écriture du brief v2. Pour les autres, une réponse par défaut est proposée : sans avis contraire, c'est elle qui sera retenue.

### Bloquantes
1. **Suivi santé** (journal alimentaire, poids, calories, TDEE, progrès, coach minceur) : on le **supprime** (recommandé), on le **met en sommeil** (masqué, réactivable), ou on le **garde** ?
2. **« Collaboratif »**, quelles priorités ? Foyer (couple, famille : planning et courses partagés) · Tablée (dîners avec invités aux régimes différents) · Carnets partagés (copines, famille, recettes de mamie) · Communauté publique (fil, créatrices) · Cuisine en direct à plusieurs. *Recommandé : foyer + carnets + Tablée en V1, communauté en V2.*
3. **Kémia** : garder la tata judéo-tunisienne telle quelle · la garder mais en « copine en cuisine » multiculturelle, sans minceur · un assistant discret sans personnage · plusieurs personnages au choix ? *Recommandé : garder le nom — la kémia, ce sont des petits plats partagés, tradition commune aux juifs, musulmans et chrétiens du Maghreb — mais en faire une copine en cuisine multiculturelle, sans minceur.*
4. **Plateforme** : PWA d'abord puis stores · app native (App Store / Play Store) prioritaire pour partager depuis Instagram sur iPhone ? *Recommandé : oui, dès la session 21, avec une coque Capacitor qui réutilise l'app web (§3.7).*

### Avec réponse par défaut
5. **Nom** : BBP (Boukha = alcool, Protéines = fitness) ne colle plus. *Défaut : nouveau nom. Pistes : Mijotons, Pincée, Tablée, Kémia, Cocotte — disponibilité à vérifier (INPI, EUIPO, stores, domaine).*
6. **Données existantes** : *défaut : on garde le projet Supabase/Vercel, les comptes, les 35 recettes et les carnets ; les données santé sont purgées avec le module.*
7. **Régimes de la V1** : *défaut : végétarien, vegan, pescétarien, sans porc, sans alcool, halal, casher, végétarien indien, sans gluten, sans lactose, 14 allergènes ; jaïn et bouddhiste en V2.*
8. **Langue** : *défaut : français seul, traduction automatique des recettes étrangères à l'import ; anglais plus tard.*
9. **Modèle économique** : *défaut : gratuit au lancement ; ensuite imports IA limités en gratuit (≈ 5 par semaine) et abonnement pour l'illimité et les fonctions IA (adaptations, menus) ; la collaboration reste toujours gratuite (§3.5).*
10. **Cible** : *défaut : femmes 22-45 ans francophones, toutes cultures ; l'app reste utilisable par tout le monde.*
11. **Calendrier des fêtes multi-traditions** (Ramadan/Aïd, Chabbat/Pessah, Noël/Carême, Diwali, Nouvel an lunaire) : *défaut : oui, en V2, opt-in.*
12. **Organisation** : la femme de Jeremy devient product owner. *Défaut : la product owner valide les briefs et les maquettes ; les comptes (GitHub, Vercel, Supabase, clé Gemini) restent au nom de Jeremy tant qu'aucun transfert n'est décidé.*
