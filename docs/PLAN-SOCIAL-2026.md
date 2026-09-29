# PLAN-SOCIAL-2026.md — Devenir la plateforme sociale de la cuisine

Proposition du 29/09/2026, **validée par Jeremy le 29/09/2026** (vision, retrait du détail casher et du calendrier juif, ordre des sessions). S'appuie sur la veille `docs/BENCHMARK-SOCIAL-2026.md` (7 recherches parallèles, sources datées) et complète `docs/PIVOT-2026.md` §3.

## 1. Le constat en cinq points
1. **Il n'existe pas de vraie plateforme sociale de la cuisine du quotidien.** La cuisine vit sur TikTok, Instagram, Pinterest et YouTube, mais aucune de ces plateformes ne permet de cuisiner à partir de ses contenus (pas de liste d'ingrédients, pas de portions, pas de courses ; le seul test de fiche recette de TikTok date de 2021).
2. **Les communautés historiques reculent ou sont rachetées** : Cookpad passe de 547 à 79 salariés (2020 → mi-2026), Food52 fait faillite (déc. 2025), Yummly ferme (déc. 2024), Chefkoch et Kitchen Stories sont rachetés par un groupe de presse (2025), l'appli Tasty n'est plus mise à jour.
3. **Les plus proches sont américains et partiels** : Beli (restaurants, 120 M de notes déclarées, 80 % des arrivées par parrainage, quasi pas de revenus), Pepper (3 M de cuisiniers déclarés, import + carnet social), Linecook (2,3 M$ levés en mars 2026 pour un « Strava de la cuisine »). Aucun ne réunit social, outils pour cuisiner, collaboration et tous les régimes. Les startups françaises et européennes n'ont pas pu être vérifiées (quota de recherche épuisé).
4. **Ce qui retient les gens est attaché à la recette** : la photo « j'ai cuisiné » (Cookpad), les notes votées « utiles » (NYT Cooking), les collections reliées aux courses. Les relances « réseau social » purement suiveuses, les forums ouverts et les concours sans lot échouent.
5. **Les créatrices perdent 30 à 80 % de leur trafic** (résumés IA de Google, Pinterest) et **aucune appli ne leur permet de revendiquer les recettes importées depuis leurs posts** : c'est notre levier pour les faire venir.

**Conséquence** : le réseau social de la cuisine ne naîtra pas d'un fil, mais d'un carnet. Ordre de construction : **l'utilité d'abord, les petits cercles ensuite, le public en dernier** ; le fil découle des « j'ai cuisiné » et des Tablées. **Indicateur clé : la part des recettes importées qui deviennent un « j'ai cuisiné »** (première mesure française de l'écart entre enregistrer et cuisiner, preuve de valeur pour les créatrices, base d'un futur partage de revenus). **Modèle économique : monétiser la table, pas le fil** (pas de publicité dans le fil).

## 2. La vision, peaufinée
> **Copine en cuisine, le réseau social de la cuisine.**
> On y suit ses copines et ses créatrices préférées, on garde toutes les recettes vues sur Insta et TikTok, et on cuisine ensemble, quelle que soit la table.

La cuisine vit sur les réseaux, mais on n'y cuisine pas. Les recettes se perdent dans les captures, les créatrices perdent leur trafic, les sites noient la recette sous la pub, et les applis de recettes restent des carnets solitaires.

Copine en cuisine réunit enfin les deux : un vrai réseau social pour s'inspirer, montrer ce qu'on a cuisiné et suivre celles qui donnent envie ; et des outils concrets pour passer à table, avec un carnet qui se remplit tout seul, le planning et les courses du foyer, et les dîners entre amis.

Toutes les tables sont les bienvenues. Végétarienne, vegan, sans gluten, halal, casher ou sans contrainte : chacune règle ses préférences en deux gestes, sans étiquette ni questionnaire. L'app n'entre pas dans le détail des traditions : ce sont les membres et les créatrices qui créent leurs catégories, leurs collections et leurs rendez-vous.

Les créatrices sont chez elles : crédit visible, lien vers l'original, profil qu'elles peuvent revendiquer, statistiques, et demain des revenus.

Signature inchangée : *Tes recettes, à plusieurs mains.*

**Principes**
- **Utile seule, meilleure à plusieurs** : chaque fonction sert d'abord à la personne qui l'utilise ; le social vient par-dessus.
- **La recette au centre** : chaque échange (photo, astuce, version, réaction) est rattaché à une recette.
- **Crédit et trafic aux créatrices**, toujours.
- **Toutes les tables, sans étiquette**, et **zéro culture du régime**.
- **Bienveillance modérée** : signalement simple, règles claires, modération active dès le premier jour.

## 3. Les régimes, simplement (décision ADR-031)
- **Des préférences simples, en opt-in** : végétarien, vegan, pescétarien, sans porc, sans alcool, halal, casher, sans gluten, sans lactose, allergies (14 allergènes UE) et « je n'aime pas ».
- **Un verdict clair par recette**, pour moi, mon foyer ou mes invités : compatible · adaptable · à vérifier. Formulations prudentes : « ingrédients compatibles halal/casher, préparation non garantie », « sans ingrédient contenant du gluten ».
- **Plus de sous-classes religieuses dans l'app** : on retire viande/lait/parvé, délais d'attente, Pessah et le calendrier juif, et on ne construit pas de calendriers religieux. Les ingrédients restent décrits de façon neutre (viande, poisson, lait, œuf, alcool, gluten…), ce qui suffit à tous les régimes.
- **La finesse vient des membres** : étiquettes libres (#ramadan, #shabbat, #diwali, #batchcooking, #cuisinecréole…) et catégories créées par les membres et les créatrices, avec fusion des synonymes sous une étiquette de référence (modèle AO3). L'app héberge, elle n'impose rien.
- **La compatibilité s'affiche sur les recettes, jamais sur les personnes.** Une étiquette posée par une membre (« #halal ») ne remplace jamais le verdict calculé ; un désaccord est signalé. Les invitées d'une Tablée saisissent elles-mêmes leurs règles via le lien d'invitation.
- **Données sensibles** (RGPD art. 9) : consentement explicite, jamais publiques, jamais dans l'analytics ni sur une carte partageable (pas de « ton année casher »).

## 4. Fonctions à ajouter, par priorité
### P0 — le cœur d'une plateforme sociale de cuisine
| Fonction | Inspiration | Pourquoi |
|---|---|---|
| « J'ai cuisiné » attaché à la recette : photo de sa version, compteur « cuisinée 124 fois », galerie, notification à l'autrice | Cookpad Cooksnaps, Allrecipes « I Made It » | La preuve sociale la plus éprouvée en cuisine |
| Astuces sous chaque recette, triées par votes « utile » | NYT Cooking (6 881 votes sur une seule astuce) | Transforme les commentaires en valeur |
| Journal de cuisine + liste « À cuisiner » qui se remplit depuis l'import | Letterboxd (30,7 M membres, +43 % sur un an), Beli « Want to Try », Goodreads | Répond au « cimetière de captures » |
| « Ma version » avec crédit en chaîne et onglet Versions sur l'original | TikTok Duet/Stitch, remix Figma | Le remix fait circuler la recette sans voler la créatrice |
| Profils créatrices revendicables : recettes importées rattachées, statistiques (enregistrées, cuisinées, clics vers l'original), badge | Aucun concurrent | Notre levier d'acquisition des créatrices |
| Étiquettes libres et catégories créées par les membres et créatrices | AO3, Pinterest, listes Letterboxd | La finesse des régimes et des traditions, sans communautarisme |
| Tablée partageable sans appli : invitation par lien, chaque invité indique ses régimes sans compte, menu compatible par convive, qui apporte quoi | Partiful (réponse sans appli, listes de plats), Spotify Blend | Aucun produit n'affiche la compatibilité par convive ; boucle d'acquisition naturelle |

### P1 — engagement et croissance
- **Récap annuel « Ton année en cuisine »**, sans calories : recettes cuisinées, créatrices préférées, cuisines explorées, carte à partager (Spotify Wrapped : 630 M de partages en 2025).
- **Clubs et défis mensuels** avec une vraie récompense ou un vrai livrable (chez Cookpad : 2 à 24 participations sans lot, 277 à 533 avec).
- **Fil « Mes copines ont cuisiné »** et affinité de goûts entre amies (Beli).
- **Import depuis les sites français** (Marmiton, 750g) au même niveau qu'Instagram et TikTok : 62 % des Français passent d'abord par les sites de recettes (Ipsos BVA, 03/2026).
- **Lien « Enregistrer dans Copine en cuisine »** que les créatrices placent en bio ou en légende à la place du « commente RECETTE » (ManyChat devenu payant), avec inscription facultative à leur newsletter.
- **Pages publiques et cartes de partage** optimisées pour le référencement, **uniquement pour les recettes originales des membres et les carnets publics** : indexer les recettes importées capterait le trafic des créatrices.

### P2 — revenus
- Abonnements et collections payantes des créatrices, avec partage de revenus (Substack : 40 % des nouveaux abonnés via ses recommandations).
- Liste de courses achetable en drive (Jow, Mealz, Pinterest × Instacart).
- Cuisine en direct et cours (Eatwith, Timeleft).

### Garde-fous tirés de la veille
- Pas de séries punitives ni de classements au volume (critiques des séries Beli, chute de BeReal après ses rappels imposés).
- Notifications rares et utiles (Duolingo : meilleure rétention sans envoyer plus).
- **Supprimer la géolocalisation des photos** avant publication (incident Partiful, oct. 2025).
- Modération active dès le lancement (commentaires islamophobes sous des recettes de ramadan chez Marmiton en 2015, bots au Food52 Hotline en 2025).
- Pas de parrainage obligatoire ni de liste d'attente pour entrer (contraire à une marque inclusive).
- La Tablée reste strictement non marchande (vendre des repas faits maison a coûté la vie à Josephine en 2018).

## 5. Conformité à prévoir avant l'ouverture publique
- **DSA** : en petite entreprise, exemption de la plupart des obligations (art. 19), mais **signalement (art. 16), motivation de chaque décision de modération (art. 17), CGU (art. 14) et points de contact (art. 11-12)** restent obligatoires.
- **AI Act art. 50** (en vigueur depuis le 02/08/2026) : mention permanente « Copine est une IA » dans l'en-tête du chat, et marquage lisible par machine des contenus générés.
- **Droit d'auteur** : fiche reformulée, crédit « d'après @X », imports privés par défaut, embed officiel, pas d'aspiration massive des sites.
- **Dépendance aux plateformes** : les CGU développeurs de TikTok interdisent de constituer des bases de contenus ; multiplier les sources d'import (sites, captures, YouTube, Pinterest).
- **Responsabilité du fait des produits** : le logiciel devient un « produit » le 09/12/2026 (directive 2024/2853) ; prudence sur les allergènes.
- **Âge** : l'interdiction française avant 15 ans a été censurée en partie (14/08/2026) ; notre seuil de 16 ans reste valable.

## 6. Feuille de route proposée
| # | Session | Livrable |
|---|---|---|
| 19 | Brief v3 & régimes simples | `BRIEF.md` et `CLAUDE.md` réécrits (vision sociale) ; retrait du module casher détaillé et du calendrier juif (51 fichiers, fin de la contrainte GPL de hebcal) ; préférences simples + verdict par recette ; migration vers des attributs neutres ; catalogue de départ diversifié |
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
