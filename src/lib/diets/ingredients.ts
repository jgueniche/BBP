import type { Allergen, Attribute, IngredientAnalysis } from "./types";

/**
 * Neutral ingredient dictionary (French labels). Entries run from the most
 * specific phrase to the most generic word; each match is masked so that
 * « noix de beurre » never reads as a nut, nor « lait de coco » as milk.
 */

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`´]/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Entry = {
  re: RegExp;
  a?: Attribute[];
  m?: Attribute[];
  al?: Allergen[];
  mal?: Allergen[];
};

function e(pattern: string, facts: Omit<Entry, "re"> = {}): Entry {
  return {
    re: new RegExp(`(?<![a-z0-9])(?:${pattern})(?![a-z0-9])`, "g"),
    ...facts,
  };
}

const MEAT: Attribute[] = ["meat"];
const PORK: Attribute[] = ["meat", "pork"];
const WINE: Omit<Entry, "re"> = {
  a: ["alcohol", "grape"],
  al: ["sulphites"],
};

const ENTRIES: Entry[] = [
  // Neutral phrases that contain misleading words.
  e("sucre glace|glace royale|a la coque|pied de mouton|pieds de mouton"),
  e(
    "coeurs? de palmiers?|coeurs? d'artichauts?|coeurs? de (laitue|salade|romaine)",
  ),
  e(
    "blancs? de poireaux?|noix de muscade|muscade|noix de coco|coco rape|eau de coco",
  ),
  e("(lait|creme|boisson|yaourt)s? de (noix de )?coco"),
  e("beurre de (cacao|karite)|huile de soja|kefir (de fruits|d'eau)"),
  e("vinaigre de cidre|vinaigre de riz|vinaigre blanc|vinaigre d'alcool"),

  // Plant drinks, creams and spreads.
  e(
    "(lait|boisson|creme|yaourt|dessert)s? (vegetale?s? )?(d'|de |a l'|au )?(amandes?|noisettes?|cajou)",
    { al: ["tree_nuts"] },
  ),
  e("(lait|boisson|creme|yaourt|dessert)s? (vegetale?s? )?(de |au )?soja", {
    al: ["soy"],
  }),
  e("(lait|boisson|creme)s? (vegetale?s? )?(d'|a l')avoine", { m: ["gluten"] }),
  e("(lait|boisson|creme)s? (vegetale?s? )?(de |au )riz"),
  e("(lait|boisson)s? d'epeautre", { a: ["gluten"] }),
  e("beurres? (de cacahuetes?|de cacahouetes?|d'arachides?)", {
    al: ["peanuts"],
  }),
  e("(beurre|puree)s? (d'amandes?|de noisettes?|de cajou)", {
    al: ["tree_nuts"],
  }),
  e("puree de sesame|creme de sesame", { al: ["sesame"] }),
  e("creme de marrons?|puree de marrons?|creme de riz"),

  // Dairy look-alikes that are something else.
  e("noix de beurre", { a: ["dairy"] }),
  e("noix de (saint jacques|st jacques)", { a: ["mollusc"] }),
  e("noix de veau", { a: MEAT }),
  e("noix de jambon", { a: PORK }),
  e("creme de (cassis|menthe|mures?|framboises?|peches?|violettes?|whisky)", {
    a: ["alcohol"],
  }),
  e("creme (de |au )?balsamique|creme de vinaigre balsamique", {
    a: ["grape"],
    al: ["sulphites"],
  }),
  e("creme d'amandes?", { a: ["dairy", "egg"], al: ["tree_nuts"] }),
  e("creme patissiere", { a: ["dairy", "egg"], m: ["gluten"] }),
  e("creme anglaise", { a: ["dairy", "egg"] }),
  e("langues? de chat|biscuits? a la cuillere|boudoirs?", {
    a: ["gluten", "egg"],
    m: ["dairy"],
  }),

  // Eggs and roe.
  e("oeufs? de lompe|caviar", { a: ["scaleless_fish"] }),
  e(
    "oeufs? de (saumon|truite|cabillaud|poisson|hareng)|tarama|boutargue|poutargue",
    { a: ["fish"] },
  ),
  e("blancs? d'oeufs?|jaunes? d'oeufs?", { a: ["egg"] }),

  // Sauces and pastes.
  e("sauce (d'huitres?|huitre)", { a: ["mollusc"] }),
  e(
    "sauce (de )?poisson|nuoc ?mam|nam pla|colatura|fumet de poisson|bouillon de poisson|dashi|bonite sechee",
    { a: ["fish"] },
  ),
  e("sauce worcestershire|worcestershire", { a: ["fish"], m: ["gluten"] }),
  e("sauce teriyaki", { a: ["gluten"], m: ["alcohol"], al: ["soy"] }),
  e("sauce soja|shoyu", { a: ["gluten"], al: ["soy"] }),
  e("tamari", { al: ["soy"] }),
  e("sauce cesar", { a: ["fish", "egg", "dairy", "cheese"] }),
  e("pesto", { a: ["dairy", "cheese", "animal_rennet"] }),
  e("mayonnaise|aioli", { a: ["egg"], mal: ["mustard"] }),
  e("houmous|hoummos|hummus|tahin[ei]?|tahina|halva|halwa|za'?atar|gomasio", {
    al: ["sesame"],
  }),
  e("tapenade", { m: ["fish"] }),
  e("pates? de crevettes?", { a: ["crustacean"] }),
  e("pates? de curry", { m: ["crustacean", "fish"] }),
  e("sauce satay|satay", { al: ["peanuts"] }),
  e("bechamel", { a: ["dairy", "gluten"] }),

  // Stocks.
  e("bouillons? (de |d')?(legumes?|vegetale?s?)|court bouillon", {
    m: ["gluten"],
    mal: ["celery"],
  }),
  e(
    "(bouillon|fond|jus)s? (de |d')?(volaille|poulet|poule|boeuf|veau|viande|agneau|gibier)|demi glace",
    { a: MEAT, m: ["gluten"], mal: ["celery"] },
  ),
  e("bouillons?|fonds? (blanc|brun)", {
    m: ["meat", "gluten"],
    mal: ["celery"],
  }),

  // Poultry and beef products that replace pork.
  e(
    "(lardons?|bacon|jambons?|saucisses?|saucissons?|chorizos?|knacks?|merguez|rillettes)( blanc)? (de |d')?(dinde|volaille|poulet|boeuf|veau|agneau|canard|oie|cheval)",
    { a: MEAT },
  ),
  e("blancs? de (dinde|poulet|volaille)", { a: MEAT }),
  e("rillettes (de |d')?(thon|saumon|sardines?|maquereaux?)", { a: ["fish"] }),
  e("steaks? de (thon|saumon)", { a: ["fish"] }),
  e("steaks? de soja", { al: ["soy"] }),

  // Pork.
  e("boudins? noirs?", { a: [...PORK, "blood"] }),
  e("boudins? blancs?", { a: [...PORK, "dairy"] }),
  e(
    "porc|cochon|lardons?|lard|bacon|jambons?|pancetta|guanciale|coppa|prosciutto|speck|mortadelle|chorizos?|saucissons?|chipolatas?|andouillettes?|andouilles?|rillettes|saindoux|sanglier|pepperoni|salami|poitrine fumee|echine|knacks?|pates? de campagne|terrines? de campagne|saucisses? de (strasbourg|francfort|toulouse|morteau|montbeliard)",
    { a: PORK },
  ),
  e("saucisses?|charcuterie", { a: MEAT, m: ["pork"] }),

  // Other meats.
  e("lapins?|lievres?", { a: [...MEAT, "rabbit"] }),
  e("cheval|chevaline", { a: [...MEAT, "horse"] }),
  e("sang", { a: ["blood"] }),
  e("escargots?", { a: ["mollusc"] }),
  e(
    "viandes?|boeuf|veau|agneau|mouton|poulets?|poule|poussin|coquelets?|chapon|dinde|dindonneau|pintade|canard|magrets?|oie|cailles?|pigeons?|chevreuil|cerf|biche|gibier|bison|autruche|foie gras|foies? de (volaille|veau|poulet|genisse|boeuf|agneau)|rognons?|tripes?|gesiers?|abats|ris de veau|moelle|os a moelle|joues? de (boeuf|veau)|jarrets?|paleron|bavette|entrecotes?|faux filet|rumsteck|rumsteak|tournedos|steaks? haches?|steaks?|kefta|kofta|merguez|osso buco|gigot|epaule d'agneau|souris d'agneau|carre d'agneau|cotes? d'agneau|cotelettes?|escalopes?|filet mignon|rotis? de (boeuf|veau|dinde)|volailles?|hauts? de cuisses?|pilons?|ailes? de poulet|cuisses? de (poulet|canard|dinde)|confit de canard|graisse de (canard|oie)|suif|graisse animale|grenouilles?",
    { a: MEAT },
  ),

  // Seafood.
  e(
    "anguilles?|lotte|baudroie|raies?|requins?|roussette|saumonette|espadon|esturgeon|silure|lamproie|poisson chat",
    { a: ["scaleless_fish"] },
  ),
  e("fruits de mer", { a: ["crustacean", "mollusc"] }),
  e(
    "crevettes?|gambas|langoustines?|homards?|langoustes?|crabes?|tourteaux?|ecrevisses?|etrilles?|araignees? de mer|krill",
    { a: ["crustacean"] },
  ),
  e(
    "moules?|huitres?|coques?|palourdes?|praires?|clams?|bulots?|bigorneaux?|ormeaux?|calamars?|calmars?|encornets?|seiches?|poulpes?|pieuvres?|chipirons?|supions?|encre de seiche|tellines?|coquilles? saint jacques|saint jacques|petoncles?",
    { a: ["mollusc"] },
  ),
  e("surimi", { a: ["fish"], m: ["crustacean", "egg", "gluten"] }),
  e(
    "poissons?|cabillaud|morue|colin|merlu|lieu|merlan|soles?|dorades?|daurades?|bar|loup|saumons?|truites?|thon|sardines?|maquereaux?|anchois|harengs?|rougets?|mulets?|merou|sandre|perche|brochet|carpe|tilapia|eglefin|haddock|fletan|turbot|barbue|bonite|pangasius|limande",
    { a: ["fish"] },
  ),

  // Cheeses and dairy.
  e(
    "parmesan|parmigiano|grana padano|pecorino|comte|beaufort|emmental|emmenthal|gruyere|manchego",
    { a: ["dairy", "cheese", "low_lactose", "animal_rennet"] },
  ),
  e("cheddar|mimolette|cantal|tomme|abondance|gouda|edam", {
    a: ["dairy", "cheese", "low_lactose"],
  }),
  e("roquefort|gorgonzola", { a: ["dairy", "cheese", "animal_rennet"] }),
  e(
    "fromages? blancs?|fromages? frais|petits? suisses?|faisselle|cottage|fromages?|feta|mozzarella|burrata|ricotta|mascarpone|chevre|brebis|camembert|brie|reblochon|raclette|munster|halloumi|paneer|labneh|boursin|kiri|cancoillotte|ossau iraty|saint marcellin",
    { a: ["dairy", "cheese"] },
  ),
  e("ghee|beurre clarifie", { a: ["dairy", "low_lactose"] }),
  e("chocolat (au lait|blanc)", { a: ["dairy"] }),
  e(
    "lait concentre|lait en poudre|dulce de leche|confiture de lait|creme fraiche|creme liquide|creme epaisse|creme aigre|chantilly|lactoserum|petit lait|babeurre|caseine",
    { a: ["dairy"] },
  ),
  e(
    "laits?|cremes?|beurres?|yaourts?|yogourts?|yoghourts?|skyr|kefir|laitage",
    { a: ["dairy"] },
  ),

  // Eggs, honey, gelatin, colouring.
  e("brioches?", { a: ["gluten", "egg", "dairy"] }),
  e(
    "pates? (fraiches|aux oeufs)|nouilles aux oeufs|tagliatelles? fraiches?|pates? a (crepes?|gaufres?|beignets?)",
    { a: ["gluten", "egg"], m: ["dairy"] },
  ),
  e("meringues?|oeufs?", { a: ["egg"] }),
  e("miel", { a: ["honey"] }),
  e("gelatine|feuilles de gelatine", { a: ["gelatin"] }),
  e("carmin|cochenille|e ?120", { a: ["carmine"] }),

  // Wine, spirits and extracts.
  e(
    "vinaigre (de vin|balsamique|de xeres|de champagne|de banyuls)|balsamique",
    { a: ["grape"], al: ["sulphites"] },
  ),
  e("jus de raisins?", { a: ["grape"] }),
  e("raisins? secs?|abricots? secs?|pruneaux|figues? seches?", {
    mal: ["sulphites"],
  }),
  e(
    "vins?|porto|madere|xeres|sherry|marsala|vermouth|champagne|prosecco|cremant|cava|cognac|armagnac|muscat|pineau|lambrusco",
    WINE,
  ),
  e("bieres?", { a: ["alcohol", "gluten"], al: ["sulphites"] }),
  e("cidre", { a: ["alcohol"], al: ["sulphites"] }),
  e(
    "rhum|rum|whisky|whiskey|vodka|gin|tequila|kirsch|calvados|grand marnier|cointreau|triple sec|amaretto|limoncello|liqueurs?|pastis|anisette|ouzo|arak|boukha|sake|mirin|shaoxing|alcool|eau de vie|baileys|kahlua|chartreuse|genievre",
    { a: ["alcohol"] },
  ),
  e("extraits? de (vanille|amande amere|cafe|citron)|vanille liquide", {
    m: ["alcohol"],
  }),

  // Grains.
  e(
    "farines? (de |d')(riz|mais|sarrasin|pois chiches?|chataignes?|coco|manioc|tapioca|teff|quinoa|souchet|millet|sorgho|lentilles?|pommes? de terre)",
  ),
  e("farines? de lupin|lupin", { al: ["lupin"] }),
  e(
    "farines? (d'amandes?|de noisettes?)|poudre d'amandes?|amandes? en poudre",
    { al: ["tree_nuts"] },
  ),
  e(
    "fecule|maizena|amidon de mais|polenta|semoule de (mais|riz)|nouilles de riz|vermicelles? de riz|galettes? de (riz|sarrasin|mais)|feuilles? de riz|pates? de riz|tortillas? de mais|sarrasin|quinoa",
  ),
  e("amidon de ble", { a: ["gluten"] }),
  e("flocons? d'avoine|son d'avoine|avoine", { m: ["gluten"] }),
  e("levure chimique|poudre a lever", { m: ["gluten"] }),
  e("miso", { m: ["gluten"], al: ["soy"] }),
  e(
    "pates? (feuilletee|brisee|sablee|a pizza|a pain|filo|phyllo|a tarte)|feuilles? de (brick|brik|filo|phyllo)|bricks?",
    { a: ["gluten"], m: ["dairy"] },
  ),
  e(
    "farines?|ble|froment|semoules?|graines? de couscous|couscous|boulgour|bulgur|epeautre|seigle|orge|kamut|malt|pains?|baguettes?|pain de mie|pitas?|naans?|chapatis?|tortillas?|wraps?|croissants?|biscottes?|chapelure|panure|panko|croutons?|biscuits?|speculoos|genoise|crackers?|pates|spaghettis?|tagliatelles?|lasagnes?|penne|macaronis?|coquillettes?|fusillis?|farfalle|linguine|orzo|vermicelles?|nouilles|ramen|udon|soba|gnocchis?|raviolis?|tortellinis?|seitan|gluten|crepes?|galettes?|fregola|freekeh",
    { a: ["gluten"] },
  ),

  // Nuts, seeds and other allergens.
  e("arachides?|cacahuetes?|cacahouetes?", { al: ["peanuts"] }),
  e(
    "amandes?|pate d'amandes?|massepain|noisettes?|noix de cajou|cajou|noix de pecan|pecan|pistaches?|macadamia|noix du bresil|noix|praline|pralin|pralines?|frangipane|nougat|gianduja|nutella|pate a tartiner|orgeat",
    { al: ["tree_nuts"] },
  ),
  e("soja|tofu|tempeh|edamame|natto|yuba", { al: ["soy"] }),
  e("celeri( rave| branche)?|sel de celeri|mirepoix", { al: ["celery"] }),
  e("moutardes?", { al: ["mustard"] }),
  e("sesame", { al: ["sesame"] }),
  e("fruits secs", { mal: ["sulphites", "tree_nuts"] }),
];

const PLANT = /(?<![a-z])(vegetale?s?|vegetaux|vegan|vegane|veggie)(?![a-z])/;

const ANIMAL: Attribute[] = [
  "meat",
  "pork",
  "rabbit",
  "horse",
  "blood",
  "fish",
  "scaleless_fish",
  "crustacean",
  "mollusc",
  "dairy",
  "cheese",
  "low_lactose",
  "animal_rennet",
  "egg",
  "honey",
  "gelatin",
  "carmine",
];

/** Allergens implied by neutral attributes. */
const IMPLIED: Array<[Attribute, Allergen]> = [
  ["fish", "fish"],
  ["scaleless_fish", "fish"],
  ["crustacean", "crustaceans"],
  ["mollusc", "molluscs"],
  ["dairy", "milk"],
  ["egg", "eggs"],
  ["gluten", "gluten"],
];

function scan(text: string, out: MutableAnalysis) {
  let rest = ` ${text} `;
  for (const entry of ENTRIES) {
    entry.re.lastIndex = 0;
    if (!entry.re.test(rest)) continue;
    entry.re.lastIndex = 0;
    rest = rest.replace(entry.re, (match) => " ".repeat(match.length));
    entry.a?.forEach((a) => out.attributes.add(a));
    entry.m?.forEach((a) => out.maybe.add(a));
    entry.al?.forEach((a) => out.allergens.add(a));
    entry.mal?.forEach((a) => out.maybeAllergens.add(a));
  }
}

type MutableAnalysis = {
  attributes: Set<Attribute>;
  maybe: Set<Attribute>;
  allergens: Set<Allergen>;
  maybeAllergens: Set<Allergen>;
};

/** Neutral attributes and allergens of one ingredient (label + linked food name). */
export function analyzeIngredient(
  label: string,
  foodName?: string | null,
): IngredientAnalysis {
  const out: MutableAnalysis = {
    attributes: new Set(),
    maybe: new Set(),
    allergens: new Set(),
    maybeAllergens: new Set(),
  };
  const labelText = normalize(label);
  scan(labelText, out);
  // The linked reference food is often a nutrition proxy (boutargue → lumpfish
  // roe): it only speaks when the label itself says nothing certain.
  const texts = [labelText];
  if (foodName && out.attributes.size + out.allergens.size === 0) {
    const foodText = normalize(foodName);
    texts.push(foodText);
    scan(foodText, out);
  }
  const all = texts.join(" | ");

  // Free-from and label markers, read on the whole description.
  if (PLANT.test(all)) {
    for (const a of ANIMAL) {
      out.attributes.delete(a);
      out.maybe.delete(a);
    }
    out.maybeAllergens.delete("mustard");
  }
  if (/sans gluten/.test(all)) {
    out.attributes.delete("gluten");
    out.maybe.delete("gluten");
  }
  if (/sans lactose/.test(all)) out.attributes.add("lactose_free");
  if (/sans alcool/.test(all)) {
    out.attributes.delete("alcohol");
    out.maybe.delete("alcohol");
  }
  if (/non soufre|sans sulfites?/.test(all)) {
    out.allergens.delete("sulphites");
    out.maybeAllergens.delete("sulphites");
  }
  const halal = /(?<![a-z])halal(?![a-z])/.test(all);
  const kosher = /(?<![a-z])(casher|kasher|cacher|kosher)(?![a-z])/.test(all);
  if (halal || kosher || /sans porc/.test(all)) {
    out.attributes.delete("pork");
    out.maybe.delete("pork");
  }
  if (halal) out.attributes.add("halal_label");
  if (kosher) out.attributes.add("kosher_label");

  for (const [attribute, allergen] of IMPLIED) {
    if (out.attributes.has(attribute)) out.allergens.add(allergen);
    else if (out.maybe.has(attribute)) out.maybeAllergens.add(allergen);
  }
  for (const a of out.attributes) out.maybe.delete(a);
  for (const a of out.allergens) out.maybeAllergens.delete(a);

  return out;
}
