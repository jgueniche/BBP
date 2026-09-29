/** World cuisines, grouped for pickers (DB check: recipes_origin_check). */
export const CUISINE_GROUPS = [
  {
    label: "Europe",
    cuisines: [
      "france",
      "italie",
      "espagne",
      "portugal",
      "grece",
      "europe_est",
    ],
  },
  {
    label: "Méditerranée et Moyen-Orient",
    cuisines: ["turquie", "liban", "israel"],
  },
  {
    label: "Afrique",
    cuisines: ["maroc", "algerie", "tunisie", "afrique_ouest"],
  },
  {
    label: "Amériques",
    cuisines: ["etats_unis", "mexique", "antilles", "amerique_sud"],
  },
  {
    label: "Asie",
    cuisines: ["inde", "chine", "japon", "coree", "vietnam", "thailande"],
  },
] as const;

/** Offered in pickers, plus « autre ». Legacy values stay readable. */
export const CUISINES = [
  ...CUISINE_GROUPS.flatMap((group) => group.cuisines),
  "autre",
] as const;

/** Every value the database accepts (legacy starter recipes included). */
export const ALL_CUISINES = [...CUISINES, "ashkenaze"] as const;
export type Cuisine = (typeof ALL_CUISINES)[number];

export const CATEGORIES = [
  "kemia",
  "petit_dej",
  "entree",
  "soupe",
  "salade",
  "plat",
  "accompagnement",
  "dessert",
  "pain",
  "boisson",
] as const;
export type Category = (typeof CATEGORIES)[number];
