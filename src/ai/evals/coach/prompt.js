// Builds Copine's chat prompt for promptfoo, reusing the versioned template
// from src/ai/prompts/coach.ts (extracted at run time to avoid duplication).
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "..", "prompts", "coach.ts"),
  "utf8",
);
const template = source.match(/COACH_SYSTEM_TEMPLATE = `([\s\S]*?)`;/)[1];

const DEFAULT_CONTEXT =
  "Prénom : Camille. Aucune règle alimentaire particulière déclarée.";

module.exports = async function ({ vars }) {
  let system = template
    .replace("{{coach_name}}", "Copine")
    .replace("{{user_context}}", vars.user_context || DEFAULT_CONTEXT)
    .replace("{{memories}}", vars.memories || "(aucune mémoire)")
    .replace(
      "{{calendar_context}}",
      vars.calendar_context || "(aucune fête suivie)",
    );
  // Eval harness has no tools: force text-only answers.
  system +=
    "\n\n[Session d'évaluation : aucun outil n'est disponible. N'appelle jamais d'outil, réponds uniquement en texte.]";

  return JSON.stringify([
    { role: "system", content: system },
    { role: "user", content: vars.message },
  ]);
};
