# Brief Claude Design — Copine en cuisine

À coller tel quel au début de la session Claude Design (mis à jour le 29/09/2026, après la session 18).

```text
Conçois l'identité visuelle complète et le design system mobile-first de « Copine en cuisine »,
une app de cuisine collaborative et un réseau social culinaire.

LE PRODUIT
- Promesse : « Le carnet de recettes qui se remplit tout seul depuis Insta et TikTok, s'adapte à
  chaque table et se cuisine à plusieurs. » Signature provisoire : « Tes recettes, à plusieurs mains. »
- Public : femmes de 22 à 45 ans, francophones, de toutes cultures et de tous régimes (casher,
  halal, vegan, végétarien, végétarien indien, sans gluten, allergies…). L'app reste accueillante
  pour tout le monde.
- Fonctions : import de recettes depuis Instagram/TikTok/sites, fiches recettes et mode cuisine,
  carnets partagés, planning de la semaine et liste de courses du foyer, « Tablée » (un dîner avec
  des invités aux régimes différents), réseau social (actus, « j'ai cuisiné », recettes, réactions
  J'adore / Bravo / Miam, commentaires, abonnements, groupes), et « Copine », l'assistante IA.

DIRECTION VISUELLE (impératif)
- Féminin, chic et adulte : CLASSE, ÉPURÉ, ÉLÉGANT. Beaucoup d'air, hiérarchie typographique fine,
  détails raffinés. Les photos de plats sont les héroïnes.
- Surtout pas : gros caractères ludiques ou arrondis façon cartoon, rose bonbon partout, clichés
  « princesse », look enfantin, néo-brutalisme, ombres dures.
- Typographie : une serif élégante pour les titres (en place aujourd'hui : Cormorant Garamond,
  graisses 500-600, jamais d'extra-gras ; tu peux proposer mieux dans le même esprit) + une
  sans-serif sobre et très lisible pour le texte (en place : Inter). Google Fonts uniquement.
- Couleurs : à créer. Palette douce et gourmande, un seul accent assumé, neutres chauds légèrement
  teintés. Piste de départ possible (à affiner librement) : crème #FFF7E6, beurre #FBE7A1,
  espresso #2B1D14, cerise #B0172F, pistache #9DBE8A. Pas de rouge « punitif ».
- Une seule touche signature, discrète et élégante (par exemple un motif vichy très fin, un filet,
  un monogramme), jamais de surcharge décorative.
- Neutralité culturelle totale : aucun symbole religieux ou communautaire, aucun drapeau, aucune
  association de couleurs qui évoque une religion. Toutes les tables sont accueillies de la même façon.

CONTRAINTES
- Accessibilité WCAG AA (texte ≥ 4,5:1), mode clair ET mode sombre, mouvements réduits respectés.
- Pastilles de régime et de compatibilité (compatible / adaptable / incompatible / à vérifier ;
  casher, halal, vegan, végétarien, pescétarien, végétarien indien, sans porc, sans alcool, sans
  gluten, sans lactose, allergènes) : forme + icône + texte, jamais la couleur seule, sans
  connotation identitaire.
- Jamais d'imagerie régime, minceur, calories ou balance.
- Livrables compatibles Tailwind v4 + shadcn/ui : tokens CSS nommés --background, --foreground,
  --card, --card-foreground, --primary, --primary-foreground, --secondary, --accent,
  --accent-foreground, --muted, --muted-foreground, --border, --input, --ring, --radius, plus les
  couleurs de marque, d'état (ok, attention) et de régimes ; échelle typographique, rayons, ombres
  douces, espacements ; icônes Lucide (trait fin).

IDENTITÉ À PRODUIRE
- Logo « Copine en cuisine » (version complète + monogramme « C ») et icône d'app (iOS/Android,
  version maskable), favicon, image de partage (Open Graph 1200×630).
- Avatar de « Copine », l'assistante : sobre et élégant (monogramme, pictogramme), PAS un
  personnage ni une caricature. Ton de Copine : chaleureux, neutre, élégant.

ÉCRANS À MAQUETTER (mobile d'abord ; desktop pour la fiche recette et le fil)
1. Mes recettes (accueil) : recettes récentes et importées, carnets, recherche, bouton Importer.
2. Import : partager ou coller un lien Insta/TikTok → « lecture de la recette… » → fiche à relire,
   avec le crédit de la créatrice (nom, lien, embed).
3. Fiche recette : photo, crédit, pastilles de compatibilité (« OK pour toi et Léa ; adaptable pour
   Sami »), portions, ingrédients, étapes, bouton Mode cuisine, variante végétarienne.
4. Mode cuisine : une étape à la fois, minuteurs, gros confort de lecture.
5. Communauté : fil (actu, « j'ai cuisiné », recette partagée), réactions J'adore / Bravo / Miam,
   commentaires, composer une publication avec photo.
6. Profil public d'une membre ou d'une créatrice : publications, recettes, abonnés.
7. Carnets partagés : grille de carnets (couverture, membres).
8. Planning de la semaine + liste de courses du foyer cochée à plusieurs.
9. Tablée : un dîner, les invités et leurs contraintes, le menu proposé, qui apporte quoi.
10. Copine : conversation avec l'assistante.
11. Moi : mes règles de cuisine (opt-in), allergies, foyer, notifications, confidentialité.
Inclure : barre de navigation (Recettes · Planning · Communauté · Copine · Moi), onboarding en
2 écrans (bienvenue, prénom), états vides, chargement, erreurs, toasts, notifications.
```
