import json
import math
import re

import pandas as pd

SRC = "./ciqual.xls"
OUT_DIR = "./src/db/seed/foods"

NUTRIENTS = {
    "kcal": "Energie, Règlement UE N° 1169/2011 (kcal/100 g)",
    "protein_g": "Protéines, N x facteur de Jones (g/100 g)",
    "carb_g": "Glucides (g/100 g)",
    "fat_g": "Lipides (g/100 g)",
    "sugars_g": "Sucres (g/100 g)",
    "fiber_g": "Fibres alimentaires (g/100 g)",
    "satfat_g": "AG saturés (g/100 g)",
    "sodium_mg": "Sodium (mg/100 g)",
    "salt_g": "Sel chlorure de sodium (g/100 g)",
}

NON_KOSHER_SEA = ["crevette", "moule", "huître", "huitre", "crabe", "homard", "langoustine",
    "calamar", "calmar", "encornet", "seiche", "poulpe", "pieuvre", "escargot", "bulot",
    "coquille saint-jacques", "saint-jacques", "gambas", "écrevisse", "oursin", "langouste",
    "surimi", "araignée de mer", "palourde", "coque", "amande de mer", "ormeau", "telline"]
NON_KOSHER_MEAT = ["porc", "lard", "bacon", "sanglier", "cheval", "lapin", "lièvre",
    "grenouille", "boudin", "andouille", "rillettes", "chorizo"]
NON_KOSHER_FISH = ["anguille", "esturgeon", "requin", "roussette", "raie", "silure",
    "lamproie", "baudroie", "lotte"]
DEBATED_FISH = ["espadon", "turbot"]
DAIRY_WORDS = ["lait", "crème", "creme", "fromage", "beurre", "yaourt", "emmental",
    "mozzarella", "parmesan", "chèvre", "brebis"]
MEAT_BIRDS = ["dinde", "poulet", "volaille", "canard", "pintade", "poule", "oie", "caille",
    "bœuf", "boeuf", "veau", "agneau", "mouton", "cerf", "biche", "chevreuil"]

HAMETZ_WORDS = ["pain", "baguette", "brioche", "biscotte", "pâtes", "pates ", "blé", "ble ",
    "orge", "seigle", "avoine", "épeautre", "farine", "semoule", "couscous", "boulgour",
    "bière", "biscuit", "croissant", "viennoiserie", "gâteau", "pizza", "quiche", "crêpe",
    "sandwich", "céréales pour petit"]
HAMETZ_EXCL = ["riz", "maïs", "sarrasin", "quinoa", "châtaigne", "pomme de terre", "sans gluten"]
KITNIYOT_WORDS = ["riz", "maïs", "mais doux", "lentille", "pois chiche", "pois cassé",
    "petit pois", "petits pois", "soja", "fève", "feve", "arachide", "cacahuète", "sésame",
    "sesame", "haricot blanc", "haricot rouge", "haricot sec", "flageolet"]


def parse_val(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    s = str(v).strip().lower()
    if s in ("-", "", "nan"):
        return None
    if s == "traces":
        return 0
    s = s.replace("<", "").replace(",", ".").strip()
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def has(name, words):
    return any(re.search(r"\b" + re.escape(w) + r"s?\b", name) for w in words)


def classify(grp, ssgrp, name):
    """Returns (kashrut_class|None, is_fish, hint|None). Indication only, never certification."""
    n = name.lower()
    g = (grp or "").lower()
    sg = (ssgrp or "").lower()

    if has(n, NON_KOSHER_SEA) or "mollusques et crustacés" in sg:
        return None, False, "non casher (fruits de mer)"
    if has(n, NON_KOSHER_MEAT):
        return None, False, "non casher"
    if "jambon" in n and not has(n, ["dinde", "poulet", "volaille"]):
        return None, False, "non casher (porc probable)"

    if "poisson" in sg or "huiles de poissons" in sg or "poisson" in n:
        if has(n, NON_KOSHER_FISH):
            return None, False, "non casher (poisson sans écailles)"
        if has(n, DEBATED_FISH):
            return "parve", True, "selon la communauté : vérifier"
        return "parve", True, None

    if "viandes, œufs, poissons" in g:
        if "œuf" in sg or "oeuf" in sg or n.startswith("œuf") or n.startswith("oeuf"):
            return "parve", False, None
        if "charcuterie" in sg:
            if has(n, MEAT_BIRDS):
                return "bassari", False, "vérifier le hekhsher"
            return None, False, "non casher (porc probable)"
        return "bassari", False, None

    if "produits laitiers" in g:
        if has(n, ["soja", "végétal", "vegetal", "amande", "avoine", "coco"]) and not has(n, ["fromage", "lait de vache", "lait de chèvre", "lait de brebis"]):
            return "parve", False, "vérifier les ingrédients"
        return "halavi", False, None

    if "glaces et sorbets" in g:
        if "sorbet" in n or "sorbets" in sg:
            return "parve", False, None
        return "halavi", False, "souvent halavi : vérifier"

    if "beurres" in sg or "crèmes" in sg:
        return "halavi", False, None
    if "margarines" in sg:
        return "parve", False, "vérifier les ingrédients"

    if "entrées et plats composés" in g:
        if has(n, DAIRY_WORDS):
            return None, False, "plat composé : à vérifier (contient du lait ?)"
        return None, False, "plat composé : à vérifier"

    if "gâteaux et pâtisseries" in sg or "biscuits sucrés" in sg or "viennoiseries" in sg:
        return None, False, "souvent halavi (beurre/lait) : vérifier"

    if "confiseries" in sg:
        return None, False, "vérifier la gélatine"
    if "chocolat" in sg or "chocolat" in n:
        if "lait" in n:
            return "halavi", False, None
        return "parve", False, "vérifier les ingrédients"

    if "aliments infantiles" in g:
        if "lait" in sg or has(n, ["lait", "lacté", "lactée"]):
            return "halavi", False, None
        return None, False, "à vérifier"

    if has(n, ["fromage", "crème", "creme", "yaourt", "beurre"]) and not has(
        n, ["crème de marron", "crème de sésame", "beurre de cacahuète", "beurre de cacao"]
    ):
        return "halavi", False, "vérifier les ingrédients"
    if has(n, ["lait"]) and not has(
        n, ["lait de coco", "lait d'amande", "lait de soja", "lait d'avoine", "lait de riz"]
    ):
        return "halavi", False, "vérifier les ingrédients"

    return "parve", False, None


def flags(name, grp):
    n = name.lower()
    g = (grp or "").lower()
    hametz = False
    if "produits céréaliers" in g and not has(n, HAMETZ_EXCL):
        hametz = True
    elif has(n, HAMETZ_WORDS) and not has(n, HAMETZ_EXCL):
        hametz = True
    kitniyot = has(n, KITNIYOT_WORDS) and "haricot vert" not in n
    return hametz, kitniyot


def esc(s):
    return s.replace("'", "''")


def main():
    import os
    os.makedirs(OUT_DIR, exist_ok=True)
    df = pd.read_excel(SRC)
    df = df[df["alim_code"].notna()]
    df = df.drop_duplicates(subset=["alim_code"], keep="first")
    rows = []
    stats = {"bassari": 0, "halavi": 0, "parve": 0, "unknown": 0, "fish": 0}
    for _, r in df.iterrows():
        name = str(r["alim_nom_fr"]).strip()
        grp = None if pd.isna(r["alim_grp_nom_fr"]) else str(r["alim_grp_nom_fr"])
        ssgrp = None if pd.isna(r["alim_ssgrp_nom_fr"]) else str(r["alim_ssgrp_nom_fr"])
        per = {}
        for key, col in NUTRIENTS.items():
            v = parse_val(r.get(col))
            if v is None and key == "kcal":
                v = parse_val(r.get("Energie, N x facteur Jones, avec fibres  (kcal/100 g)"))
            if v is not None:
                per[key] = v
        cls, is_fish, hint = classify(grp, ssgrp, name)
        hametz, kitniyot = flags(name, grp)
        stats[cls or "unknown"] = stats.get(cls or "unknown", 0) + 1
        if is_fish:
            stats["fish"] += 1
        rows.append(
            "('ciqual','{code}','{name}',{cat},'{per}'::jsonb,{cls},{fish},{hametz},{kitniyot},{hint})".format(
                code=int(r["alim_code"]),
                name=esc(name),
                cat="'" + esc(grp) + "'" if grp else "null",
                per=esc(json.dumps(per, ensure_ascii=False)),
                cls="'" + cls + "'" if cls else "null",
                fish="true" if is_fish else "false",
                hametz="true" if hametz else "false",
                kitniyot="true" if kitniyot else "false",
                hint="'" + esc(hint) + "'" if hint else "null",
            )
        )
    batch_size = 250
    n_batches = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        sql = (
            "insert into public.foods (source, external_id, name_fr, category, per_100g, kashrut_class, is_fish, hametz, kitniyot, kosher_hint)\nvalues\n"
            + ",\n".join(batch)
            + "\non conflict (source, external_id) do update set name_fr = excluded.name_fr, category = excluded.category, per_100g = excluded.per_100g, kashrut_class = excluded.kashrut_class, is_fish = excluded.is_fish, hametz = excluded.hametz, kitniyot = excluded.kitniyot, kosher_hint = excluded.kosher_hint;"
        )
        with open(f"{OUT_DIR}/batch_{n_batches:02d}.sql", "w") as f:
            f.write(sql)
        n_batches += 1
    print(f"{len(rows)} foods, {n_batches} batches, stats: {stats}")


main()
