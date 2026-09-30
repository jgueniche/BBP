import { CATEGORIES, CUISINES } from "@/lib/recipes/cuisines";

// 2.0.0 (session 23): the card is reformulated (never the original text
// word for word), translated into French, with the category and cuisine
// from the app's lists; structured recipes are rewritten, not re-extracted.
export const PROMPT_VERSION = "2.0.0";

export const RECIPE_IMPORTER_SYSTEM = `Tu es l'assistant d'import de recettes de Copine en cuisine, une app de cuisine en français.
On te donne une recette trouvée ailleurs (légende Instagram ou TikTok, description YouTube, page d'un site, texte collé, captures ou photos) et tu en fais une fiche claire, rédigée avec tes propres mots.

Règles de rédaction :
- Réponds uniquement dans la structure demandée, tout en français (traduis si la source est dans une autre langue).
- Reformule : n'écris jamais une phrase de la source mot pour mot, ni dans les étapes ni dans la description. Garde les faits (ingrédients, quantités, températures, durées, gestes), change la formulation.
- Étapes : phrases courtes à l'impératif en tutoyant (« Coupe », « Fais revenir »), une action ou deux par étape, dans l'ordre ; renseigne duration_min quand une durée est citée ou évidente (cuisson, repos, mijotage).
- Description : une phrase à toi qui présente le plat, sans reprendre la légende ; null si tu n'as rien de juste à dire.
- Titre : le nom du plat, court, sans hashtags ni emojis, sans « recette » ni formule de référencement.
- Ingrédients : un par entrée, libellé simple ; convertis en grammes quand c'est possible (1 càs ≈ 15 g, 1 càc ≈ 5 g, 1 verre ≈ 200 ml, liquides 1 g/ml, 1 œuf ≈ 55 g, 1 oignon ≈ 100 g…) sinon grams=null et garde la quantité dans le libellé (« 3 œufs »).
- Si la recette a des phases (pâte, sauce, garniture, dressage…), renseigne section sur les ingrédients ET les étapes concernés, avec les mêmes noms.
- servings : nombre de personnes si indiqué, sinon ton estimation raisonnable.
- category : une valeur parmi ${CATEGORIES.join(", ")} (kemia = apéro), ou null si tu hésites.
- cuisine : une valeur parmi ${CUISINES.join(", ")}, ou null si ce n'est pas clair.
- tags : 3 à 6 mots-clés en minuscules tirés du contenu, sans #.
- icon : un seul emoji qui représente le plat.

Ce que tu ne fais jamais :
- Inventer un ingrédient, une quantité ou une étape absente de la source ; si la source n'est pas une recette, is_recipe=false.
- Recopier les mentions, hashtags, codes promo, liens, appels à s'abonner ou à commenter.
- Juger, conseiller sur la santé, parler de calories ou de régime.`;

/** The user message for a caption, a description, a page or a pasted text. */
export function textPrompt(
  hint: "caption" | "description" | "page" | "pasted",
  text: string,
): string {
  const what = {
    caption: "la légende d'une publication",
    description: "le titre et la description d'une vidéo",
    page: "le texte d'une page web (ignore les menus, publicités et commentaires)",
    pasted: "un texte collé par la personne",
  }[hint];
  return `Voici ${what}. Fais-en une fiche reformulée.\n\n---\n${text}\n---`;
}

/** The user message for a recipe already structured by its site. */
export function structuredPrompt(recipe: {
  title: string;
  description: string | null;
  ingredients: string[];
  steps: string[];
}): string {
  return [
    "Voici une recette déjà structurée par son site. Garde les mêmes ingrédients et quantités, et réécris le titre, la description et les étapes avec tes propres mots.",
    "",
    `Titre : ${recipe.title}`,
    recipe.description ? `Présentation du site : ${recipe.description}` : null,
    "Ingrédients :",
    ...recipe.ingredients.map((line) => `- ${line}`),
    "Étapes :",
    ...recipe.steps.map((step, index) => `${index + 1}. ${step}`),
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

/** The user message for captures or photos (in order). */
export function imagesPrompt(count: number, note: string | null): string {
  const intro =
    count > 1
      ? `Voici ${count} captures ou photos d'une même recette, dans l'ordre.`
      : "Voici la capture ou la photo d'une recette.";
  return `${intro} Lis tout le texte visible (légende, liste, étapes) et fais-en une fiche reformulée.${note ? `\n\nPrécision de la personne : ${note}` : ""}`;
}

/** Second try, when the first answer repeated the source. */
export function rewriteFeedback(passages: string[]): string {
  return `Ces passages reprennent la source mot pour mot : ${passages
    .map((passage) => `« ${passage} »`)
    .join(
      " ; ",
    )}. Réécris-les avec tes propres mots, sans rien changer aux faits.`;
}
