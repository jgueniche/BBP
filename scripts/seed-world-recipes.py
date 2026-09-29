# Generates supabase/migrations/202609291220_world_starter_recipes.sql:
# a diverse starter catalogue (session 19, ADR-032) next to the 35 BBP
# recipes, which stay untouched. Original texts; ingredients pinned to Ciqual
# foods by external_id for the per-portion nutrition. Idempotent on slug.

OUT = "supabase/migrations/202609291220_world_starter_recipes.sql"

# (slug, title, description, icon, cuisine, category, difficulty, prep, cook,
#  servings, tags, ingredients[(label, qty, unit, grams, ciqual)],
#  steps[(text, minutes|None)])
R = [
    (
        "quiche-lorraine", "Quiche lorraine",
        "La tarte salée de Lorraine : lardons fumés, crème et œufs sur une pâte brisée.",
        "🥧", "france", "plat", "facile", 15, 35, 6, ["four", "classique"],
        [
            ("pâte brisée", 1, "pièce", 230, "23410"),
            ("lardons fumés", 200, "g", 200, "28720"),
            ("œufs", 3, "pièce", 165, "22000"),
            ("crème fraîche épaisse", 20, "cl", 200, "19410"),
            ("lait", 10, "cl", 100, "19041"),
            ("emmental râpé", 60, "g", 60, "12118"),
            ("poivre", 1, "pincée", 1, "11015"),
        ],
        [
            ("Préchauffe le four à 200 °C et étale la pâte dans un moule, en gardant le papier de cuisson.", None),
            ("Fais dorer les lardons à sec dans une poêle, puis égoutte-les sur du papier absorbant.", 5),
            ("Fouette les œufs avec la crème, le lait et le poivre ; le sel est inutile avec les lardons.", None),
            ("Répartis les lardons et l'emmental sur la pâte, verse l'appareil.", None),
            ("Enfourne jusqu'à ce que la quiche soit dorée et juste prise au centre.", 30),
        ],
    ),
    (
        "ratatouille", "Ratatouille",
        "Le mijoté provençal de légumes d'été, fondant et parfumé au thym.",
        "🍆", "france", "accompagnement", "facile", 25, 50, 6, ["meal-prep", "ete"],
        [
            ("aubergines", 2, "pièce", 500, "20300"),
            ("courgettes", 2, "pièce", 400, "20020"),
            ("poivrons rouges", 2, "pièce", 300, "20087"),
            ("tomates", 5, "pièce", 600, "20047"),
            ("oignons", 2, "pièce", 200, "20239"),
            ("gousses d'ail", 3, "pièce", 15, "11000"),
            ("huile d'olive", 5, "càs", 60, "17270"),
            ("thym frais", 4, "brins", 4, "11070"),
        ],
        [
            ("Coupe les aubergines, les courgettes et les poivrons en dés, les tomates en quartiers et les oignons en lamelles.", None),
            ("Fais revenir les oignons dans l'huile, puis ajoute les poivrons.", 8),
            ("Ajoute les aubergines et les courgettes, laisse-les colorer en remuant.", 10),
            ("Verse les tomates, l'ail écrasé et le thym, sale et poivre.", None),
            ("Couvre et laisse mijoter à feu doux ; c'est encore meilleur le lendemain.", 30),
        ],
    ),
    (
        "moules-marinieres", "Moules marinières",
        "Des moules ouvertes au vin blanc, échalotes et persil, à saucer sans modération.",
        "🦪", "france", "plat", "facile", 20, 10, 4, ["express", "bord-de-mer"],
        [
            ("moules de bouchot", 2, "kg", 2000, "10014"),
            ("vin blanc sec", 20, "cl", 200, "5215"),
            ("échalotes", 3, "pièce", 90, "20097"),
            ("beurre", 30, "g", 30, "16400"),
            ("persil plat", 1, "bouquet", 20, "11014"),
            ("poivre", 1, "pincée", 1, "11015"),
        ],
        [
            ("Gratte et rince les moules ; jette celles qui restent ouvertes quand tu les tapotes.", None),
            ("Fais fondre les échalotes émincées dans le beurre, dans une grande cocotte.", 3),
            ("Ajoute le vin blanc et les moules, poivre, couvre et monte le feu.", None),
            ("Secoue la cocotte jusqu'à ce que toutes les moules soient ouvertes.", 6),
            ("Parsème de persil haché et sers aussitôt avec le jus.", None),
        ],
    ),
    (
        "risotto-champignons", "Risotto aux champignons",
        "Un risotto crémeux, parfumé aux champignons et au parmesan.",
        "🍄", "italie", "plat", "moyen", 15, 25, 4, ["reconfort"],
        [
            ("riz rond pour risotto", 320, "g", 320, "9100"),
            ("champignons", 400, "g", 400, "20010"),
            ("oignon", 1, "pièce", 100, "20239"),
            ("bouillon de légumes chaud", 1.2, "l", 1200, "25948"),
            ("vin blanc sec", 10, "cl", 100, "5215"),
            ("parmesan râpé", 60, "g", 60, "12120"),
            ("beurre", 30, "g", 30, "16400"),
            ("huile d'olive", 2, "càs", 25, "17270"),
        ],
        [
            ("Fais dorer les champignons émincés dans une poêle chaude avec un peu d'huile, réserve.", 6),
            ("Dans une sauteuse, fais fondre l'oignon haché dans le reste d'huile, ajoute le riz et nacre-le.", 3),
            ("Verse le vin blanc et laisse-le s'évaporer.", 2),
            ("Ajoute le bouillon louche par louche, en remuant, en attendant qu'il soit absorbé à chaque fois.", 18),
            ("Hors du feu, incorpore les champignons, le beurre et le parmesan, couvre 2 minutes et sers.", 2),
        ],
    ),
    (
        "tiramisu", "Tiramisu",
        "Le dessert italien au café : biscuits imbibés et crème au mascarpone.",
        "🍰", "italie", "dessert", "moyen", 25, 0, 6, ["sans-cuisson", "a-l-avance"],
        [
            ("mascarpone", 250, "g", 250, "19584"),
            ("œufs", 3, "pièce", 165, "22000"),
            ("sucre", 80, "g", 80, "31016"),
            ("café fort refroidi", 30, "cl", 300, "18073"),
            ("biscuits à la cuillère", 24, "pièce", 200, "24430"),
            ("cacao non sucré", 2, "càs", 15, "18100"),
            ("marsala (facultatif)", 3, "càs", 45, None),
        ],
        [
            ("Sépare les blancs des jaunes ; fouette les jaunes avec le sucre jusqu'à ce qu'ils blanchissent.", None),
            ("Incorpore le mascarpone, puis les blancs montés en neige ferme, délicatement.", None),
            ("Trempe rapidement les biscuits dans le café (et le marsala si tu l'utilises) et tapisse le plat.", None),
            ("Alterne couches de crème et de biscuits, en finissant par la crème.", None),
            ("Laisse reposer au frais au moins 6 heures, puis saupoudre de cacao au moment de servir.", None),
        ],
    ),
    (
        "gaspacho", "Gaspacho andalou",
        "Une soupe froide de tomates, concombre et poivron, fraîche comme un été à Séville.",
        "🍅", "espagne", "soupe", "facile", 20, 0, 4, ["sans-cuisson", "ete"],
        [
            ("tomates bien mûres", 1, "kg", 1000, "20047"),
            ("concombre", 0.5, "pièce", 200, "20019"),
            ("poivron vert", 1, "pièce", 150, "20085"),
            ("gousse d'ail", 1, "pièce", 5, "11000"),
            ("pain rassis", 60, "g", 60, "7001"),
            ("huile d'olive", 6, "càs", 70, "17270"),
            ("vinaigre de vin", 2, "càs", 30, "11220"),
        ],
        [
            ("Fais tremper le pain dans un peu d'eau.", None),
            ("Coupe grossièrement les tomates, le concombre pelé, le poivron et l'ail.", None),
            ("Mixe tous les légumes avec le pain essoré, le vinaigre et du sel, puis l'huile en filet.", None),
            ("Passe au chinois pour une texture lisse et réserve au frais au moins 2 heures.", None),
            ("Sers très froid avec quelques dés de légumes.", None),
        ],
    ),
    (
        "tortilla-de-patatas", "Tortilla de patatas",
        "L'omelette épaisse aux pommes de terre et aux oignons confits.",
        "🥔", "espagne", "plat", "moyen", 15, 35, 4, ["pique-nique"],
        [
            ("pommes de terre", 600, "g", 600, "4008"),
            ("oignon", 1, "pièce", 150, "20239"),
            ("œufs", 6, "pièce", 330, "22000"),
            ("huile d'olive", 10, "cl", 90, "17270"),
        ],
        [
            ("Coupe les pommes de terre en fines lamelles et l'oignon en rondelles.", None),
            ("Fais-les confire doucement dans l'huile, sans les colorer, jusqu'à ce qu'ils soient tendres.", 20),
            ("Égoutte-les et mélange-les aux œufs battus salés ; laisse reposer 5 minutes.", 5),
            ("Verse dans une poêle huilée bien chaude, cuis à feu moyen.", 6),
            ("Retourne la tortilla à l'aide d'une assiette et laisse cuire l'autre face.", 4),
        ],
    ),
    (
        "salade-grecque", "Salade grecque",
        "Tomates, concombre, oignon rouge, olives et feta, arrosés d'huile d'olive.",
        "🥗", "grece", "salade", "facile", 15, 0, 4, ["express", "ete"],
        [
            ("tomates", 4, "pièce", 500, "20047"),
            ("concombre", 1, "pièce", 300, "20019"),
            ("oignon rouge", 1, "pièce", 100, "20238"),
            ("feta", 200, "g", 200, "12066"),
            ("olives noires", 80, "g", 80, "13131"),
            ("huile d'olive", 4, "càs", 50, "17270"),
            ("origan séché", 1, "càc", 2, None),
        ],
        [
            ("Coupe les tomates en quartiers, le concombre en demi-rondelles et l'oignon en fines lamelles.", None),
            ("Dispose les légumes et les olives dans un plat.", None),
            ("Pose la feta en bloc ou en gros morceaux par-dessus.", None),
            ("Arrose d'huile d'olive, parsème d'origan et poivre.", None),
        ],
    ),
    (
        "taboule-libanais", "Taboulé libanais",
        "Beaucoup de persil, un peu de boulgour, du citron : la version herbacée du Liban.",
        "🌿", "liban", "salade", "facile", 30, 0, 4, ["ete", "vegan"],
        [
            ("persil plat", 3, "bouquets", 150, "11014"),
            ("menthe fraîche", 1, "bouquet", 20, "11027"),
            ("boulgour fin", 60, "g", 60, "9690"),
            ("tomates", 3, "pièce", 350, "20047"),
            ("oignon nouveau", 2, "pièce", 40, "20323"),
            ("jus de citron", 2, "pièce", 80, "13009"),
            ("huile d'olive", 5, "càs", 60, "17270"),
        ],
        [
            ("Rince le boulgour et laisse-le gonfler dans le jus de citron.", 15),
            ("Hache finement le persil et la menthe au couteau, sans les écraser.", None),
            ("Coupe les tomates en tout petits dés et émince les oignons.", None),
            ("Mélange le tout avec l'huile, sale, et sers bien frais.", None),
        ],
    ),
    (
        "houmous", "Houmous",
        "La crème de pois chiches au tahin, citron et ail, à partager avec du pain pita.",
        "🫘", "liban", "kemia", "facile", 10, 0, 6, ["express", "apero"],
        [
            ("pois chiches cuits", 400, "g", 400, "20507"),
            ("tahin", 80, "g", 80, "15203"),
            ("jus de citron", 1, "pièce", 40, "13009"),
            ("gousse d'ail", 1, "pièce", 5, "11000"),
            ("cumin", 1, "càc", 2, "11042"),
            ("huile d'olive", 3, "càs", 35, "17270"),
        ],
        [
            ("Garde un peu d'eau des pois chiches, égoutte le reste.", None),
            ("Mixe les pois chiches avec le tahin, le citron, l'ail, le cumin et du sel.", None),
            ("Ajoute l'eau réservée petit à petit jusqu'à une texture très lisse.", None),
            ("Sers dans une assiette creuse, avec un filet d'huile d'olive.", None),
        ],
    ),
    (
        "imam-bayildi", "Imam bayildi",
        "Aubergines fondantes farcies aux oignons et tomates, servies tièdes.",
        "🍆", "turquie", "plat", "moyen", 25, 60, 4, ["four", "vegan"],
        [
            ("aubergines", 4, "pièce", 1000, "20300"),
            ("oignons", 3, "pièce", 300, "20239"),
            ("tomates", 4, "pièce", 500, "20047"),
            ("gousses d'ail", 4, "pièce", 20, "11000"),
            ("persil", 1, "bouquet", 30, "11014"),
            ("huile d'olive", 10, "cl", 90, "17270"),
            ("sucre", 1, "càc", 5, "31016"),
        ],
        [
            ("Pèle les aubergines en bandes, fends-les sur la longueur et fais-les dorer dans l'huile.", 10),
            ("Fais fondre les oignons émincés avec l'ail, puis ajoute les tomates en dés, le sucre et le persil.", 15),
            ("Ouvre les aubergines et remplis-les de cette farce.", None),
            ("Mouille d'un fond d'eau, couvre et cuis au four à 180 °C.", 40),
            ("Laisse tiédir : elles se dégustent tièdes ou froides.", None),
        ],
    ),
    (
        "dal-lentilles-corail", "Dal de lentilles corail au lait de coco",
        "Des lentilles fondantes aux épices douces, adoucies au lait de coco.",
        "🍛", "inde", "plat", "facile", 10, 25, 4, ["vegan", "meal-prep"],
        [
            ("lentilles corail", 250, "g", 250, "20535"),
            ("lait de coco", 40, "cl", 400, "18041"),
            ("oignon", 1, "pièce", 100, "20239"),
            ("tomates pelées", 1, "boîte", 400, "20048"),
            ("gingembre frais", 1, "morceau", 15, "11074"),
            ("gousses d'ail", 2, "pièce", 10, "11000"),
            ("curry en poudre", 2, "càc", 5, "11005"),
            ("curcuma", 1, "càc", 3, "11089"),
            ("huile de tournesol", 2, "càs", 25, "17440"),
        ],
        [
            ("Fais revenir l'oignon, l'ail et le gingembre hachés dans l'huile.", 5),
            ("Ajoute le curry et le curcuma, remue 1 minute pour réveiller les épices.", 1),
            ("Verse les lentilles rincées, les tomates, le lait de coco et 40 cl d'eau.", None),
            ("Laisse mijoter en remuant de temps en temps, jusqu'à ce que les lentilles fondent.", 20),
            ("Sale, ajuste la texture avec un peu d'eau et sers avec du riz.", None),
        ],
    ),
    (
        "poulet-tikka-masala", "Poulet tikka masala",
        "Des morceaux de poulet marinés au yaourt et aux épices, dans une sauce tomate crémeuse.",
        "🍗", "inde", "plat", "moyen", 20, 35, 4, ["epice"],
        [
            ("filets de poulet", 700, "g", 700, "36017"),
            ("yaourt nature", 150, "g", 150, "19593"),
            ("crème", 15, "cl", 150, "19415"),
            ("tomates pelées", 1, "boîte", 400, "20048"),
            ("oignon", 1, "pièce", 120, "20239"),
            ("gingembre frais", 1, "morceau", 15, "11074"),
            ("gousses d'ail", 3, "pièce", 15, "11000"),
            ("curry en poudre", 1, "càs", 8, "11005"),
            ("paprika", 1, "càc", 3, "11049"),
            ("huile de tournesol", 2, "càs", 25, "17440"),
        ],
        [
            ("Coupe le poulet en morceaux et fais-le mariner avec le yaourt, la moitié des épices et du sel.", 30),
            ("Saisis le poulet à la poêle bien chaude, réserve.", 6),
            ("Fais revenir l'oignon, l'ail et le gingembre, ajoute le reste des épices puis les tomates.", 10),
            ("Remets le poulet, ajoute la crème et laisse mijoter.", 15),
            ("Sers avec du riz basmati ou des naans.", None),
        ],
    ),
    (
        "poulet-noix-de-cajou", "Poulet sauté aux noix de cajou",
        "Un sauté minute au wok : poulet, poivron, noix de cajou grillées et sauce soja.",
        "🥡", "chine", "plat", "facile", 15, 12, 4, ["express", "wok"],
        [
            ("filets de poulet", 500, "g", 500, "36017"),
            ("noix de cajou", 80, "g", 80, "15055"),
            ("poivron rouge", 1, "pièce", 150, "20087"),
            ("oignons nouveaux", 3, "pièce", 60, "20323"),
            ("sauce soja", 4, "càs", 60, "11104"),
            ("gingembre frais", 1, "morceau", 10, "11074"),
            ("huile de tournesol", 2, "càs", 25, "17440"),
            ("sucre", 1, "càc", 5, "31016"),
        ],
        [
            ("Fais griller les noix de cajou à sec dans le wok, réserve.", 3),
            ("Saisis le poulet en lamelles dans l'huile très chaude.", 5),
            ("Ajoute le poivron, le gingembre et les oignons, saute 2 minutes.", 2),
            ("Verse la sauce soja et le sucre, remue pour enrober.", 1),
            ("Ajoute les noix de cajou et sers avec du riz.", None),
        ],
    ),
    (
        "porc-au-caramel", "Porc au caramel",
        "Le classique vietnamien : porc mijoté dans un caramel salé au nuoc-mâm.",
        "🍖", "vietnam", "plat", "moyen", 15, 45, 4, ["mijote"],
        [
            ("échine de porc", 800, "g", 800, "28302"),
            ("sucre", 60, "g", 60, "31016"),
            ("sauce nuoc-mâm", 4, "càs", 60, "11194"),
            ("échalotes", 3, "pièce", 90, "20097"),
            ("gousses d'ail", 3, "pièce", 15, "11000"),
            ("poivre", 1, "càc", 2, "11015"),
        ],
        [
            ("Coupe le porc en cubes et fais-le mariner avec le nuoc-mâm, l'ail et le poivre.", 15),
            ("Fais un caramel ambré avec le sucre et 2 cuillerées d'eau dans une cocotte.", 5),
            ("Ajoute les échalotes puis la viande, et remue pour bien l'enrober.", 3),
            ("Couvre à hauteur d'eau et laisse mijoter jusqu'à ce que la sauce devienne sirupeuse.", 40),
            ("Sers avec du riz blanc.", None),
        ],
    ),
    (
        "soupe-miso-tofu", "Soupe miso au tofu",
        "Un bouillon dashi au miso, dés de tofu soyeux et oignon nouveau.",
        "🍜", "japon", "soupe", "facile", 10, 10, 4, ["express"],
        [
            ("bouillon dashi", 1, "l", 1000, None),
            ("pâte miso", 60, "g", 60, "20916"),
            ("tofu soyeux", 200, "g", 200, "20906"),
            ("algue nori", 1, "feuille", 3, "20987"),
            ("oignon nouveau", 1, "pièce", 20, "20323"),
        ],
        [
            ("Porte le dashi à frémissement, sans le faire bouillir.", 5),
            ("Délaye le miso dans une louche de bouillon, puis verse-le dans la casserole.", None),
            ("Ajoute le tofu en petits dés et l'algue en lanières, chauffe 2 minutes.", 2),
            ("Sers aussitôt, parsemé d'oignon nouveau.", None),
        ],
    ),
    (
        "bibimbap", "Bibimbap",
        "Le bol coréen : riz, légumes sautés, bœuf mariné et œuf au plat.",
        "🍚", "coree", "plat", "moyen", 30, 20, 4, ["bol"],
        [
            ("riz blanc", 300, "g", 300, "9100"),
            ("bœuf haché", 300, "g", 300, "6252"),
            ("carottes", 2, "pièce", 200, "20009"),
            ("épinards frais", 200, "g", 200, "20270"),
            ("courgette", 1, "pièce", 200, "20020"),
            ("œufs", 4, "pièce", 220, "22000"),
            ("sauce soja", 3, "càs", 45, "11104"),
            ("huile de sésame", 2, "càs", 25, "17400"),
            ("graines de sésame", 1, "càs", 10, "15038"),
        ],
        [
            ("Cuis le riz.", 15),
            ("Fais revenir le bœuf avec la moitié de la sauce soja et un peu d'huile de sésame.", 5),
            ("Saute séparément les carottes et la courgette en bâtonnets, puis fais tomber les épinards.", 8),
            ("Cuis les œufs au plat.", 4),
            ("Dresse le riz dans des bols, dispose les garnitures en couronne, l'œuf au centre, parsème de sésame.", None),
        ],
    ),
    (
        "curry-vert-legumes", "Curry vert de légumes",
        "Des légumes croquants et du tofu dans un curry vert au lait de coco.",
        "🥥", "thailande", "plat", "facile", 15, 20, 4, ["epice"],
        [
            ("lait de coco", 40, "cl", 400, "18041"),
            ("pâte de curry vert", 2, "càs", 30, None),
            ("tofu nature", 250, "g", 250, "20904"),
            ("brocoli", 1, "pièce", 300, "20304"),
            ("haricots verts", 150, "g", 150, "20070"),
            ("poivron jaune", 1, "pièce", 150, "20168"),
            ("basilic frais", 1, "bouquet", 15, "11033"),
            ("huile de tournesol", 1, "càs", 12, "17440"),
        ],
        [
            ("Fais revenir la pâte de curry dans l'huile pour libérer les arômes.", 1),
            ("Verse le lait de coco et porte à frémissement.", 3),
            ("Ajoute le brocoli en fleurettes, les haricots et le poivron, laisse cuire.", 8),
            ("Ajoute le tofu en cubes et réchauffe doucement.", 5),
            ("Parsème de basilic et sers avec du riz.", None),
        ],
    ),
    (
        "mango-sticky-rice", "Riz gluant à la mangue",
        "Le dessert thaï : riz gluant au lait de coco sucré et tranches de mangue.",
        "🥭", "thailande", "dessert", "moyen", 15, 25, 4, ["vegan"],
        [
            ("riz gluant", 250, "g", 250, "9100"),
            ("lait de coco", 25, "cl", 250, "18041"),
            ("sucre", 60, "g", 60, "31016"),
            ("mangues mûres", 2, "pièce", 500, "13025"),
            ("graines de sésame", 1, "càs", 8, "15038"),
        ],
        [
            ("Fais tremper le riz gluant dans l'eau froide au moins 4 heures.", None),
            ("Cuis-le à la vapeur jusqu'à ce qu'il soit translucide.", 25),
            ("Chauffe le lait de coco avec le sucre et une pincée de sel, sans bouillir.", 3),
            ("Verse les deux tiers sur le riz chaud et laisse absorber.", 10),
            ("Sers avec la mangue en tranches, le reste de lait de coco et le sésame.", None),
        ],
    ),
    (
        "mafe-boeuf", "Mafé de bœuf",
        "Le ragoût ouest-africain à la pâte d'arachide, riche et réconfortant.",
        "🥜", "afrique_ouest", "plat", "moyen", 20, 90, 6, ["mijote"],
        [
            ("paleron de bœuf", 800, "g", 800, "6270"),
            ("pâte d'arachide", 150, "g", 150, "15202"),
            ("concentré de tomate", 70, "g", 70, "20068"),
            ("oignons", 2, "pièce", 200, "20239"),
            ("patates douces", 2, "pièce", 500, "4101"),
            ("carottes", 3, "pièce", 300, "20009"),
            ("chou blanc", 0.25, "pièce", 300, "20116"),
            ("piment", 1, "pièce", 10, "20151"),
            ("huile d'arachide", 3, "càs", 35, "17040"),
        ],
        [
            ("Fais dorer la viande en cubes dans l'huile avec les oignons émincés.", 10),
            ("Ajoute le concentré de tomate, puis couvre d'eau et laisse cuire.", 40),
            ("Délaye la pâte d'arachide dans une louche de bouillon et verse-la dans la cocotte.", None),
            ("Ajoute les légumes en gros morceaux et le piment entier, et laisse mijoter.", 40),
            ("Sers avec du riz blanc.", None),
        ],
    ),
    (
        "poulet-yassa", "Poulet yassa",
        "Le poulet mariné au citron et à la moutarde, confit dans une montagne d'oignons.",
        "🍋", "afrique_ouest", "plat", "moyen", 20, 60, 6, ["marinade"],
        [
            ("cuisses de poulet", 6, "pièce", 1200, "36002"),
            ("oignons", 6, "pièce", 800, "20239"),
            ("jus de citron", 3, "pièce", 120, "13009"),
            ("moutarde", 3, "càs", 45, "11013"),
            ("gousses d'ail", 3, "pièce", 15, "11000"),
            ("piment", 1, "pièce", 10, "20151"),
            ("huile de tournesol", 4, "càs", 50, "17440"),
        ],
        [
            ("Fais mariner le poulet avec les oignons émincés, le citron, la moutarde, l'ail et du sel, idéalement une nuit.", None),
            ("Fais dorer les morceaux de poulet égouttés dans l'huile, réserve.", 10),
            ("Fais fondre longuement les oignons de la marinade dans la même cocotte.", 20),
            ("Remets le poulet, ajoute le reste de marinade, le piment et un verre d'eau.", None),
            ("Laisse mijoter à couvert et sers avec du riz.", 30),
        ],
    ),
    (
        "accras-de-morue", "Accras de morue",
        "Les beignets antillais à la morue, relevés de piment et d'herbes.",
        "🐟", "antilles", "kemia", "moyen", 30, 15, 6, ["apero", "friture"],
        [
            ("morue salée", 250, "g", 250, "26098"),
            ("farine", 200, "g", 200, "9435"),
            ("œuf", 1, "pièce", 55, "22000"),
            ("levure chimique", 1, "sachet", 11, "11046"),
            ("oignon nouveau", 2, "pièce", 40, "20323"),
            ("persil", 1, "bouquet", 20, "11014"),
            ("piment", 1, "pièce", 5, "20151"),
            ("huile de friture", 50, "cl", 60, "17440"),
        ],
        [
            ("Dessale la morue dans l'eau froide la veille, en changeant l'eau plusieurs fois.", None),
            ("Poche-la dans l'eau frémissante, égoutte et émiette-la.", 10),
            ("Mélange la farine, la levure, l'œuf et de l'eau jusqu'à une pâte épaisse.", None),
            ("Ajoute la morue, les herbes et le piment hachés, laisse reposer.", 30),
            ("Fais frire des petites cuillerées de pâte dans l'huile chaude jusqu'à ce qu'elles soient dorées.", 5),
        ],
    ),
    (
        "chili-sin-carne", "Chili sin carne",
        "Haricots rouges, maïs et poivrons mijotés aux épices, sans viande.",
        "🌶️", "mexique", "plat", "facile", 15, 35, 4, ["vegan", "meal-prep"],
        [
            ("haricots rouges cuits", 500, "g", 500, "20503"),
            ("maïs doux", 150, "g", 150, "20066"),
            ("tomates pelées", 1, "boîte", 400, "20048"),
            ("poivron rouge", 1, "pièce", 150, "20087"),
            ("oignon", 1, "pièce", 120, "20239"),
            ("gousses d'ail", 2, "pièce", 10, "11000"),
            ("cumin", 2, "càc", 4, "11042"),
            ("paprika", 2, "càc", 4, "11049"),
            ("huile d'olive", 2, "càs", 25, "17270"),
        ],
        [
            ("Fais revenir l'oignon, l'ail et le poivron en dés dans l'huile.", 6),
            ("Ajoute les épices et remue une minute.", 1),
            ("Verse les tomates, les haricots et le maïs égouttés, sale.", None),
            ("Laisse mijoter à couvert en remuant de temps en temps.", 25),
            ("Sers avec du riz, des tortillas ou de l'avocat.", None),
        ],
    ),
    (
        "ceviche-poisson", "Ceviche de poisson",
        "Du poisson blanc très frais « cuit » au citron vert, oignon rouge et coriandre.",
        "🍋‍🟩", "amerique_sud", "entree", "facile", 20, 0, 4, ["sans-cuisson", "ete"],
        [
            ("filets de bar très frais", 500, "g", 500, "26075"),
            ("citrons verts", 5, "pièce", 200, "13067"),
            ("oignon rouge", 1, "pièce", 100, "20238"),
            ("piment", 1, "pièce", 5, "20151"),
            ("coriandre fraîche", 1, "bouquet", 20, "11094"),
            ("maïs doux", 100, "g", 100, "20066"),
        ],
        [
            ("Coupe le poisson en dés réguliers et l'oignon en très fines lamelles.", None),
            ("Mélange le poisson avec le jus des citrons verts, le piment émincé et du sel.", None),
            ("Laisse mariner au frais jusqu'à ce que le poisson devienne opaque.", 15),
            ("Ajoute l'oignon, la coriandre et le maïs, et sers aussitôt.", None),
        ],
    ),
    (
        "pancakes", "Pancakes moelleux",
        "Des pancakes épais et moelleux, à arroser de sirop d'érable.",
        "🥞", "etats_unis", "petit_dej", "facile", 10, 15, 4, ["brunch"],
        [
            ("farine", 250, "g", 250, "9435"),
            ("lait", 30, "cl", 300, "19041"),
            ("œufs", 2, "pièce", 110, "22000"),
            ("beurre fondu", 40, "g", 40, "16400"),
            ("sucre", 30, "g", 30, "31016"),
            ("levure chimique", 1, "sachet", 11, "11046"),
            ("sirop d'érable", 8, "càs", 120, "31034"),
        ],
        [
            ("Mélange la farine, le sucre, la levure et une pincée de sel.", None),
            ("Ajoute les œufs, le lait puis le beurre fondu, sans trop travailler la pâte.", None),
            ("Laisse reposer 10 minutes.", 10),
            ("Cuis des petites louches dans une poêle beurrée ; retourne quand des bulles apparaissent.", 12),
            ("Sers chaud avec le sirop d'érable.", None),
        ],
    ),
    (
        "bortsch", "Bortsch",
        "La soupe de betterave aux légumes, servie avec une cuillerée de crème.",
        "🥣", "europe_est", "soupe", "moyen", 25, 50, 6, ["hiver", "meal-prep"],
        [
            ("betteraves crues", 3, "pièce", 450, "20003"),
            ("chou blanc", 0.25, "pièce", 300, "20116"),
            ("pommes de terre", 2, "pièce", 300, "4008"),
            ("carotte", 1, "pièce", 120, "20009"),
            ("oignon", 1, "pièce", 100, "20239"),
            ("concentré de tomate", 2, "càs", 40, "20068"),
            ("bouillon de légumes", 1.5, "l", 1500, "25948"),
            ("crème fraîche", 6, "càs", 90, "19410"),
            ("aneth frais", 1, "bouquet", 10, "11093"),
        ],
        [
            ("Fais revenir l'oignon et la carotte râpée, puis ajoute la betterave râpée et le concentré de tomate.", 10),
            ("Verse le bouillon, ajoute les pommes de terre en dés et laisse cuire.", 20),
            ("Ajoute le chou émincé et poursuis la cuisson.", 20),
            ("Assaisonne avec du sel, du poivre et un filet de vinaigre si tu aimes.", None),
            ("Sers avec une cuillerée de crème et de l'aneth ciselé.", None),
        ],
    ),
]


def esc(s):
    return s.replace("'", "''")


def arr(values):
    if not values:
        return "'{}'"
    return "array[" + ",".join(f"'{esc(v)}'" for v in values) + "]"


def num(value):
    return str(value).rstrip("0").rstrip(".") if isinstance(value, float) else str(value)


lines = [
    "-- Session 19 (ADR-032): a diverse starter catalogue, generated by",
    "-- scripts/seed-world-recipes.py. Adds recipes from every continent and",
    "-- for every table next to the 35 original ones, which stay untouched.",
    "-- Original texts; ingredients pinned to Ciqual foods for the nutrition.",
    "-- Idempotent on slug. Apply after 202609291200 (world cuisines).",
]

slugs = set()
for (slug, title, desc, icon, cuisine, cat, diff, prep, cook, servings, tags,
     ingredients, steps) in R:
    assert slug not in slugs, slug
    slugs.add(slug)
    ing_rows = []
    for pos, (label, qty, unit, grams, code) in enumerate(ingredients):
        food = (
            f"(select id from public.foods where source = 'ciqual' and external_id = '{code}')"
            if code else "null"
        )
        ing_rows.append(
            f"((select id from r), {pos}, {food}, {num(qty)}, '{esc(unit)}', {num(grams)}, '{esc(label)}')"
        )
    step_rows = [
        f"((select id from r), {pos}, '{esc(text)}', {minutes * 60 if minutes else 'null::int'})"
        for pos, (text, minutes) in enumerate(steps)
    ]
    ing_sql = ",\n    ".join(ing_rows)
    step_sql = ",\n  ".join(step_rows)
    lines.append(f"""
with r as (
  insert into public.recipes
    (author_id, title, slug, description, icon, origin, category, difficulty,
     prep_min, cook_min, servings, tags, visibility, version_kind, status)
  values
    (null, '{esc(title)}', '{slug}', '{esc(desc)}', '{icon}', '{cuisine}', '{cat}', '{diff}',
     {prep}, {cook}, {servings}, {arr(tags)}, 'community', 'boutargue', 'published')
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
insert into public.recipe_steps (recipe_id, position, text, duration_sec)
select * from (values
  {step_sql}
) as v(recipe_id, position, text, duration_sec)
where exists (select 1 from r);""")

slug_list = ", ".join(f"'{s}'" for s in sorted(slugs))
# Nutrition only when linked foods with a kcal value cover >= 90 % of the
# grams: some Ciqual rows lack energy values and would understate it.
lines.append(f"""
update public.recipes r
set nutrition_per_serving = case
  when (
    select coalesce(sum(i.grams) filter (where f.per_100g ? 'kcal'), 0)
      >= 0.9 * nullif(sum(i.grams), 0)
    from public.recipe_ingredients i
    left join public.foods f on f.id = i.food_id
    where i.recipe_id = r.id
  ) then coalesce(public.compute_recipe_nutrition(r.id), '{{}}'::jsonb)
  else '{{}}'::jsonb
end
where r.author_id is null and r.slug in ({slug_list});""")

with open(OUT, "w") as f:
    f.write("\n".join(lines) + "\n")

print(f"{len(R)} recipes written to {OUT}")
