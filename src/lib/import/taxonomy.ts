import type { Category, Cuisine } from "@/lib/recipes/cuisines";

// A site's own words for its category and cuisine (« Plat principal »,
// « Cuisine française », « Italian ») mapped to the app's lists. Anything
// unsure stays empty: the member picks.

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const CATEGORY_RULES: ReadonlyArray<readonly [RegExp, Category]> = [
  [/\b(sauces?|condiments?|vinaigrettes?|pesto|dips?|marinades?)\b/, "sauce"],
  [/\b(soupes?|veloutes?|potages?|bouillons?|soups?|gaspachos?)\b/, "soupe"],
  [/\b(salades?|salads?)\b/, "salade"],
  [
    /\b(boissons?|cocktails?|smoothies?|jus|drinks?|beverages?|mocktails?)\b/,
    "boisson",
  ],
  [
    /\b(pains?|breads?|boulangerie|brioches?|viennoiseries?|focaccias?)\b/,
    "pain",
  ],
  [/\b(petit[- ]dejeuner|brunch|breakfast)\b/, "petit_dej"],
  [
    /\b(aperitifs?|aperos?|amuse[- ]bouches?|tapas|mezzes?|finger ?food|bouchees?)\b/,
    "kemia",
  ],
  [
    /\b(desserts?|gateaux?|patisseries?|biscuits?|cookies?|glaces?|sorbets?|entremets|confiseries?|gouters?|cakes?|sweets?)\b/,
    "dessert",
  ],
  [/\b(entrees?|starters?|appetizers?|hors[- ]d.?oeuvres?)\b/, "entree"],
  [
    /\b(accompagnements?|sides?|side dish|garnitures?|legumes)\b/,
    "accompagnement",
  ],
  [
    /\b(plats?|plat principal|main|mains|main course|diners?|dinners?)\b/,
    "plat",
  ],
];

/** « Plat principal » → plat; the first listed category that maps wins. */
export function categoryFrom(raw: string | string[] | null): Category | null {
  const values = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .flatMap((value) => value.split(/[,;/|]/))
    .map(normalize)
    .filter((value) => value.length > 1);
  for (const value of values) {
    const rule = CATEGORY_RULES.find(([pattern]) => pattern.test(value));
    if (rule) return rule[1];
  }
  return null;
}

const CUISINE_RULES: ReadonlyArray<readonly [RegExp, Cuisine]> = [
  [/\b(francaise?|french|france)\b/, "france"],
  [/\b(italienne?|italian|italie)\b/, "italie"],
  [/\b(espagnole?|spanish|espagne)\b/, "espagne"],
  [/\b(portugaise?|portuguese|portugal)\b/, "portugal"],
  [/\b(grecque|greek|grece)\b/, "grece"],
  [
    /\b(polonaise?|russe|ukrainienne?|hongroise?|roumaine?|europe de l.est|polish|russian|hungarian)\b/,
    "europe_est",
  ],
  [/\b(turque|turkish|turquie)\b/, "turquie"],
  [/\b(libanaise?|lebanese|liban)\b/, "liban"],
  [/\b(israelienne?|israeli|israel)\b/, "israel"],
  [/\b(marocaine?|moroccan|maroc)\b/, "maroc"],
  [/\b(algerienne?|algerian|algerie)\b/, "algerie"],
  [/\b(tunisienne?|tunisian|tunisie)\b/, "tunisie"],
  [
    /\b(senegalaise?|ivoirienne?|africaine?|west african|nigeriane?|camerounaise?)\b/,
    "afrique_ouest",
  ],
  [/\b(americaine?|american|etats[- ]unis|us|usa)\b/, "etats_unis"],
  [/\b(mexicaine?|mexican|mexique)\b/, "mexique"],
  [/\b(antillaise?|creole|caribbean|caribeenne?|antilles)\b/, "antilles"],
  [
    /\b(bresilienne?|peruvienne?|argentine|colombienne?|latino|brazilian|peruvian)\b/,
    "amerique_sud",
  ],
  [/\b(indienne?|indian|inde)\b/, "inde"],
  [/\b(chinoise?|chinese|chine)\b/, "chine"],
  [/\b(japonaise?|japanese|japon)\b/, "japon"],
  [/\b(coreenne?|korean|coree)\b/, "coree"],
  [/\b(vietnamienne?|vietnamese|vietnam)\b/, "vietnam"],
  [/\b(thai|thaie|thailandaise?|thailande)\b/, "thailande"],
];

/**
 * « Cuisine française » → france. A bare locale code (« Fr ») says where
 * the site is, not what the dish is: ignored.
 */
export function cuisineFrom(raw: string | string[] | null): Cuisine | null {
  const values = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .flatMap((value) => value.split(/[,;/|]/))
    .map(normalize)
    .filter((value) => value.length > 2);
  for (const value of values) {
    const rule = CUISINE_RULES.find(([pattern]) => pattern.test(value));
    if (rule) return rule[1];
  }
  return null;
}
