// Mechanical checks for Copine's neutral voice (pivot, ADR-029): no cultural
// or religious lexicon, no nicknames, at most one emoji, short answers.
const CULTURAL_TERMS = [
  "bsahtek",
  "sahha",
  "mabrouk",
  "mazal tov",
  "yalla",
  "belek",
  "ya ouili",
  "ya hasra",
  "hchouma",
  "kapara",
  "habibi",
  "hbibi",
  "chouya",
  "bezef",
  "fissa",
  "kif-kif",
  "inch'allah",
  "inchallah",
  "bismillah",
  "chabbat chalom",
  "baroukh hachem",
  "oy vey",
  "mamma mia",
];
const NICKNAMES = [
  "ma belle",
  "ma chérie",
  "mon chéri",
  "ma puce",
  "ma boulette",
  "mon cœur",
  "ma biche",
];

module.exports = (output, context) => {
  const text = String(output || "").trim();
  const reasons = [];

  const emojis = text.match(/\p{Extended_Pictographic}/gu) || [];
  if (emojis.length > 1) reasons.push(`${emojis.length} emojis (max 1)`);
  if (text.length > 0 && /^\p{Extended_Pictographic}/u.test(text)) {
    reasons.push("commence par un emoji");
  }

  const lower = text.toLowerCase();
  for (const term of [...CULTURAL_TERMS, ...NICKNAMES]) {
    const pattern = new RegExp(`\\b${term.replace(/[-\s']/g, "[-\\s']")}\\b`);
    if (pattern.test(lower)) reasons.push(`terme proscrit : « ${term} »`);
  }

  // Recipes and menus may be lists; plain answers stay short.
  const isList = /^\s*([-*•]|\d+[.)])\s/m.test(text);
  const sentences = text
    .split(/[.!?…]+(?:\s|$)/)
    .filter((s) => s.trim().length > 2);
  const allowLong = context?.vars?.allow_long === "true";
  if (!isList && !allowLong && sentences.length > 5) {
    reasons.push(`${sentences.length} phrases (attendu 1-4)`);
  }

  const withoutIdioms = text.replace(/rendez-vous|garde-à-vous/gi, "");
  if (/\bvous\b/i.test(withoutIdioms) && !/chez vous|vous deux/i.test(text)) {
    reasons.push("vouvoiement détecté");
  }

  return reasons.length === 0
    ? { pass: true, score: 1, reason: "voix conforme" }
    : { pass: false, score: 0, reason: reasons.join(" ; ") };
};
