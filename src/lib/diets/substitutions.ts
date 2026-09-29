import type { Cause } from "./rules";

/**
 * Swap candidates, from the most specific to the most generic. The verdict
 * engine re-checks every candidate against all active rules (a soy cream is
 * no swap for someone allergic to soy) and keeps the first one that passes.
 */
type Swap = { re: RegExp; candidates: string[] };

const w = (pattern: string) =>
  new RegExp(`(?<![a-z0-9])(?:${pattern})(?![a-z0-9])`);

const BY_PRODUCT: Swap[] = [
  {
    re: w("lardons?|poitrine fumee|bacon|pancetta|guanciale"),
    candidates: ["lardons de dinde", "tofu fumé en dés"],
  },
  {
    re: w("jambons?|coppa|prosciutto|speck"),
    candidates: ["jambon de dinde", "tofu fumé"],
  },
  {
    re: w("chorizos?"),
    candidates: ["chorizo de bœuf", "paprika fumé et poivron grillé"],
  },
  {
    re: w("saucisses?|chipolatas?|knacks?|saucissons?"),
    candidates: ["saucisses de volaille", "saucisses végétales"],
  },
  { re: w("saindoux|lard"), candidates: ["huile d'olive"] },
  {
    re: w("porc|cochon|echine|filet mignon"),
    candidates: ["dinde ou veau", "pois chiches rôtis"],
  },
  { re: w("gelatine|feuilles de gelatine"), candidates: ["agar-agar"] },
  {
    re: w("carmin|cochenille|e ?120"),
    candidates: ["colorant naturel de betterave"],
  },
  {
    re: w("vin blanc|champagne|prosecco|cremant|cidre"),
    candidates: [
      "bouillon de légumes et un filet de jus de citron",
      "jus de citron allongé d'eau",
    ],
  },
  {
    re: w("vins?|vin rouge|porto|madere|marsala|xeres|sherry|vermouth|muscat"),
    candidates: [
      "jus de raisin et un trait de vinaigre de cidre",
      "bouillon de légumes",
    ],
  },
  {
    re: w("bieres?"),
    candidates: ["bouillon de légumes", "bière sans alcool sans gluten"],
  },
  {
    re: w("mirin|sake|shaoxing"),
    candidates: ["vinaigre de riz et une pincée de sucre"],
  },
  {
    re: w(
      "rhum|rum|kirsch|grand marnier|cointreau|amaretto|liqueurs?|calvados|cognac|armagnac|limoncello|whisky|eau de vie",
    ),
    candidates: ["jus d'orange et un zeste", "eau de fleur d'oranger"],
  },
  {
    re: w("extraits? de vanille|vanille liquide"),
    candidates: ["gousse de vanille", "sucre vanillé"],
  },
  {
    re: w(
      "bouillons?|fonds? (blanc|brun)|fond de (veau|volaille)|bouillon (de |d')?(volaille|poulet|poule|boeuf|veau)",
    ),
    candidates: ["bouillon de légumes", "eau et herbes aromatiques"],
  },
  {
    re: w("sauce soja|shoyu"),
    candidates: ["tamari (sauce soja sans blé)", "sauce coco aminos"],
  },
  {
    re: w("sauce (de )?poisson|nuoc ?mam|nam pla"),
    candidates: [
      "sauce soja",
      "tamari (sauce soja sans blé)",
      "sel et jus de citron vert",
    ],
  },
  {
    re: w("dashi|bonite sechee|fumet de poisson"),
    candidates: ["bouillon d'algues kombu"],
  },
  {
    re: w("pates? de curry"),
    candidates: ["pâte de curry sans crevettes (vérifie l'étiquette)"],
  },
  {
    re: w("laits?"),
    candidates: [
      "lait sans lactose",
      "boisson végétale au riz",
      "boisson végétale d'avoine",
      "lait de coco",
    ],
  },
  {
    re: w("creme fraiche|creme liquide|creme epaisse|cremes?"),
    candidates: [
      "crème sans lactose",
      "crème végétale d'avoine",
      "crème de coco",
    ],
  },
  {
    re: w("beurres?|noix de beurre"),
    candidates: ["margarine végétale", "huile d'olive"],
  },
  {
    re: w("yaourts?|yogourts?|fromages? blancs?|skyr"),
    candidates: ["yaourt sans lactose", "yaourt végétal au lait de coco"],
  },
  {
    re: w("parmesan|parmigiano|pecorino|grana padano"),
    candidates: [
      "parmesan végétarien (sans présure animale)",
      "levure nutritionnelle",
    ],
  },
  {
    re: w("oeufs?"),
    candidates: [
      "graines de lin moulues et eau (pour lier)",
      "farine de pois chiche",
    ],
  },
  { re: w("miel"), candidates: ["sirop d'érable", "sirop d'agave"] },
  {
    re: w("farines?|farine de ble"),
    candidates: [
      "farine de riz et fécule de maïs",
      "mélange de farines sans gluten",
    ],
  },
  {
    re: w("semoules?|graines? de couscous|couscous|boulgour|bulgur"),
    candidates: ["quinoa", "semoule de maïs"],
  },
  {
    re: w(
      "pates|spaghettis?|tagliatelles?|penne|macaronis?|coquillettes?|fusillis?|linguine|lasagnes?",
    ),
    candidates: ["pâtes sans gluten"],
  },
  {
    re: w("nouilles|vermicelles?|ramen|udon"),
    candidates: ["nouilles de riz"],
  },
  {
    re: w("feuilles? de (brick|brik|filo|phyllo)|bricks?"),
    candidates: ["feuilles de riz"],
  },
  { re: w("tortillas?|wraps?"), candidates: ["tortillas de maïs"] },
  {
    re: w("chapelure|panure|panko"),
    candidates: ["chapelure sans gluten", "polenta fine"],
  },
  { re: w("seitan"), candidates: ["tofu ferme"] },
  {
    re: w("flocons? d'avoine|avoine"),
    candidates: [
      "flocons d'avoine certifiés sans gluten",
      "flocons de sarrasin",
    ],
  },
  {
    re: w("levure chimique|poudre a lever"),
    candidates: ["levure chimique sans gluten"],
  },
  {
    re: w(
      "beurres? (de cacahuetes?|de cacahouetes?|d'arachides?)|arachides?|cacahuetes?|cacahouetes?",
    ),
    candidates: ["purée de graines de tournesol", "graines de tournesol"],
  },
  {
    re: w("tahin[ei]?|tahina|puree de sesame"),
    candidates: ["purée de graines de tournesol"],
  },
  { re: w("tofu"), candidates: ["pois chiches"] },
  { re: w("celeri( rave)?"), candidates: ["panais ou fenouil"] },
];

type CauseKey = string;

function causeKey(cause: Cause): CauseKey {
  if (cause.kind === "diet") return cause.code;
  if (cause.kind === "allergen") return `allergen:${cause.allergen}`;
  return "dislike";
}

const BY_CAUSE: Record<CauseKey, string[]> = {
  meat: ["pois chiches rôtis", "tofu ferme", "champignons"],
  pork: ["dinde ou poulet", "tofu fumé"],
  rabbit: ["poulet", "pois chiches rôtis"],
  horse: ["bœuf", "pois chiches rôtis"],
  fish: ["tofu ferme mariné", "pois chiches"],
  scaleless_fish: [
    "cabillaud ou autre poisson à écailles",
    "tofu ferme mariné",
  ],
  crustacean: ["poisson blanc", "pleurotes"],
  mollusc: ["poisson blanc", "pleurotes"],
  dairy: [],
  meat_with_dairy: [],
  egg: ["graines de lin moulues et eau (pour lier)", "farine de pois chiche"],
  honey: ["sirop d'érable", "sirop d'agave"],
  gelatin: ["agar-agar"],
  alcohol: ["bouillon de légumes", "jus de fruit"],
  gluten: [],
  "allergen:tree_nuts": ["graines de courge ou de tournesol"],
  "allergen:sesame": ["graines de tournesol"],
  "allergen:peanuts": ["graines de tournesol"],
  "allergen:celery": ["fenouil"],
  "allergen:lupin": ["farine de riz"],
};

/** Ordered swap candidates for one ingredient and its causes. */
export function swapCandidates(
  normalizedLabel: string,
  originalLabel: string,
  causes: Cause[],
): string[] {
  const list: string[] = [];
  for (const swap of BY_PRODUCT) {
    if (swap.re.test(normalizedLabel)) list.push(...swap.candidates);
  }
  const keys = new Set(causes.map(causeKey));
  if (
    keys.has("dairy") ||
    keys.has("meat_with_dairy") ||
    keys.has("allergen:milk")
  ) {
    list.push(
      `${originalLabel} sans lactose`,
      `${originalLabel} (version végétale)`,
    );
  }
  if (keys.has("gluten") || keys.has("allergen:gluten")) {
    list.push(`${originalLabel} sans gluten`);
  }
  for (const key of keys) list.push(...(BY_CAUSE[key] ?? []));
  return [...new Set(list)];
}
