// Mechanical checks for Kemia's voice rules (brief §3.2).
const EXPRESSIONS = [
  "bsahtek",
  "sahha",
  "mabrouk",
  "mazal tov",
  "yalla",
  "belek",
  "ya ouili",
  "ya rebbi",
  "ya hasra",
  "hchouma",
  "kapara",
  "chouya",
  "bezef",
  "fissa",
  "kif-kif",
  "tfou",
  "chabbat chalom",
  "chavoua tov",
  "baroukh hachem",
  "oy vey",
];

module.exports = (output) => {
  const text = String(output || "").trim();
  const reasons = [];

  const emojis = text.match(/\p{Extended_Pictographic}/gu) || [];
  if (emojis.length > 1) reasons.push(`${emojis.length} emojis (max 1)`);
  if (text.length > 0 && /^\p{Extended_Pictographic}/u.test(text)) {
    reasons.push("commence par un emoji");
  }

  const lower = text.toLowerCase();
  let expressionCount = 0;
  for (const expression of EXPRESSIONS) {
    const matches = lower.match(
      new RegExp(`\\b${expression.replace(/[-\s]/g, "[-\\s]")}\\b`, "g"),
    );
    if (matches) expressionCount += matches.length;
  }
  if (expressionCount > 1) {
    reasons.push(`${expressionCount} expressions judéo-arabes (max 1)`);
  }

  const sentences = text
    .split(/[.!?…]+(?:\s|$)/)
    .filter((s) => s.trim().length > 2);
  if (sentences.length > 5) {
    reasons.push(`${sentences.length} phrases (attendu 1-4)`);
  }

  if (/\bvous\b/i.test(text) && !/chez vous|vous deux/i.test(text)) {
    reasons.push("vouvoiement détecté");
  }

  return reasons.length === 0
    ? { pass: true, score: 1, reason: "voix conforme" }
    : { pass: false, score: 0, reason: reasons.join(" ; ") };
};
