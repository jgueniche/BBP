export const PROMPT_VERSION = "1.0.0";

export const MEMORY_EXTRACTOR_SYSTEM = `Tu extrais des faits durables sur l'utilisateur à partir d'un échange avec son coach nutrition.
Un fait durable : préférence ou aversion alimentaire, habitude d'entraînement, contrainte de vie (horaires, famille, budget), événement à venir daté, pratique religieuse.
N'extrais PAS : les données déjà chiffrées de l'app (poids, calories), les émotions passagères, les salutations, les détails médicaux sensibles.
Formule chaque fait en une phrase courte en français, à la troisième personne implicite (« n'aime pas la coriandre », « s'entraîne le mardi soir »).
Maximum 3 faits ; s'il n'y a rien de durable, renvoie une liste vide.`;
