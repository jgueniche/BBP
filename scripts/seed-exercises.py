# Generate src/db/seed/exercises/exercises.sql — ~200 French exercises.
# Fields: slug, name, kind, muscle_groups, equipment, level, MET, cues, mistakes.
# Idempotent (on conflict slug do nothing). Run: python3 scripts/seed-exercises.py

E = []


def x(slug, name, kind, groups, equip, level, met, cues, mistakes):
    E.append((slug, name, kind, groups, equip, level, met, cues, mistakes))


PDC = ["poids_du_corps"]
H = ["halteres"]
B = ["barre", "banc"]
EL = ["elastiques"]
M = ["machine"]
KB = ["kettlebell"]

# --- Pectoraux ---------------------------------------------------------------
x("pompes", "Pompes classiques", "muscu", ["pectoraux", "triceps", "abdos"], PDC, "debutant", 3.8, "Corps gainé en planche, coudes à 45°, poitrine qui frôle le sol.", "Hanches qui tombent ou fesses en l'air.")
x("pompes-genoux", "Pompes sur les genoux", "muscu", ["pectoraux", "triceps"], PDC, "debutant", 3.0, "Genoux au sol, alignement épaules-hanches conservé.", "Casser la ligne du buste en pliant la hanche.")
x("pompes-inclinees", "Pompes inclinées (mains surélevées)", "muscu", ["pectoraux", "triceps"], PDC, "debutant", 3.3, "Mains sur un banc ou un mur, corps rigide.", "Coudes qui partent vers l'extérieur.")
x("pompes-declinees", "Pompes déclinées (pieds surélevés)", "muscu", ["pectoraux", "epaules", "triceps"], PDC, "intermediaire", 4.5, "Pieds sur un banc, regard légèrement devant les mains.", "Tête qui plonge vers le sol.")
x("pompes-diamant", "Pompes diamant", "muscu", ["triceps", "pectoraux"], PDC, "intermediaire", 4.3, "Mains en losange sous la poitrine, coudes près du corps.", "Écarter les coudes, amplitude réduite.")
x("pompes-larges", "Pompes prise large", "muscu", ["pectoraux"], PDC, "intermediaire", 4.0, "Mains plus larges que les épaules, descente contrôlée.", "Rebondir en bas du mouvement.")
x("pompes-archer", "Pompes archer", "muscu", ["pectoraux", "triceps"], PDC, "avance", 5.0, "Un bras fléchit, l'autre reste tendu de côté, bascule lente.", "Épaules qui remontent vers les oreilles.")
x("pompes-claquees", "Pompes claquées", "muscu", ["pectoraux", "triceps"], PDC, "avance", 6.5, "Pousser explosif, claquer les mains, réception amortie.", "Atterrir bras tendus, poignets rigides.")
x("dc-barre", "Développé couché à la barre", "muscu", ["pectoraux", "triceps", "epaules"], B, "intermediaire", 5.0, "Omoplates serrées, pieds ancrés, barre au niveau des mamelons.", "Rebond sur la poitrine, fesses décollées du banc.")
x("dc-halteres", "Développé couché haltères", "muscu", ["pectoraux", "triceps"], H + ["banc"], "debutant", 5.0, "Descente profonde et contrôlée, poussée en léger arc de cercle.", "Haltères qui s'entrechoquent brutalement en haut.")
x("di-barre", "Développé incliné à la barre", "muscu", ["pectoraux", "epaules"], B, "intermediaire", 5.0, "Banc à 30°, barre vers le haut des pectoraux.", "Incliner trop le banc : les épaules prennent tout.")
x("di-halteres", "Développé incliné haltères", "muscu", ["pectoraux", "epaules"], H + ["banc"], "intermediaire", 5.0, "Coudes sous les poignets, trajectoire vers le menton.", "Cambrer exagérément le bas du dos.")
x("ecarte-halteres", "Écarté couché haltères", "muscu", ["pectoraux"], H + ["banc"], "intermediaire", 3.8, "Coudes légèrement fléchis et figés, grand arc de cercle.", "Transformer l'écarté en développé en pliant les coudes.")
x("ecarte-poulie", "Écarté à la poulie vis-à-vis", "muscu", ["pectoraux"], M, "intermediaire", 3.8, "Buste penché, mains qui se rejoignent devant le sternum.", "Épaules enroulées vers l'avant.")
x("pec-deck", "Butterfly (pec deck)", "muscu", ["pectoraux"], M, "debutant", 3.5, "Dos plaqué, serrer 1 s en fin de contraction.", "Charger trop et écourter l'amplitude.")
x("dips-pecs", "Dips buste penché", "muscu", ["pectoraux", "triceps"], PDC, "avance", 5.0, "Buste incliné vers l'avant, descente coudes à 90°.", "Descendre trop bas et forcer sur l'épaule.")

# --- Dos ---------------------------------------------------------------------
x("tractions", "Tractions pronation", "muscu", ["dos", "biceps"], ["barre_fixe"], "avance", 8.0, "Départ bras tendus, tirer les coudes vers les poches.", "Demi-répétitions et balancement des jambes.")
x("tractions-supination", "Tractions supination (chin-up)", "muscu", ["dos", "biceps"], ["barre_fixe"], "intermediaire", 8.0, "Paumes vers soi, poitrine vers la barre.", "S'aider d'un coup de rein.")
x("tractions-neutre", "Tractions prise neutre", "muscu", ["dos", "biceps"], ["barre_fixe"], "intermediaire", 8.0, "Paumes face à face, épaules basses.", "Cou tendu vers la barre au lieu de tirer le dos.")
x("tractions-elastique", "Tractions assistées à l'élastique", "muscu", ["dos", "biceps"], ["barre_fixe", "elastiques"], "debutant", 6.0, "Élastique sous les pieds ou genoux, amplitude complète.", "Élastique trop fort : le dos ne travaille plus.")
x("rowing-australien", "Rowing australien (traction horizontale)", "muscu", ["dos", "biceps"], ["barre_fixe"], "debutant", 4.5, "Corps gainé sous la barre, poitrine vers la barre.", "Hanches qui traînent vers le sol.")
x("rowing-barre", "Rowing barre buste penché", "muscu", ["dos", "lombaires"], ["barre"], "intermediaire", 5.5, "Buste à 45°, dos plat, barre vers le nombril.", "Arrondir le bas du dos.")
x("rowing-haltere", "Rowing haltère unilatéral", "muscu", ["dos"], H + ["banc"], "debutant", 5.0, "Main et genou sur le banc, tirer le coude vers la hanche.", "Rotation du buste pour monter plus lourd.")
x("rowing-elastique", "Rowing élastique assis", "muscu", ["dos", "biceps"], EL, "debutant", 4.0, "Dos droit, tirer vers le ventre en serrant les omoplates.", "Épaules qui remontent pendant le tirage.")
x("tirage-vertical", "Tirage vertical machine", "muscu", ["dos", "biceps"], M, "debutant", 4.5, "Barre vers le haut de la poitrine, buste quasi vertical.", "Tirer derrière la nuque.")
x("tirage-horizontal", "Tirage horizontal poulie", "muscu", ["dos"], M, "debutant", 4.5, "Genoux souples, tirer coudes le long du corps.", "Balancier du buste à chaque répétition.")
x("pull-over", "Pull-over haltère", "muscu", ["dos", "pectoraux"], H + ["banc"], "intermediaire", 4.0, "Bras quasi tendus, grand étirement derrière la tête.", "Casser les coudes et en faire un extension triceps.")
x("face-pull", "Face pull poulie ou élastique", "muscu", ["epaules", "dos", "trapezes"], EL, "debutant", 3.5, "Tirer la corde vers le visage, coudes hauts, rotation externe.", "Charger trop et tirer vers la poitrine.")
x("shrugs", "Shrugs haltères", "muscu", ["trapezes"], H, "debutant", 3.5, "Hausser les épaules vers les oreilles, pause en haut.", "Rouler les épaules en cercle.")
x("good-morning", "Good morning barre", "muscu", ["ischios", "lombaires", "fessiers"], ["barre"], "avance", 4.5, "Hanches vers l'arrière, dos verrouillé, genoux souples.", "Arrondir le dos ou descendre trop bas.")
x("superman", "Superman au sol", "muscu", ["lombaires", "fessiers"], PDC, "debutant", 2.8, "Allongé sur le ventre, lever bras et jambes ensemble, 2 s.", "Hyper-extension violente de la nuque.")
x("oiseau", "Oiseau (élévations buste penché)", "muscu", ["epaules", "dos"], H, "intermediaire", 3.8, "Buste penché, monter les bras en croix, coudes souples.", "Se redresser et tricher avec l'élan.")
x("rowing-trx", "Rowing inversé TRX", "muscu", ["dos", "biceps", "abdos"], ["trx"], "debutant", 4.5, "Corps rigide, tirer la poitrine vers les poignées.", "Casser la hanche à la montée.")
x("souleve-terre", "Soulevé de terre", "muscu", ["ischios", "fessiers", "lombaires", "dos"], ["barre"], "avance", 6.0, "Barre collée aux tibias, dos plat, pousser le sol.", "Dos rond et barre loin du corps.")
x("souleve-terre-halteres", "Soulevé de terre haltères", "muscu", ["ischios", "fessiers", "lombaires"], H, "debutant", 5.5, "Haltères le long des jambes, hanches vers l'arrière.", "Plier les genoux avant les hanches.")

# --- Épaules -----------------------------------------------------------------
x("developpe-militaire", "Développé militaire barre", "muscu", ["epaules", "triceps"], ["barre"], "intermediaire", 5.0, "Gainage fort, barre au-dessus de la tête, coudes verrouillés.", "Cambrer le dos pour finir la répétition.")
x("developpe-halteres-assis", "Développé épaules haltères assis", "muscu", ["epaules", "triceps"], H + ["banc"], "debutant", 4.8, "Dos contre le dossier, poussée verticale symétrique.", "Descendre trop bas et stresser l'épaule.")
x("arnold-press", "Arnold press", "muscu", ["epaules"], H, "intermediaire", 4.8, "Rotation des paumes pendant la montée.", "Rotation précipitée sans contrôle.")
x("elevations-laterales", "Élévations latérales haltères", "muscu", ["epaules"], H, "debutant", 3.5, "Monter à hauteur d'épaules, petit doigt vers le haut.", "Balancer le buste ou monter trop haut.")
x("elevations-laterales-elastique", "Élévations latérales à l'élastique", "muscu", ["epaules"], EL, "debutant", 3.3, "Tension continue, montée lente.", "Épaules crispées vers les oreilles.")
x("elevations-frontales", "Élévations frontales", "muscu", ["epaules"], H, "debutant", 3.5, "Bras alternés jusqu'à l'horizontale.", "Prendre de l'élan avec le dos.")
x("pike-pushup", "Pompes piquées (pike push-up)", "muscu", ["epaules", "triceps"], PDC, "intermediaire", 4.8, "Hanches hautes en V inversé, tête vers le sol entre les mains.", "Transformer le mouvement en pompe classique.")
x("handstand-pushup", "Pompes en équilibre au mur", "muscu", ["epaules", "triceps"], PDC, "avance", 6.5, "Talons au mur, descente contrôlée jusqu'au sommet du crâne.", "Perdre le gainage et cambrer.")
x("tirage-menton", "Tirage menton prise large", "muscu", ["epaules", "trapezes"], ["barre"], "intermediaire", 4.0, "Prise large, coudes qui guident vers le haut.", "Prise serrée et poignets cassés.")
x("rotations-externes", "Rotations externes élastique", "muscu", ["epaules"], EL, "debutant", 2.8, "Coude collé au corps, rotation lente vers l'extérieur.", "Écarter le coude du buste.")
x("developpe-elastique", "Développé épaules élastique", "muscu", ["epaules", "triceps"], EL, "debutant", 4.0, "Élastique sous les pieds, poussée verticale.", "Pousser devant soi au lieu d'au-dessus.")
x("marche-fermier", "Marche du fermier", "fonctionnel", ["trapezes", "avant_bras", "abdos", "corps_entier"], H, "debutant", 5.5, "Charges lourdes le long du corps, marche droite et gainée.", "Se pencher d'un côté.")

# --- Biceps ------------------------------------------------------------------
x("curl-barre", "Curl biceps barre", "muscu", ["biceps"], ["barre"], "debutant", 3.5, "Coudes collés au buste, montée sans élan.", "Balancier du buste, coudes qui avancent.")
x("curl-halteres", "Curl biceps haltères", "muscu", ["biceps"], H, "debutant", 3.5, "Supination complète, descente lente.", "Écourter la descente.")
x("curl-marteau", "Curl marteau", "muscu", ["biceps", "avant_bras"], H, "debutant", 3.5, "Paumes face à face du début à la fin.", "Poignets qui cassent vers l'arrière.")
x("curl-concentration", "Curl concentration", "muscu", ["biceps"], H, "intermediaire", 3.3, "Coude calé contre la cuisse, contraction maximale.", "Aider avec l'épaule.")
x("curl-elastique", "Curl biceps élastique", "muscu", ["biceps"], EL, "debutant", 3.3, "Pieds sur l'élastique, tension constante.", "Relâcher d'un coup en bas.")
x("curl-incline", "Curl incliné haltères", "muscu", ["biceps"], H + ["banc"], "intermediaire", 3.5, "Banc à 45°, bras qui pendent, grand étirement.", "Épaules qui avancent pour aider.")
x("curl-21", "Curl 21 (partiels + complets)", "muscu", ["biceps"], ["barre"], "avance", 4.0, "7 bas + 7 hauts + 7 complets sans pause.", "Charger comme un curl classique.")

# --- Triceps -----------------------------------------------------------------
x("dips-banc", "Dips entre banc", "muscu", ["triceps", "epaules"], ["banc"], "debutant", 4.0, "Mains au bord du banc, descente coudes vers l'arrière.", "Épaules qui remontent, coudes qui s'écartent.")
x("barre-front", "Barre au front", "muscu", ["triceps"], B, "intermediaire", 3.8, "Coudes fixes pointés au plafond, barre vers le front.", "Coudes qui s'écartent à la descente.")
x("extension-nuque", "Extension triceps nuque haltère", "muscu", ["triceps"], H, "debutant", 3.5, "Haltère à deux mains derrière la tête, coudes serrés.", "Cambrer pour compenser.")
x("extension-elastique", "Extension triceps élastique", "muscu", ["triceps"], EL, "debutant", 3.3, "Élastique fixé en haut, extension coudes collés.", "Bouger les épaules pendant l'extension.")
x("kickback", "Kickback triceps", "muscu", ["triceps"], H, "debutant", 3.3, "Buste penché, bras parallèle au sol, extension complète.", "Coude qui tombe vers le sol.")
x("extension-corde", "Extension triceps à la corde", "muscu", ["triceps"], M, "debutant", 3.5, "Écarter la corde en bas du mouvement.", "Se pencher sur la charge.")
x("pompes-serrees", "Pompes prise serrée", "muscu", ["triceps", "pectoraux"], PDC, "intermediaire", 4.3, "Mains sous les épaules, coudes qui frôlent les côtes.", "Coudes qui partent en dehors.")

# --- Quadriceps / jambes -----------------------------------------------------
x("squat", "Squat au poids du corps", "muscu", ["quadriceps", "fessiers"], PDC, "debutant", 5.0, "Pieds largeur d'épaules, hanches sous les genoux, buste fier.", "Talons qui décollent, genoux qui rentrent.")
x("squat-gobelet", "Squat gobelet (goblet)", "muscu", ["quadriceps", "fessiers", "abdos"], H, "debutant", 5.0, "Haltère contre la poitrine, coudes entre les genoux en bas.", "Buste qui s'effondre vers l'avant.")
x("squat-barre", "Squat barre arrière", "muscu", ["quadriceps", "fessiers", "lombaires"], ["barre"], "intermediaire", 6.0, "Barre sur trapèzes, descente sous la parallèle si mobilité.", "Genoux qui rentrent en poussant.")
x("front-squat", "Front squat", "muscu", ["quadriceps", "abdos"], ["barre"], "avance", 6.0, "Barre sur les clavicules, coudes hauts, buste vertical.", "Coudes qui tombent, dos qui s'arrondit.")
x("squat-sumo", "Squat sumo", "muscu", ["quadriceps", "fessiers", "ischios"], H, "debutant", 5.0, "Pieds larges pointés vers l'extérieur, genoux qui suivent.", "Genoux vers l'intérieur.")
x("fente-avant", "Fentes avant", "muscu", ["quadriceps", "fessiers"], PDC, "debutant", 5.0, "Grand pas, genou arrière qui frôle le sol.", "Genou avant qui dépasse loin des orteils.")
x("fente-arriere", "Fentes arrière", "muscu", ["quadriceps", "fessiers"], PDC, "debutant", 5.0, "Pas en arrière, poids sur la jambe avant.", "Buste qui penche de côté.")
x("fentes-marchees", "Fentes marchées haltères", "muscu", ["quadriceps", "fessiers"], H, "intermediaire", 5.5, "Enchaîner les pas en gardant le buste haut.", "Petits pas qui surchargent les genoux.")
x("fente-bulgare", "Fentes bulgares", "muscu", ["quadriceps", "fessiers"], PDC + ["banc"], "intermediaire", 5.5, "Pied arrière sur le banc, descente verticale.", "S'appuyer trop sur le pied arrière.")
x("presse", "Presse à cuisses", "muscu", ["quadriceps", "fessiers"], M, "debutant", 5.0, "Pieds largeur d'épaules, amplitude sans décoller le bassin.", "Verrouiller brutalement les genoux.")
x("leg-extension", "Leg extension", "muscu", ["quadriceps"], M, "debutant", 3.5, "Extension contrôlée, pause en haut.", "Donner des coups de pied à la machine.")
x("step-up", "Montées sur banc (step-up)", "muscu", ["quadriceps", "fessiers"], PDC + ["banc"], "debutant", 5.5, "Pousser sur le talon de la jambe haute.", "S'aider en sautant de la jambe basse.")
x("squat-saute", "Squats sautés", "fonctionnel", ["quadriceps", "fessiers", "cardio"], PDC, "intermediaire", 8.0, "Réception amortie en squat, enchaînement fluide.", "Atterrir jambes tendues.")
x("wall-sit", "Chaise contre le mur", "muscu", ["quadriceps"], PDC, "debutant", 4.0, "Cuisses parallèles au sol, dos plaqué, respirer.", "Mains sur les cuisses.")
x("pistol-squat", "Pistol squat", "muscu", ["quadriceps", "fessiers", "abdos"], PDC, "avance", 6.5, "Une jambe tendue devant, descente lente et contrôlée.", "S'écrouler en bas du mouvement.")

# --- Ischios / fessiers ------------------------------------------------------
x("sdt-roumain", "Soulevé de terre roumain barre", "muscu", ["ischios", "fessiers", "lombaires"], ["barre"], "intermediaire", 5.0, "Jambes quasi tendues, barre qui glisse sur les cuisses.", "Arrondir le dos en bas.")
x("sdt-roumain-halteres", "Soulevé de terre roumain haltères", "muscu", ["ischios", "fessiers"], H, "debutant", 4.8, "Hanches en arrière, étirement des ischios puis remontée.", "Plier les genoux comme un squat.")
x("hip-thrust", "Hip thrust barre", "muscu", ["fessiers", "ischios"], ["barre", "banc"], "intermediaire", 5.0, "Dos sur le banc, extension complète des hanches, pause.", "Hyper-extension lombaire en haut.")
x("pont-fessier", "Pont fessier au sol", "muscu", ["fessiers", "ischios"], PDC, "debutant", 3.5, "Talons proches des fesses, serrer fort en haut 2 s.", "Pousser avec le bas du dos.")
x("pont-fessier-unilateral", "Pont fessier une jambe", "muscu", ["fessiers", "ischios"], PDC, "intermediaire", 4.0, "Une jambe tendue, hanches qui restent alignées.", "Bassin qui bascule d'un côté.")
x("leg-curl", "Leg curl machine", "muscu", ["ischios"], M, "debutant", 3.5, "Flexion complète, retour freiné.", "Décoller les hanches du siège.")
x("leg-curl-ballon", "Leg curl au swiss ball", "muscu", ["ischios", "fessiers", "abdos"], ["swiss_ball"], "intermediaire", 4.0, "Hanches hautes, ramener le ballon avec les talons.", "Laisser tomber les hanches.")
x("kickback-fessier", "Kickback fessier élastique", "muscu", ["fessiers"], EL, "debutant", 3.3, "À quatre pattes, pousser le talon vers l'arrière-haut.", "Cambrer pour monter plus haut.")
x("abduction-elastique", "Abductions élastique (clamshell)", "muscu", ["fessiers"], EL, "debutant", 3.0, "Élastique au-dessus des genoux, ouvrir contre la tension.", "Basculer le bassin en arrière.")
x("hyperextension", "Extensions lombaires au banc", "muscu", ["lombaires", "fessiers", "ischios"], ["banc"], "debutant", 3.8, "Monter jusqu'à l'alignement, pas au-delà.", "Monter en hyper-extension violente.")
x("nordic-curl", "Nordic curl", "muscu", ["ischios"], PDC, "avance", 5.5, "Chevilles bloquées, descente la plus lente possible.", "Casser la hanche pour tricher.")
x("donkey-kicks", "Donkey kicks", "muscu", ["fessiers"], PDC, "debutant", 3.0, "Genou plié à 90°, pousser la semelle vers le plafond.", "Vitesse sans contraction.")

# --- Mollets -----------------------------------------------------------------
x("mollets-debout", "Extensions mollets debout", "muscu", ["mollets"], PDC, "debutant", 3.0, "Amplitude maximale, pause d'une seconde en haut.", "Rebondir sans contrôle.")
x("mollets-unijambiste", "Extensions mollets une jambe", "muscu", ["mollets"], PDC, "intermediaire", 3.3, "Sur une marche, talon qui descend sous le niveau.", "S'aider en tirant sur la rampe.")
x("mollets-assis", "Extensions mollets assis machine", "muscu", ["mollets"], M, "debutant", 3.0, "Charge sur les genoux, extension lente.", "Amplitudes minuscules.")

# --- Abdos / core ------------------------------------------------------------
x("planche", "Planche (gainage)", "muscu", ["abdos", "lombaires"], PDC, "debutant", 3.3, "Coudes sous les épaules, corps en ligne, nombril rentré.", "Fesses trop hautes ou hanches qui coulent.")
x("planche-laterale", "Planche latérale", "muscu", ["abdos"], PDC, "intermediaire", 3.5, "Coude sous l'épaule, hanches hautes, corps aligné.", "Hanche qui s'affaisse.")
x("crunch", "Crunch", "muscu", ["abdos"], PDC, "debutant", 3.0, "Décoller les omoplates, souffler en montant.", "Tirer sur la nuque avec les mains.")
x("releve-jambes", "Relevés de jambes allongé", "muscu", ["abdos"], PDC, "intermediaire", 3.8, "Bas du dos plaqué au sol, jambes contrôlées.", "Cambrer quand les jambes descendent.")
x("mountain-climbers", "Mountain climbers", "fonctionnel", ["abdos", "cardio"], PDC, "debutant", 8.0, "Position pompe, genoux vers la poitrine en rythme.", "Hanches qui remontent en pic.")
x("russian-twist", "Russian twist", "muscu", ["abdos"], PDC, "intermediaire", 4.0, "Buste incliné, rotation des épaules, pas seulement des bras.", "Dos rond et gestes précipités.")
x("dead-bug", "Dead bug", "muscu", ["abdos"], PDC, "debutant", 3.0, "Bas du dos collé au sol, bras et jambe opposés.", "Perdre le contact lombaire-sol.")
x("bird-dog", "Bird dog", "muscu", ["abdos", "lombaires"], PDC, "debutant", 3.0, "Bras et jambe opposés tendus, bassin stable.", "Tourner les hanches.")
x("hollow-hold", "Hollow hold", "muscu", ["abdos"], PDC, "avance", 4.0, "Lombaires plaqués, bras et jambes tendus décollés.", "Cambrer sous la fatigue.")
x("roulette-abdos", "Roulette à abdos (ab wheel)", "muscu", ["abdos", "lombaires"], ["roulette"], "avance", 4.5, "Rouler loin sans cambrer, revenir avec les abdos.", "Casser la hanche et tirer avec les bras.")
x("v-ups", "V-ups", "muscu", ["abdos"], PDC, "avance", 4.3, "Bras et jambes qui se rejoignent au-dessus des hanches.", "Élan des bras et dos qui claque au sol.")
x("pallof-press", "Pallof press élastique", "muscu", ["abdos"], EL, "intermediaire", 3.3, "Résister à la rotation, bras tendus devant le sternum.", "Laisser le buste tourner.")
x("side-bend", "Flexions latérales haltère", "muscu", ["abdos"], H, "debutant", 3.0, "Glisser l'haltère le long de la cuisse, remonter par l'oblique.", "Se pencher vers l'avant.")
x("toes-to-bar", "Toes to bar", "muscu", ["abdos", "avant_bras"], ["barre_fixe"], "avance", 6.0, "Suspendu, monter les pointes vers la barre en contrôlant.", "Balancement incontrôlé (kipping subi).")

# --- Cardio ------------------------------------------------------------------
x("marche", "Marche rapide", "cardio", ["cardio"], [], "debutant", 4.3, "Allure soutenue, bras qui accompagnent.", "Flâner en regardant son téléphone.")
x("marche-nordique", "Marche nordique", "cardio", ["cardio", "corps_entier"], ["batons"], "debutant", 5.5, "Pousser sur les bâtons, grandes foulées.", "Bâtons décoratifs qui ne poussent pas.")
x("course-lente", "Course à pied — footing", "cardio", ["cardio"], [], "debutant", 8.3, "Allure où l'on peut parler, foulée légère.", "Partir trop vite et s'arrêter à mi-chemin.")
x("course-moderee", "Course à pied — allure modérée", "cardio", ["cardio"], [], "intermediaire", 9.8, "Rythme régulier, respiration en cadence.", "Foulée trop longue devant le corps.")
x("course-rapide", "Course à pied — allure rapide", "cardio", ["cardio"], [], "avance", 11.5, "Fréquence de pas élevée, buste haut.", "Épaules crispées.")
x("fractionne", "Fractionné 30/30", "cardio", ["cardio"], [], "avance", 11.0, "30 s vite / 30 s lent, régularité des intervalles.", "Sprint trop violent dès le premier intervalle.")
x("sprint", "Sprints courts", "cardio", ["cardio", "quadriceps"], [], "avance", 12.0, "Échauffement complet avant, récupération marchée.", "Sprinter à froid.")
x("velo", "Vélo — allure modérée", "cardio", ["cardio", "quadriceps"], ["velo"], "debutant", 6.8, "Cadence 80-90 tr/min, selle à hauteur de hanche.", "Selle trop basse, genoux qui souffrent.")
x("velo-intense", "Vélo — allure soutenue", "cardio", ["cardio", "quadriceps"], ["velo"], "intermediaire", 8.5, "Rester en aisance respiratoire relative.", "Mouliner dans le vide en descente.")
x("elliptique", "Vélo elliptique", "cardio", ["cardio", "corps_entier"], M, "debutant", 5.0, "Pousser ET tirer avec les bras.", "S'affaler sur les poignées.")
x("rameur", "Rameur", "cardio", ["cardio", "dos", "quadriceps"], ["rameur"], "intermediaire", 7.0, "Jambes-buste-bras à l'aller, bras-buste-jambes au retour.", "Tirer avec les bras avant de pousser les jambes.")
x("corde-a-sauter", "Corde à sauter", "cardio", ["cardio", "mollets"], ["corde_a_sauter"], "intermediaire", 11.0, "Petits sauts sur l'avant-pied, poignets qui tournent.", "Sauter trop haut et talonner.")
x("natation", "Natation — allure modérée", "cardio", ["cardio", "corps_entier"], [], "intermediaire", 5.8, "Expiration complète dans l'eau, allonger la glisse.", "Tête trop haute qui coule les jambes.")
x("natation-rapide", "Natation — allure rapide", "cardio", ["cardio", "corps_entier"], [], "avance", 9.8, "Appuis fermes, gainage constant.", "Cadence sans amplitude.")
x("escaliers", "Montées d'escaliers", "cardio", ["cardio", "quadriceps", "fessiers"], [], "debutant", 8.8, "Pousser sur tout le pied, buste légèrement penché.", "Se tracter sur la rampe.")
x("randonnee", "Randonnée", "cardio", ["cardio", "quadriceps"], [], "debutant", 6.0, "Rythme régulier, hydratation.", "Sous-estimer le dénivelé du retour.")
x("football", "Football entre amis", "cardio", ["cardio", "corps_entier"], [], "intermediaire", 8.0, "Échauffement avant le match du dimanche.", "Tacler comme en finale de coupe du monde.")
x("basket", "Basket", "cardio", ["cardio", "corps_entier"], [], "intermediaire", 7.5, "Appuis dynamiques, jeu continu.", "Jouer uniquement en demi-terrain statique.")
x("tennis", "Tennis / padel", "cardio", ["cardio", "corps_entier"], [], "intermediaire", 7.3, "Jeu de jambes constant entre les frappes.", "Rester planté après sa frappe.")
x("danse", "Danse", "cardio", ["cardio", "corps_entier"], [], "debutant", 5.5, "S'amuser, c'est le meilleur cardio.", "Se retenir : personne ne regarde.")
x("hiit", "HIIT sans matériel", "cardio", ["cardio", "corps_entier"], PDC, "avance", 10.0, "40 s d'effort / 20 s de repos, technique avant vitesse.", "Sacrifier la technique à l'intensité.")

# --- Fonctionnel -------------------------------------------------------------
x("burpees", "Burpees", "fonctionnel", ["corps_entier", "cardio"], PDC, "intermediaire", 9.8, "Pompe, saut groupé, extension complète en haut.", "Dos rond en posant les mains.")
x("kb-swing", "Kettlebell swing", "fonctionnel", ["fessiers", "ischios", "corps_entier"], KB, "intermediaire", 9.5, "Hanches qui claquent, bras relâchés, kettlebell à hauteur d'yeux max.", "Squatter au lieu d'ouvrir les hanches.")
x("goblet-clean", "Goblet clean kettlebell", "fonctionnel", ["corps_entier"], KB, "intermediaire", 6.5, "Amener la kettlebell contre la poitrine d'un geste fluide.", "La faire claquer sur l'avant-bras.")
x("thruster", "Thruster haltères", "fonctionnel", ["quadriceps", "epaules", "corps_entier"], H, "avance", 8.0, "Squat puis poussée verticale dans le même élan.", "Séparer les deux mouvements et perdre l'élan.")
x("clean-press", "Clean & press haltères", "fonctionnel", ["corps_entier", "epaules"], H, "avance", 8.0, "Tirage explosif, réception souple, poussée verrouillée.", "Tirer uniquement avec les bras.")
x("box-jump", "Box jump", "fonctionnel", ["quadriceps", "fessiers", "cardio"], ["banc"], "intermediaire", 8.0, "Réception souple en squat sur la boîte, redescendre en marchant.", "Sauter en bas de la boîte à répétition.")
x("jumping-jacks", "Jumping jacks", "fonctionnel", ["cardio", "corps_entier"], PDC, "debutant", 7.7, "Rythme régulier, bras au-dessus de la tête.", "Amplitude de bras réduite.")
x("bear-crawl", "Marche de l'ours", "fonctionnel", ["corps_entier", "abdos"], PDC, "intermediaire", 6.0, "Genoux à 2 cm du sol, dos plat, pas opposés.", "Fesses hautes qui se dandinent.")
x("turkish-getup", "Turkish get-up", "fonctionnel", ["corps_entier", "abdos", "epaules"], KB, "avance", 5.5, "Regard sur la charge, étapes décomposées.", "Précipiter les transitions.")
x("wall-ball", "Wall ball", "fonctionnel", ["quadriceps", "epaules", "cardio"], ["medecine_ball"], "intermediaire", 8.0, "Squat complet puis lancer haut, réception dans le squat suivant.", "Lancer bras seuls sans les jambes.")
x("slam-ball", "Medecine ball slam", "fonctionnel", ["corps_entier", "abdos"], ["medecine_ball"], "intermediaire", 8.0, "Extension complète puis abattre la balle avec tout le corps.", "Plier seulement le dos pour ramasser.")
x("battle-rope", "Battle ropes", "fonctionnel", ["epaules", "cardio", "abdos"], ["corde_ondulatoire"], "intermediaire", 8.0, "Vagues régulières, genoux fléchis, gainage.", "Bloquer la respiration.")
x("sprawl", "Sprawl", "fonctionnel", ["corps_entier", "cardio"], PDC, "intermediaire", 8.5, "Burpee sans pompe, hanches au sol puis retour explosif.", "Se réceptionner bras tendus.")
x("kb-goblet-squat", "Squat gobelet kettlebell", "fonctionnel", ["quadriceps", "fessiers"], KB, "debutant", 5.0, "Kettlebell contre le sternum, coudes vers le bas.", "Laisser la charge tirer le buste en avant.")
x("halteres-pousse-tire", "Renegade row (pompe + rowing)", "fonctionnel", ["dos", "pectoraux", "abdos"], H, "avance", 7.0, "Pompe sur haltères puis rowing alterné, hanches immobiles.", "Rotation du bassin à chaque tirage.")

# --- Mobilité / étirements ---------------------------------------------------
x("etirement-ischios", "Étirement ischios debout", "mobilite", ["ischios"], PDC, "debutant", 2.3, "Jambe tendue sur support, bascule du bassin vers l'avant.", "Arrondir le dos pour toucher le pied.")
x("etirement-quadriceps", "Étirement quadriceps debout", "mobilite", ["quadriceps"], PDC, "debutant", 2.3, "Talon vers la fesse, genoux collés, bassin rétroversé.", "Cambrer et écarter le genou.")
x("pigeon", "Posture du pigeon", "mobilite", ["fessiers"], PDC, "intermediaire", 2.5, "Tibia avant posé, hanches face au sol, respirer 5 cycles.", "Forcer sur un genou douloureux.")
x("chat-vache", "Chat-vache", "mobilite", ["lombaires", "dos"], PDC, "debutant", 2.3, "Alterner dos rond et dos creux au rythme du souffle.", "Bouger vite sans respirer.")
x("cobra", "Posture du cobra", "mobilite", ["abdos", "lombaires"], PDC, "debutant", 2.3, "Pousser doucement sur les mains, épaules loin des oreilles.", "Verrouiller les coudes d'un coup.")
x("posture-enfant", "Posture de l'enfant", "mobilite", ["dos", "lombaires"], PDC, "debutant", 2.0, "Fesses vers les talons, bras relâchés devant.", "Retenir sa respiration.")
x("90-90", "Ouverture de hanches 90/90", "mobilite", ["fessiers"], PDC, "intermediaire", 2.5, "Deux genoux à 90°, buste droit, bascule d'un côté à l'autre.", "Compenser en penchant le buste.")
x("etirement-pectoraux", "Étirement pectoraux à la porte", "mobilite", ["pectoraux", "epaules"], PDC, "debutant", 2.3, "Avant-bras sur le cadre, avancer un pied, ouvrir la poitrine.", "Épaule qui remonte vers l'oreille.")
x("etirement-epaules", "Étirement épaule croisée", "mobilite", ["epaules"], PDC, "debutant", 2.0, "Bras tiré devant la poitrine, épaule basse.", "Tirer sur le coude au lieu du bras.")
x("rotation-thoracique", "Rotations thoraciques au sol", "mobilite", ["dos"], PDC, "debutant", 2.5, "À quatre pattes, main derrière la tête, ouvrir vers le plafond.", "Tourner avec les lombaires.")
x("cercles-bras", "Cercles de bras", "mobilite", ["epaules"], PDC, "debutant", 2.5, "Grands cercles lents dans les deux sens.", "Petits cercles précipités.")
x("salutation-soleil", "Salutation au soleil", "mobilite", ["corps_entier"], PDC, "intermediaire", 3.0, "Enchaînement fluide calé sur la respiration.", "Sauter des étapes pour aller vite.")
x("mobilite-chevilles", "Mobilité chevilles au mur", "mobilite", ["mollets"], PDC, "debutant", 2.3, "Genou vers le mur sans décoller le talon.", "Talon qui se soulève.")
x("worlds-greatest", "World's greatest stretch", "mobilite", ["corps_entier"], PDC, "intermediaire", 3.0, "Fente profonde, coude au sol, rotation vers le ciel.", "Genou arrière qui traîne par terre.")
x("foam-rolling-dos", "Auto-massage rouleau — dos", "mobilite", ["dos"], ["rouleau"], "debutant", 2.3, "Rouler lentement du milieu du dos aux trapèzes.", "Rouler sur les lombaires.")
x("foam-rolling-jambes", "Auto-massage rouleau — jambes", "mobilite", ["quadriceps", "ischios", "mollets"], ["rouleau"], "debutant", 2.3, "Insister 20-30 s sur les points sensibles.", "Passer trop vite sur les zones tendues.")
x("etirement-hanches", "Étirement fléchisseurs de hanche", "mobilite", ["quadriceps", "fessiers"], PDC, "debutant", 2.3, "Fente au sol, pousser la hanche arrière vers l'avant.", "Cambrer au lieu d'avancer la hanche.")

# --- Variantes élastiques / machine complémentaires --------------------------
x("developpe-couche-elastique", "Développé couché élastique au sol", "muscu", ["pectoraux", "triceps"], EL, "debutant", 4.0, "Élastique sous le dos, poussée vers le plafond.", "Poignets cassés vers l'arrière.")
x("tirage-vertical-elastique", "Tirage vertical élastique", "muscu", ["dos"], EL, "debutant", 4.0, "Élastique fixé en hauteur, tirer vers la poitrine.", "Se pencher en arrière pour tricher.")
x("squat-elastique", "Squat avec élastique", "muscu", ["quadriceps", "fessiers"], EL, "debutant", 5.0, "Élastique sous les pieds et sur les épaules.", "Laisser l'élastique rentrer les genoux.")
x("souleve-terre-elastique", "Soulevé de terre élastique", "muscu", ["ischios", "fessiers"], EL, "debutant", 4.5, "Tension maximale en haut, hanches verrouillées.", "Arrondir le dos au départ.")
x("pompes-lestees-elastique", "Pompes résistées à l'élastique", "muscu", ["pectoraux", "triceps"], EL, "avance", 5.0, "Élastique dans le dos tenu sous les mains.", "Perdre le gainage sous la résistance.")
x("crunch-machine", "Crunch à la machine", "muscu", ["abdos"], M, "debutant", 3.3, "Enrouler le buste, souffler en fermant.", "Tirer avec les bras sur les poignées.")
x("machine-adducteurs", "Machine adducteurs", "muscu", ["quadriceps"], M, "debutant", 3.3, "Serrer lentement, retour contrôlé.", "Amplitude forcée douloureuse.")
x("machine-abducteurs", "Machine abducteurs", "muscu", ["fessiers"], M, "debutant", 3.3, "Ouvrir contre la charge, buste stable.", "Se pencher en avant pour pousser plus.")
x("developpe-machine", "Développé pectoraux machine", "muscu", ["pectoraux", "triceps"], M, "debutant", 4.5, "Réglage du siège : poignées à hauteur de poitrine.", "Verrouiller les coudes brutalement.")
x("rowing-machine", "Rowing machine assis", "muscu", ["dos", "biceps"], M, "debutant", 4.5, "Poitrine contre le support, tirer coudes en arrière.", "Épaules enroulées en avant.")
x("developpe-epaules-machine", "Développé épaules machine", "muscu", ["epaules", "triceps"], M, "debutant", 4.5, "Dos plaqué, poussée verticale complète.", "Cambrure exagérée.")
x("gainage-bras-tendus", "Planche bras tendus", "muscu", ["abdos", "epaules"], PDC, "debutant", 3.3, "Mains sous les épaules, pousser le sol loin.", "Creuser entre les omoplates.")
x("planche-epaule-tap", "Planche avec touches d'épaules", "muscu", ["abdos", "epaules"], PDC, "intermediaire", 4.0, "Toucher l'épaule opposée sans bouger les hanches.", "Hanches qui dansent à chaque touche.")
x("marche-talons-pointes", "Marche talons-pointes", "mobilite", ["mollets"], PDC, "debutant", 2.5, "Alterner marche sur talons puis sur pointes.", "Regarder ses pieds en permanence.")
x("montees-genoux", "Montées de genoux sur place", "cardio", ["cardio", "quadriceps"], PDC, "debutant", 8.0, "Genoux à hauteur de hanches, bras dynamiques.", "Se pencher en arrière.")
x("talons-fesses", "Talons-fesses", "cardio", ["cardio", "ischios"], PDC, "debutant", 7.0, "Rythme léger, talons qui frôlent les fesses.", "Buste penché en avant.")
x("pas-chasses", "Pas chassés", "cardio", ["cardio", "quadriceps"], PDC, "debutant", 7.0, "Rester bas sur les appuis, changer de sens.", "Croiser les pieds.")
x("gainage-superman", "Gainage superman dynamique", "muscu", ["lombaires", "fessiers"], PDC, "intermediaire", 3.3, "Alterner bras/jambe opposés en tenant la planche ventrale.", "Précipiter l'alternance.")
x("elevation-jambes-suspendu", "Relevés de genoux suspendu", "muscu", ["abdos", "avant_bras"], ["barre_fixe"], "intermediaire", 5.0, "Suspendu, monter les genoux vers la poitrine sans élan.", "Balancer le corps.")
x("farmers-kb", "Marche du fermier kettlebell unilatérale", "fonctionnel", ["abdos", "trapezes", "avant_bras"], KB, "intermediaire", 5.5, "Une seule charge, buste parfaitement droit.", "Pencher vers la charge.")
x("swing-alterne", "Kettlebell swing à une main", "fonctionnel", ["fessiers", "ischios", "corps_entier"], KB, "avance", 9.5, "Changement de main en haut du swing, épaule engagée.", "Laisser l'épaule partir en avant.")
x("halo-kb", "Halo kettlebell", "mobilite", ["epaules", "abdos"], KB, "debutant", 3.0, "Cercles lents autour de la tête, coudes proches.", "Cercles larges qui tirent sur la nuque.")
x("etirement-triceps", "Étirement triceps derrière la tête", "mobilite", ["triceps"], PDC, "debutant", 2.0, "Coude vers le plafond, main entre les omoplates.", "Pousser trop fort sur le coude.")
x("etirement-avant-bras", "Étirement avant-bras", "mobilite", ["avant_bras"], PDC, "debutant", 2.0, "Bras tendu, tirer doucement les doigts vers soi.", "À-coups sur le poignet.")
x("respiration-carree", "Respiration carrée (récupération)", "mobilite", ["corps_entier"], PDC, "debutant", 1.5, "4 s inspiration, 4 s pause, 4 s expiration, 4 s pause.", "Forcer des volumes inconfortables.")
x("velo-appartement-doux", "Vélo d'appartement — récupération", "cardio", ["cardio"], ["velo"], "debutant", 3.5, "Pédalage léger 15-20 min pour récupérer.", "Transformer la récup en séance.")
x("rameur-doux", "Rameur — allure douce", "cardio", ["cardio", "dos"], ["rameur"], "debutant", 4.8, "Coups longs et lents, technique parfaite.", "Cadence élevée inutile.")
x("tapis-marche-inclinee", "Marche inclinée sur tapis", "cardio", ["cardio", "fessiers", "mollets"], ["tapis_course"], "debutant", 5.3, "Pente 8-12 %, sans se tenir aux poignées.", "S'accrocher aux poignées.")
x("yoga-doux", "Yoga doux", "mobilite", ["corps_entier"], PDC, "debutant", 2.5, "Postures tenues, respiration profonde.", "Comparer sa souplesse aux autres.")
x("pilates", "Pilates au sol", "mobilite", ["abdos", "corps_entier"], PDC, "intermediaire", 3.0, "Centre engagé, mouvements précis et lents.", "Respiration bloquée.")

assert len({e[0] for e in E}) == len(E), "duplicate slugs"


def arr(values):
    inner = ",".join('"' + v + '"' for v in values)
    return "'{" + inner + "}'"


def esc(s):
    return s.replace("'", "''")


rows = []
for slug, name, kind, groups, equip, level, met, cues, mistakes in E:
    rows.append(
        f"('{slug}', '{esc(name)}', '{kind}', {arr(groups)}, {arr(equip)}, "
        f"'{level}', {met}, '{esc(cues)}', '{esc(mistakes)}')"
    )

sql = (
    "-- Exercise library seed (generated by scripts/seed-exercises.py).\n"
    "insert into public.exercises\n"
    "  (slug, name_fr, kind, muscle_groups, equipment, level, met, cues, mistakes)\n"
    "values\n" + ",\n".join(rows) + "\non conflict (slug) do nothing;\n"
)

out = "src/db/seed/exercises/exercises.sql"
import os

os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as fh:
    fh.write(sql)
print(f"{len(E)} exercises -> {out}")
