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


def esc(s):
    return s.replace("'", "''")


def main():
    import os
    os.makedirs(OUT_DIR, exist_ok=True)
    df = pd.read_excel(SRC)
    df = df[df["alim_code"].notna()]
    df = df.drop_duplicates(subset=["alim_code"], keep="first")
    rows = []
    for _, r in df.iterrows():
        name = str(r["alim_nom_fr"]).strip()
        grp = None if pd.isna(r["alim_grp_nom_fr"]) else str(r["alim_grp_nom_fr"])
        per = {}
        for key, col in NUTRIENTS.items():
            v = parse_val(r.get(col))
            if v is None and key == "kcal":
                v = parse_val(r.get("Energie, N x facteur Jones, avec fibres  (kcal/100 g)"))
            if v is not None:
                per[key] = v
        rows.append(
            "('ciqual','{code}','{name}',{cat},'{per}'::jsonb)".format(
                code=int(r["alim_code"]),
                name=esc(name),
                cat="'" + esc(grp) + "'" if grp else "null",
                per=esc(json.dumps(per, ensure_ascii=False)),
            )
        )
    batch_size = 250
    n_batches = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        sql = (
            "insert into public.foods (source, external_id, name_fr, category, per_100g)\nvalues\n"
            + ",\n".join(batch)
            + "\non conflict (source, external_id) do update set name_fr = excluded.name_fr, category = excluded.category, per_100g = excluded.per_100g;"
        )
        with open(f"{OUT_DIR}/batch_{n_batches:02d}.sql", "w") as f:
            f.write(sql)
        n_batches += 1
    print(f"{len(rows)} foods, {n_batches} batches")


main()
