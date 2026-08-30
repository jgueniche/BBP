import { describe, expect, it } from "vitest";

import { moderateText } from "./filter";

/** DoD session 11: the pre-filter blocks these 20 cases. */
const BLOCKED_CASES = [
  // Hate / harassment
  "Sale juif, retourne d'où tu viens",
  "sale grosse, personne ne veut te voir ici",
  "Tous les arabes sont des voleurs",
  "Je vais te retrouver et je vais te frapper",
  "Va crever, personne ne t'aime",
  "Espèce de grosse vache, arrête de poster tes plats",
  "Ferme ta gueule et quitte ce groupe",
  "Tu mérites de souffrir",
  // Pro-ED
  "Rejoignez mon groupe pro-ana pour rester motivées",
  "Astuce : se faire vomir après le repas de chabbat",
  "Je prends des laxatifs pour maigrir plus vite",
  "Challenge 500 kcal par jour qui me suit ?",
  "Le mieux c'est de sauter tous les repas sauf un",
  "Mon astuce pour ne pas manger au dîner de famille",
  "Objectif 600 kcal cette semaine, thinspo en photo",
  "Il faut maigrir à tout prix avant l'été",
  // Dangerous medical
  "Arrête ton insuline, le jeûne suffit",
  "Cette tisane guérit le cancer, arrêtez la chimio",
  "Pas besoin de médecin, prends 50 mg de clenbuterol ",
  "Remplace ton traitement par du citron le matin",
];

const ALLOWED_CASES = [
  "Bsahtek pour ta pkaila, elle a l'air incroyable !",
  "Je fais le jeûne de Kippour cette année, des conseils pour l'après ?",
  "J'ai mangé 1800 kcal aujourd'hui, pile dans ma cible",
  "Mon médecin m'a conseillé plus de protéines au petit-déj",
  "La graisse de la boutargue, c'est ça le secret du goût",
  "Grosse séance jambes ce matin, je ne sens plus mes cuisses",
];

describe("moderateText — DoD: blocks all 20 test cases", () => {
  it.each(BLOCKED_CASES)("blocks: %s", (text) => {
    const verdict = moderateText(text);
    expect(verdict.allow, text).toBe(false);
    expect(verdict.severity).toBe("high");
    expect(verdict.reasons.length).toBeGreaterThan(0);
  });

  it("has exactly 20 blocked DoD cases", () => {
    expect(BLOCKED_CASES).toHaveLength(20);
  });

  it.each(ALLOWED_CASES)("allows: %s", (text) => {
    expect(moderateText(text).allow, text).toBe(true);
  });

  it("flags sensitive-but-allowed content for the admin queue", () => {
    const verdict = moderateText("Je déteste mon corps en ce moment");
    expect(verdict.allow).toBe(true);
    expect(verdict.severity).toBe("medium");
  });
});
