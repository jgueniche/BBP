# Generates src/db/seed/recipes/recipes.sql from the annexe A recipe set.
# Ingredients are pinned to Ciqual foods by external_id (resolved 30/08/2026).
# Idempotent: recipes upsert on slug, children only insert with a fresh recipe.
import json

OUT = "src/db/seed/recipes/recipes.sql"

# key -> Ciqual alim_code
F = {
    "couscous_cuit": "9683", "couscous_cru": "9681", "legumes_couscous": "20497",
    "poulet_roti": "36033", "poulet_cru": "36016", "boeuf_braise": "6101",
    "boeuf_hache": "6254", "agneau_epaule": "21506", "dinde_escalope": "36306",
    "cabillaud": "26023", "cabillaud_cru": "26043", "dorade": "26109",
    "merlan": "26095", "thon": "26039", "oeuf": "22000", "oeuf_dur": "22010",
    "brick": "51550", "pdt": "4026", "tomate": "20047", "tomate_concentre": "20068",
    "oignon": "20034", "oignon_cuit": "20035", "ail": "11000",
    "huile_olive": "17270", "pois_chiche": "20532", "haricot_blanc": "20511",
    "epinard": "20027", "blette": "20005", "carotte_cuite": "20008",
    "carotte_crue": "20009", "navet": "20033", "courgette": "20021",
    "potiron": "20096", "celeri": "20023", "poivron": "20086", "harissa": "11112",
    "citron": "13009", "olive_verte": "13033", "capres": "11040",
    "persil": "11014", "coriandre": "11094", "menthe": "11027", "cumin": "11042",
    "riz": "9104", "baguette": "7001", "pain_complet": "7111",
    "semoule_crue": "9610", "datte": "13011", "miel": "31008", "sucre": "31016",
    "farine": "9435", "beurre": "16400", "lait": "19041", "feta": "12066",
    "emmental": "12118", "creme": "19410", "yaourt_grec": "19860",
    "pates": "9811", "pates_oeufs": "9822", "feve": "20500", "aubergine": "20002",
    "pita": "7180", "tahin": "15203", "concombre": "20210",
    "huile_tournesol": "17440", "bouillon_volaille": "11174",
    "jus_orange": "2070", "lompe": "26004", "chou_vert": "20015",
    "boulgour": "9691", "pois_casse": "20515",
}

# (slug, title, description, origin, category, difficulty, prep, cook, servings,
#  kashrut, is_fish, tags, version_kind, parent_slug,
#  [(label, qty, unit, grams, food_key|None)], [steps])
R = []

R.append(("couscous-au-poisson", "Couscous au poisson", "Le grand classique tunisien du vendredi : semoule, légumes et poisson en sauce rouge.", "tunisie", "plat", "moyen", 30, 60, 6, "parve", True, ["chabbat"], "boutargue", None,
  [("graine de couscous cuite", 900, "g", 900, "couscous_cuit"), ("mérou ou cabillaud", 800, "g", 800, "cabillaud"), ("légumes pour couscous", 800, "g", 800, "legumes_couscous"), ("concentré de tomate", 70, "g", 70, "tomate_concentre"), ("huile d'olive", 60, "ml", 55, "huile_olive"), ("harissa", 30, "g", 30, "harissa"), ("ail", 15, "g", 15, "ail"), ("cumin", 5, "g", 5, "cumin")],
  ["Fais revenir l'ail, le concentré de tomate et la harissa dans l'huile d'olive.", "Ajoute les légumes, couvre d'eau et laisse mijoter 30 minutes.", "Pose le poisson sur les légumes et cuis 15 minutes de plus.", "Sers la semoule arrosée de bouillon, légumes et poisson par-dessus."]))
R.append(("couscous-boulettes", "Couscous boulettes", "Couscous du chabbat aux boulettes de bœuf, sauce rouge généreuse.", "tunisie", "plat", "moyen", 40, 75, 6, "bassari", False, ["chabbat"], "boutargue", None,
  [("graine de couscous cuite", 900, "g", 900, "couscous_cuit"), ("bœuf haché 15%", 700, "g", 700, "boeuf_hache"), ("légumes pour couscous", 700, "g", 700, "legumes_couscous"), ("oignon", 150, "g", 150, "oignon"), ("concentré de tomate", 70, "g", 70, "tomate_concentre"), ("huile d'olive", 50, "ml", 46, "huile_olive"), ("œuf", 1, "pièce", 50, "oeuf"), ("harissa", 20, "g", 20, "harissa")],
  ["Mélange le bœuf haché avec l'oignon râpé, l'œuf et les épices, forme des boulettes.", "Fais-les dorer dans l'huile, réserve.", "Prépare la sauce tomate-harissa, ajoute les légumes et de l'eau, mijote 40 minutes.", "Remets les boulettes 20 minutes et sers sur la semoule."]))
R.append(("couscous-boulettes-proteine", "Couscous boulettes — version Protéine", "La version allégée : boulettes de dinde, semoule complète mesurée, moitié moins d'huile.", "tunisie", "plat", "moyen", 35, 60, 6, "bassari", False, ["chabbat", "meal-prep"], "proteine", "couscous-boulettes",
  [("graine de couscous cuite", 720, "g", 720, "couscous_cuit"), ("escalope de dinde hachée", 700, "g", 700, "dinde_escalope"), ("légumes pour couscous", 900, "g", 900, "legumes_couscous"), ("oignon", 150, "g", 150, "oignon"), ("concentré de tomate", 70, "g", 70, "tomate_concentre"), ("huile d'olive", 25, "ml", 23, "huile_olive"), ("œuf", 1, "pièce", 50, "oeuf"), ("harissa", 20, "g", 20, "harissa")],
  ["Forme des boulettes de dinde avec l'oignon, l'œuf et les épices.", "Cuis-les directement dans la sauce tomate (pas de friture).", "Ajoute beaucoup de légumes et mijote 40 minutes.", "Sers avec la semoule pesée : 120 g cuits par personne."]))
R.append(("brik-a-l-oeuf", "Brik à l'œuf", "La brik croustillante à l'œuf coulant, thon et câpres.", "tunisie", "entree", "facile", 15, 10, 4, "parve", True, ["express"], "boutargue", None,
  [("feuilles de brick", 4, "pièce", 80, "brick"), ("œufs", 4, "pièce", 200, "oeuf"), ("thon au naturel", 120, "g", 120, "thon"), ("câpres", 20, "g", 20, "capres"), ("persil", 10, "g", 10, "persil"), ("huile de friture", 40, "ml", 37, "huile_tournesol")],
  ["Dépose thon, câpres, persil et un œuf cru au centre de chaque feuille.", "Plie en triangle en soudant les bords.", "Fais frire 2 minutes par face jusqu'à dorure.", "Sers immédiatement avec un quartier de citron, l'œuf doit couler."]))
R.append(("brik-a-l-oeuf-proteine", "Brik à l'œuf — version Protéine", "La brik au four : croustillante, deux fois moins grasse.", "tunisie", "entree", "facile", 15, 12, 4, "parve", True, ["express"], "proteine", "brik-a-l-oeuf",
  [("feuilles de brick", 4, "pièce", 80, "brick"), ("œufs", 4, "pièce", 200, "oeuf"), ("thon au naturel", 160, "g", 160, "thon"), ("câpres", 20, "g", 20, "capres"), ("persil", 10, "g", 10, "persil"), ("huile d'olive", 10, "ml", 9, "huile_olive")],
  ["Badigeonne légèrement les feuilles d'huile d'olive au pinceau.", "Garnis de thon, câpres, persil et d'un œuf, plie en triangle.", "Enfourne 10-12 minutes à 200 °C sur une plaque chaude.", "Sers dès la sortie du four."]))
R.append(("pkaila", "Pkaila aux haricots", "Le plat mijoté tunisien aux épinards confits et haricots blancs.", "tunisie", "plat", "difficile", 40, 180, 8, "bassari", False, ["chabbat", "meal-prep"], "boutargue", None,
  [("épinards ou blettes", 1500, "g", 1500, "epinard"), ("haricots blancs", 500, "g", 500, "haricot_blanc"), ("bœuf à braiser", 600, "g", 600, "boeuf_braise"), ("huile d'olive", 120, "ml", 110, "huile_olive"), ("oignon", 200, "g", 200, "oignon"), ("ail", 20, "g", 20, "ail"), ("menthe séchée", 5, "g", 5, "menthe")],
  ["Fais réduire les épinards à sec puis confis-les longuement dans l'huile jusqu'à couleur très foncée.", "Ajoute oignon, ail, viande et fais revenir.", "Couvre d'eau, ajoute les haricots et mijote 2 h 30 à feu doux.", "Rectifie et sers avec du couscous ou du pain."]))
R.append(("loubia", "Loubia", "Haricots blancs en sauce rouge, le réconfort du dimanche soir.", "algerie", "plat", "facile", 15, 60, 6, "parve", False, ["meal-prep"], "boutargue", None,
  [("haricots blancs", 750, "g", 750, "haricot_blanc"), ("concentré de tomate", 60, "g", 60, "tomate_concentre"), ("oignon", 150, "g", 150, "oignon"), ("ail", 15, "g", 15, "ail"), ("huile d'olive", 50, "ml", 46, "huile_olive"), ("cumin", 8, "g", 8, "cumin"), ("harissa", 15, "g", 15, "harissa")],
  ["Fais revenir l'oignon et l'ail dans l'huile.", "Ajoute concentré, cumin, harissa et un verre d'eau.", "Verse les haricots, couvre et mijote 45 minutes.", "Sers brûlant avec un filet d'huile d'olive."]))
R.append(("mloukhia", "Mloukhia", "La sauce noire tunisienne à la corète, mijotée des heures avec la viande.", "tunisie", "plat", "difficile", 20, 240, 8, "bassari", False, ["fete", "meal-prep"], "boutargue", None,
  [("poudre de mloukhia (corète)", 250, "g", 250, None), ("bœuf à braiser", 800, "g", 800, "boeuf_braise"), ("huile d'olive", 200, "ml", 184, "huile_olive"), ("ail", 30, "g", 30, "ail"), ("concentré de tomate", 30, "g", 30, "tomate_concentre"), ("laurier", 2, "pièce", 1, None)],
  ["Délaye la poudre de mloukhia dans l'huile à froid.", "Ajoute de l'eau progressivement en fouettant, puis l'ail et le laurier.", "Mijote 3 à 4 heures à feu très doux en remuant, la sauce doit devenir noire et nappante.", "Ajoute la viande à mi-cuisson et sers avec du pain."]))
R.append(("nikitouches", "Nikitouches", "La soupe de petites pâtes au bouillon de poulet des grands-mères tunes.", "tunisie", "plat", "facile", 15, 45, 6, "bassari", False, ["chabbat"], "boutargue", None,
  [("petites pâtes aux œufs", 300, "g", 300, "pates_oeufs"), ("poulet", 600, "g", 600, "poulet_cru"), ("oignon", 100, "g", 100, "oignon"), ("céleri branche", 80, "g", 80, "celeri"), ("carotte", 150, "g", 150, "carotte_crue"), ("bouillon de volaille", 10, "g", 10, "bouillon_volaille")],
  ["Fais un bouillon avec le poulet, l'oignon, le céleri et la carotte, 40 minutes.", "Retire le poulet, effiloche-le.", "Cuis les nikitouches directement dans le bouillon.", "Remets le poulet effiloché et sers bien chaud."]))
R.append(("tfina", "Tfina / Dafina", "Le plat chaud du chabbat : mijoté toute la nuit, pommes de terre confites, œufs bruns.", "maroc", "plat", "moyen", 30, 720, 8, "bassari", False, ["chabbat"], "boutargue", None,
  [("bœuf à braiser", 800, "g", 800, "boeuf_braise"), ("pommes de terre", 1000, "g", 1000, "pdt"), ("pois chiches", 400, "g", 400, "pois_chiche"), ("œufs entiers en coquille", 8, "pièce", 400, "oeuf_dur"), ("riz ou blé", 200, "g", 200, "boulgour"), ("huile", 40, "ml", 37, "huile_tournesol"), ("miel", 20, "g", 20, "miel")],
  ["Dispose viande, pois chiches, pommes de terre, œufs en coquille et blé dans une grande marmite.", "Couvre d'eau, assaisonne, ajoute le miel.", "Enfourne à 100 °C avant chabbat et laisse toute la nuit.", "Sers samedi midi : tout doit être confit et caramel."]))
R.append(("tershi", "Tershi de potiron", "La purée de courge relevée à l'harissa et au citron — kémia essentielle.", "tunisie", "kemia", "facile", 10, 20, 4, "parve", False, ["express", "sans-gluten"], "proteine", None,
  [("potiron", 800, "g", 800, "potiron"), ("ail", 10, "g", 10, "ail"), ("harissa", 20, "g", 20, "harissa"), ("huile d'olive", 30, "ml", 28, "huile_olive"), ("citron", 40, "g", 40, "citron"), ("carvi ou cumin", 4, "g", 4, "cumin")],
  ["Cuis le potiron à l'eau ou vapeur, égoutte bien.", "Écrase à la fourchette avec l'ail pilé, la harissa et le cumin.", "Monte avec l'huile d'olive et le jus de citron.", "Sers frais avec du pain ou en kémia."]))
R.append(("slata-mechouia", "Slata méchouia", "Poivrons et tomates grillés, écrasés à l'huile d'olive — LA salade tunisienne.", "tunisie", "kemia", "facile", 15, 25, 4, "parve", False, ["sans-gluten"], "proteine", None,
  [("poivrons", 500, "g", 500, "poivron"), ("tomates", 400, "g", 400, "tomate"), ("ail", 10, "g", 10, "ail"), ("huile d'olive", 40, "ml", 37, "huile_olive"), ("citron", 30, "g", 30, "citron"), ("olives et câpres", 30, "g", 30, "olive_verte")],
  ["Grille poivrons et tomates au four ou à la flamme jusqu'à peau noircie.", "Pèle, épépine et hache grossièrement au couteau.", "Assaisonne avec ail pilé, huile d'olive, citron, sel.", "Décore d'olives, de câpres et éventuellement de thon ou d'œuf dur."]))
R.append(("salade-carottes-cumin", "Salade de carottes au cumin", "Carottes fondantes, ail, cumin, citron : la kémia la plus simple et la plus fraîche.", "maroc", "kemia", "facile", 10, 15, 4, "parve", False, ["express", "sans-gluten"], "proteine", None,
  [("carottes", 600, "g", 600, "carotte_cuite"), ("ail", 8, "g", 8, "ail"), ("cumin", 6, "g", 6, "cumin"), ("huile d'olive", 25, "ml", 23, "huile_olive"), ("citron", 30, "g", 30, "citron"), ("harissa (option)", 10, "g", 10, "harissa")],
  ["Cuis les carottes en rondelles à l'eau salée, al dente.", "Mélange ail pilé, cumin, harissa, huile et citron.", "Enrobe les carottes tièdes de cette sauce.", "Laisse mariner 1 heure au frais avant de servir."]))
R.append(("plateau-kemia", "Plateau de kémia", "L'apéro tunisien complet : olives, tershi, méchouia, œufs, pickles.", "tunisie", "kemia", "facile", 20, 0, 6, "parve", False, ["chabbat", "fete"], "boutargue", None,
  [("olives assorties", 150, "g", 150, "olive_verte"), ("œufs durs", 3, "pièce", 150, "oeuf_dur"), ("thon au naturel", 100, "g", 100, "thon"), ("harissa", 30, "g", 30, "harissa"), ("concombre en pickles", 100, "g", 100, "concombre"), ("baguette", 150, "g", 150, "baguette"), ("huile d'olive", 20, "ml", 18, "huile_olive")],
  ["Dispose chaque préparation dans une petite coupelle.", "Coupe les œufs durs en quartiers, arrose d'huile d'olive.", "Sers avec le pain et les boissons fraîches.", "La règle : petit, généreux, convivial."]))
R.append(("boutargue-tranchee", "Boutargue tranchée", "Fines tranches de boutargue, huile d'olive et citron. Le luxe simple.", "tunisie", "kemia", "facile", 5, 0, 4, "parve", True, ["fete", "sans-gluten", "express"], "boutargue", None,
  [("boutargue (œufs de mulet séchés)", 80, "g", 80, "lompe"), ("huile d'olive", 20, "ml", 18, "huile_olive"), ("citron", 30, "g", 30, "citron")],
  ["Tranche la boutargue le plus finement possible.", "Arrose d'huile d'olive et de quelques gouttes de citron.", "Sers avec des piques, sans rien d'autre."]))
R.append(("chakchouka", "Chakchouka", "Poivrons, tomates, œufs pochés dans la sauce — avec ou sans feta.", "tunisie", "plat", "facile", 15, 25, 4, "halavi", False, ["express"], "proteine", None,
  [("poivrons", 400, "g", 400, "poivron"), ("tomates", 500, "g", 500, "tomate"), ("oignon", 100, "g", 100, "oignon"), ("œufs", 4, "pièce", 200, "oeuf"), ("feta", 100, "g", 100, "feta"), ("huile d'olive", 25, "ml", 23, "huile_olive"), ("harissa", 15, "g", 15, "harissa")],
  ["Fais compoter oignon et poivrons dans l'huile 10 minutes.", "Ajoute tomates et harissa, mijote 10 minutes.", "Casse les œufs dans la sauce, couvre 5 minutes.", "Émiette la feta, poivre et sers à la poêle."]))
R.append(("fricasse", "Fricassé tunisien", "Le petit pain frit garni thon-harissa-olives-citron confit.", "tunisie", "entree", "moyen", 45, 15, 6, "parve", True, ["fete"], "boutargue", None,
  [("farine", 500, "g", 500, "farine"), ("œuf", 1, "pièce", 50, "oeuf"), ("huile de friture", 100, "ml", 92, "huile_tournesol"), ("thon au naturel", 200, "g", 200, "thon"), ("pommes de terre", 200, "g", 200, "pdt"), ("olives", 60, "g", 60, "olive_verte"), ("harissa", 30, "g", 30, "harissa"), ("câpres", 20, "g", 20, "capres")],
  ["Prépare une pâte levée avec farine, œuf, levure et un peu d'eau ; laisse pousser 1 heure.", "Façonne des petits pains et fais-les frire.", "Fends-les et garnis : thon, pomme de terre, olives, harissa, câpres.", "Sers tiède, avec du citron."]))
R.append(("complet-poisson", "Complet poisson", "L'assiette tunisienne complète : poisson grillé, riz ou frites, méchouia, œuf.", "tunisie", "plat", "moyen", 25, 30, 4, "parve", True, [], "proteine", None,
  [("dorade ou loup", 700, "g", 700, "dorade"), ("riz cuit", 500, "g", 500, "riz"), ("poivrons grillés", 250, "g", 250, "poivron"), ("tomates", 200, "g", 200, "tomate"), ("œufs durs", 2, "pièce", 100, "oeuf_dur"), ("huile d'olive", 30, "ml", 28, "huile_olive"), ("citron", 40, "g", 40, "citron")],
  ["Grille le poisson entier au four avec citron et huile.", "Prépare une méchouia rapide avec poivrons et tomates grillés.", "Dresse l'assiette : poisson, riz, méchouia, demi-œuf dur.", "Arrose de citron et d'un filet d'huile."]))
R.append(("mekbouba", "Mekbouba", "La compotée tomates-poivrons-piments confite à l'huile, servie tiède ou froide.", "tunisie", "kemia", "facile", 15, 40, 4, "parve", False, ["sans-gluten", "meal-prep"], "proteine", None,
  [("poivrons et piments doux", 500, "g", 500, "poivron"), ("tomates", 600, "g", 600, "tomate"), ("ail", 15, "g", 15, "ail"), ("huile d'olive", 40, "ml", 37, "huile_olive")],
  ["Coupe poivrons et tomates en gros dés.", "Confis à feu doux dans l'huile avec l'ail 40 minutes.", "Écrase grossièrement en fin de cuisson.", "Sers tiède avec un œuf ou froid en kémia."]))
R.append(("marka-hlou", "Marka hlou", "Le mijoté sucré-salé aux pruneaux et à la cannelle des fêtes.", "tunisie", "plat", "moyen", 20, 90, 6, "bassari", False, ["fete"], "boutargue", None,
  [("bœuf ou agneau", 700, "g", 700, "agneau_epaule"), ("pruneaux et fruits secs", 250, "g", 250, "datte"), ("oignon", 150, "g", 150, "oignon"), ("miel", 40, "g", 40, "miel"), ("huile", 30, "ml", 28, "huile_tournesol"), ("cannelle", 5, "g", 5, None)],
  ["Fais dorer la viande avec l'oignon dans l'huile.", "Couvre d'eau, ajoute cannelle et mijote 1 heure.", "Ajoute fruits secs et miel, poursuis 30 minutes.", "La sauce doit être sirupeuse ; sers pour Roch Hachana."]))
R.append(("boulettes-poisson", "Boulettes de poisson en sauce", "Boulettes de poisson blanc, sauce tomate safranée piquante.", "tunisie", "plat", "moyen", 30, 40, 4, "parve", True, [], "proteine", None,
  [("merlan ou cabillaud haché", 600, "g", 600, "merlan"), ("œuf", 1, "pièce", 50, "oeuf"), ("persil et coriandre", 20, "g", 20, "coriandre"), ("concentré de tomate", 50, "g", 50, "tomate_concentre"), ("ail", 15, "g", 15, "ail"), ("huile d'olive", 30, "ml", 28, "huile_olive"), ("harissa", 15, "g", 15, "harissa")],
  ["Mixe le poisson avec l'œuf, les herbes, sel et poivre ; forme des boulettes.", "Prépare une sauce tomate ail-harissa.", "Poche les boulettes 20 minutes dans la sauce frémissante.", "Sers avec du riz ou du pain complet."]))
R.append(("poulet-olives-citron", "Poulet aux olives et citron confit", "Tajine marocain fondant, olives vertes et citron confit.", "maroc", "plat", "facile", 20, 60, 4, "bassari", False, [], "proteine", None,
  [("poulet rôti", 900, "g", 900, "poulet_roti"), ("olives vertes", 120, "g", 120, "olive_verte"), ("citron confit", 60, "g", 60, "citron"), ("oignon", 200, "g", 200, "oignon"), ("ail", 15, "g", 15, "ail"), ("huile d'olive", 30, "ml", 28, "huile_olive"), ("coriandre fraîche", 15, "g", 15, "coriandre")],
  ["Fais revenir l'oignon, l'ail et les épices dans l'huile.", "Ajoute le poulet, dore sur toutes les faces.", "Mouille à hauteur, ajoute olives et citron confit, mijote 45 minutes.", "Parsème de coriandre et sers avec semoule ou pommes vapeur."]))
R.append(("tajine-kefta", "Tajine de kefta", "Boulettes de bœuf épicées, sauce tomate, œufs pochés au centre.", "maroc", "plat", "facile", 25, 35, 4, "bassari", False, [], "boutargue", None,
  [("bœuf haché", 600, "g", 600, "boeuf_hache"), ("tomates", 600, "g", 600, "tomate"), ("oignon", 120, "g", 120, "oignon"), ("œufs", 4, "pièce", 200, "oeuf"), ("huile d'olive", 30, "ml", 28, "huile_olive"), ("cumin et paprika", 10, "g", 10, "cumin"), ("coriandre", 15, "g", 15, "coriandre")],
  ["Assaisonne le haché avec oignon râpé, cumin, paprika ; roule des keftas.", "Fais réduire les tomates en sauce dans l'huile.", "Poche les keftas 15 minutes dans la sauce.", "Casse les œufs au centre, couvre 5 minutes et sers dans le plat."]))
R.append(("hraimi", "Hraimi", "Poisson en sauce rouge pimentée, spécialité de Tripoli servie le vendredi soir.", "tunisie", "plat", "moyen", 15, 35, 4, "parve", True, ["chabbat"], "proteine", None,
  [("cabillaud ou mérou en darnes", 700, "g", 700, "cabillaud"), ("concentré de tomate", 70, "g", 70, "tomate_concentre"), ("ail", 20, "g", 20, "ail"), ("harissa", 25, "g", 25, "harissa"), ("huile d'olive", 40, "ml", 37, "huile_olive"), ("cumin et carvi", 8, "g", 8, "cumin"), ("citron", 30, "g", 30, "citron")],
  ["Fais revenir ail, concentré, harissa et épices dans l'huile.", "Ajoute un verre d'eau et laisse épaissir 10 minutes.", "Pose les darnes dans la sauce, couvre et cuis 20 minutes.", "Termine au citron ; sers tiède avec du pain."]))
R.append(("sabich", "Sabich", "La pita israélienne : aubergine, œuf, tahin, crudités.", "israel", "plat", "facile", 20, 20, 4, "parve", False, ["express"], "proteine", None,
  [("pains pita", 4, "pièce", 320, "pita"), ("aubergines", 500, "g", 500, "aubergine"), ("œufs durs", 4, "pièce", 200, "oeuf_dur"), ("tahin", 60, "g", 60, "tahin"), ("concombre", 150, "g", 150, "concombre"), ("tomates", 200, "g", 200, "tomate"), ("huile d'olive", 30, "ml", 28, "huile_olive")],
  ["Rôtis les tranches d'aubergine badigeonnées d'huile au four.", "Prépare une salade concombre-tomate et une sauce tahin-citron.", "Garnis les pitas : aubergine, œuf dur en tranches, salade.", "Nappe de tahin, ajoute zhoug ou amba si tu aimes."]))
R.append(("bouillon-kneidlach", "Bouillon de poulet & kneidlach", "Le bouillon doré ashkénaze et ses quenelles moelleuses.", "ashkenaze", "plat", "moyen", 30, 90, 6, "bassari", False, ["chabbat", "fete"], "boutargue", None,
  [("poulet", 800, "g", 800, "poulet_cru"), ("carottes", 200, "g", 200, "carotte_crue"), ("céleri", 100, "g", 100, "celeri"), ("oignon", 120, "g", 120, "oignon"), ("farine de matza", 150, "g", 150, "farine"), ("œufs", 2, "pièce", 100, "oeuf"), ("huile", 30, "ml", 28, "huile_tournesol")],
  ["Fais frémir le poulet avec les légumes 1 heure, écume.", "Mélange farine de matza, œufs, huile et un peu de bouillon ; repos 30 minutes au frais.", "Forme des boules et poche-les 30 minutes dans le bouillon.", "Sers le bouillon filtré avec les kneidlach et des carottes."]))
R.append(("hallah", "Hallah tressée", "Le pain brioché du chabbat, doré et moelleux.", "ashkenaze", "pain", "moyen", 30, 35, 8, "parve", False, ["chabbat"], "boutargue", None,
  [("farine", 500, "g", 500, "farine"), ("œufs", 2, "pièce", 100, "oeuf"), ("sucre", 60, "g", 60, "sucre"), ("huile", 60, "ml", 55, "huile_tournesol"), ("levure de boulanger", 10, "g", 10, None), ("graines de sésame (option)", 10, "g", 10, "tahin")],
  ["Pétris farine, levure, sucre, œuf, huile et eau tiède ; laisse doubler 1 h 30.", "Dégaze, divise en trois boudins et tresse.", "Laisse pousser 45 minutes, dore à l'œuf, parsème de graines.", "Cuis 30-35 minutes à 180 °C."]))
R.append(("kugel", "Kugel de nouilles", "Le gratin sucré-salé de nouilles ashkénaze, entre dessert et plat.", "ashkenaze", "plat", "facile", 15, 45, 8, "halavi", False, ["fete"], "boutargue", None,
  [("nouilles aux œufs cuites", 500, "g", 500, "pates_oeufs"), ("œufs", 3, "pièce", 150, "oeuf"), ("crème fraîche", 150, "g", 150, "creme"), ("beurre", 50, "g", 50, "beurre"), ("sucre", 60, "g", 60, "sucre"), ("raisins secs", 80, "g", 80, "datte"), ("cannelle", 4, "g", 4, None)],
  ["Mélange les nouilles cuites avec œufs battus, crème, sucre, cannelle et raisins.", "Verse dans un plat beurré.", "Cuis 45 minutes à 180 °C jusqu'à dorure.", "Sers tiède ou froid, en carrés."]))
R.append(("makrouds", "Makrouds", "Losanges de semoule fourrés aux dattes, frits et trempés dans le miel.", "tunisie", "dessert", "difficile", 60, 20, 10, "parve", False, ["fete"], "boutargue", None,
  [("semoule moyenne", 500, "g", 500, "semoule_crue"), ("pâte de dattes", 300, "g", 300, "datte"), ("huile", 150, "ml", 138, "huile_tournesol"), ("miel", 200, "g", 200, "miel"), ("fleur d'oranger", 20, "ml", 20, None)],
  ["Sable la semoule avec l'huile, mouille à l'eau de fleur d'oranger, repos 30 minutes.", "Étale un boudin de pâte, insère la pâte de dattes au centre, referme.", "Coupe en losanges et fais frire jusqu'à dorure.", "Trempe immédiatement dans le miel chaud."]))
R.append(("yoyos", "Yoyos", "Les beignets de Hanouka à l'orange, glacés au miel.", "tunisie", "dessert", "moyen", 25, 20, 8, "parve", False, ["hanouka", "fete"], "boutargue", None,
  [("farine", 400, "g", 400, "farine"), ("œufs", 2, "pièce", 100, "oeuf"), ("jus d'orange", 100, "ml", 100, "jus_orange"), ("sucre", 50, "g", 50, "sucre"), ("huile de friture", 120, "ml", 110, "huile_tournesol"), ("miel", 150, "g", 150, "miel")],
  ["Mélange farine, œufs, jus d'orange, sucre et levure en pâte souple.", "Forme des anneaux et laisse reposer 20 minutes.", "Fais frire jusqu'à belle couleur.", "Trempe dans le miel citronné et laisse égoutter."]))
R.append(("debla", "Debla", "Rubans de pâte frits en rosace, nappés de miel — la fleur des fêtes.", "tunisie", "dessert", "difficile", 45, 20, 10, "parve", False, ["fete"], "boutargue", None,
  [("farine", 350, "g", 350, "farine"), ("œufs", 3, "pièce", 150, "oeuf"), ("huile de friture", 130, "ml", 120, "huile_tournesol"), ("miel", 250, "g", 250, "miel"), ("graines de sésame", 20, "g", 20, "tahin"), ("citron", 20, "g", 20, "citron")],
  ["Prépare une pâte ferme aux œufs, étale-la très finement en longs rubans.", "Enroule chaque ruban sur une fourchette dans l'huile chaude pour former la rosace.", "Égoutte puis trempe dans le miel au citron.", "Parsème de sésame et laisse sécher."]))
R.append(("banatages", "Banatages", "Croquettes de pomme de terre farcies à la viande, dorées à la poêle.", "tunisie", "entree", "moyen", 40, 20, 6, "bassari", False, ["fete"], "boutargue", None,
  [("pommes de terre", 800, "g", 800, "pdt"), ("bœuf haché", 350, "g", 350, "boeuf_hache"), ("oignon", 100, "g", 100, "oignon"), ("œufs", 2, "pièce", 100, "oeuf"), ("persil", 15, "g", 15, "persil"), ("huile de friture", 80, "ml", 74, "huile_tournesol")],
  ["Écrase les pommes de terre cuites en purée ferme.", "Fais revenir le haché avec oignon et persil.", "Farcis des galettes de purée avec la viande, referme en quenelles.", "Passe à l'œuf battu et fais dorer à la poêle."]))
R.append(("mafroum", "Mafroum", "Pommes de terre farcies à la viande, mijotées en sauce rouge — trésor de Tripoli.", "tunisie", "plat", "difficile", 50, 90, 6, "bassari", False, ["chabbat", "fete"], "boutargue", None,
  [("pommes de terre", 1000, "g", 1000, "pdt"), ("bœuf haché", 500, "g", 500, "boeuf_hache"), ("oignon", 120, "g", 120, "oignon"), ("persil et coriandre", 25, "g", 25, "persil"), ("œuf", 1, "pièce", 50, "oeuf"), ("concentré de tomate", 60, "g", 60, "tomate_concentre"), ("huile", 60, "ml", 55, "huile_tournesol")],
  ["Taille les pommes de terre en portefeuilles, farcis-les du haché assaisonné.", "Passe à la farine et à l'œuf, fais dorer.", "Range dans la sauce tomate et mijote 1 h 15 à couvert.", "Sers avec semoule ou pain, la sauce doit napper."]))
R.append(("salade-orange-olive", "Salade d'oranges aux olives", "Oranges, olives noires, oignon doux et cumin — fraîcheur d'hiver.", "maroc", "kemia", "facile", 10, 0, 4, "parve", False, ["express", "sans-gluten"], "proteine", None,
  [("oranges", 500, "g", 500, "jus_orange"), ("olives noires", 80, "g", 80, "olive_verte"), ("oignon rouge", 60, "g", 60, "oignon"), ("huile d'olive", 20, "ml", 18, "huile_olive"), ("cumin", 3, "g", 3, "cumin")],
  ["Pèle les oranges à vif et tranche-les en rondelles.", "Répartis olives et oignon émincé par-dessus.", "Assaisonne d'huile d'olive, cumin et une pincée de piment.", "Sers très frais."]))
R.append(("harira", "Harira", "La soupe marocaine aux pois chiches, lentilles et tomates.", "maroc", "plat", "moyen", 20, 50, 6, "parve", False, ["meal-prep"], "proteine", None,
  [("pois chiches", 300, "g", 300, "pois_chiche"), ("pois cassés ou lentilles", 150, "g", 150, "pois_casse"), ("tomates", 500, "g", 500, "tomate"), ("oignon", 120, "g", 120, "oignon"), ("céleri et coriandre", 60, "g", 60, "celeri"), ("huile d'olive", 30, "ml", 28, "huile_olive"), ("farine (liaison)", 30, "g", 30, "farine")],
  ["Fais revenir oignon, céleri et épices dans l'huile.", "Ajoute tomates mixées, légumineuses et 1,5 L d'eau ; mijote 40 minutes.", "Lie avec la farine délayée, cuis 5 minutes.", "Sers avec coriandre fraîche, citron et dattes."]))

def esc(value):
    return str(value).replace("'", "''")

def arr(values):
    if not values:
        return "'{}'"
    return "array[" + ",".join(f"'{esc(v)}'" for v in values) + "]"

lines = [
    "-- Seed: annexe A recipes (30 originals + linked Protein demo versions).",
    "-- Generated by scripts/seed-recipes.py — idempotent on slug.",
]

for (slug, title, desc, origin, cat, diff, prep, cook, servings, kash, fish,
     tags, vkind, parent, ingredients, steps) in R:
    parent_sql = (
        f"(select id from public.recipes where slug = '{esc(parent)}')"
        if parent else "null"
    )
    ing_rows = []
    for pos, (label, qty, unit, grams, key) in enumerate(ingredients):
        food_sql = (
            f"(select id from public.foods where source = 'ciqual' and external_id = '{F[key]}')"
            if key else "null"
        )
        ing_rows.append(
            f"((select id from r), {pos}, {food_sql}, {qty}, '{esc(unit)}', {grams}, '{esc(label)}')"
        )
    step_rows = [
        f"((select id from r), {pos}, '{esc(text)}')"
        for pos, text in enumerate(steps)
    ]
    ing_sql = ",\n    ".join(ing_rows)
    step_sql = ",\n  ".join(step_rows)
    lines.append(f"""
with r as (
  insert into public.recipes
    (author_id, title, slug, description, origin, category, difficulty, prep_min, cook_min,
     servings, kashrut_class, is_fish, kashrut_confidence, tags, visibility, version_kind,
     parent_recipe_id, status)
  values
    (null, '{esc(title)}', '{esc(slug)}', '{esc(desc)}', '{origin}', '{cat}', '{diff}', {prep}, {cook},
     {servings}, '{kash}', {str(fish).lower()}, 1.0, {arr(tags)}, 'community', '{vkind}',
     {parent_sql}, 'published')
  on conflict (slug) do nothing
  returning id
),
ing as (
  insert into public.recipe_ingredients (recipe_id, position, food_id, qty, unit, grams, label_raw)
  select * from (values
    {ing_sql}
  ) as v(recipe_id, position, food_id, qty, unit, grams, label_raw)
  where exists (select 1 from r)
)
insert into public.recipe_steps (recipe_id, position, text)
select * from (values
  {step_sql}
) as v(recipe_id, position, text)
where exists (select 1 from r);""")

lines.append("""
update public.recipes
set nutrition_per_serving = coalesce(public.compute_recipe_nutrition(id), '{}'::jsonb)
where author_id is null;""")

with open(OUT, "w") as f:
    f.write("\n".join(lines) + "\n")

print(f"{len(R)} recipes written to {OUT}")
