export type ModerationVerdict = {
  allow: boolean;
  reasons: string[];
  severity: "none" | "medium" | "high";
};

/** Accent-insensitive, lowercase comparison base. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

type Rule = {
  reason: string;
  severity: "medium" | "high";
  patterns: RegExp[];
};

/**
 * Rules-based pre-filter (brief §4.9): hate/harassment, pro-ED content,
 * dangerous medical advice. High severity blocks, medium flags for the
 * admin queue. The AI moderator refines on top when a key is configured.
 */
const RULES: Rule[] = [
  {
    reason: "haine_ou_harcelement",
    severity: "high",
    patterns: [
      /\bsale (juif|juive|arabe|noir|noire|blanc|blanche|musulman|musulmane|chretien|chretienne|goy|feuj|gros|grosse)\b/,
      /\b(tous les|toutes les) (juifs|arabes|noirs|musulmans|femmes|hommes) (sont|meritent)\b/,
      /\bje vais te (tuer|frapper|defoncer|retrouver)\b/,
      /\bva (crever|te pendre|mourir)\b/,
      /\bt(u m)?erites de (mourir|crever|souffrir)\b/,
      /\bespece de (grosse? |sale )?(vache|truie|porc|deche?t|merde)\b/,
      /\bpersonne ne (t'aime|voudra de toi)\b/,
      /\bferme ta gueule\b/,
    ],
  },
  {
    reason: "pro_tca",
    severity: "high",
    patterns: [
      /\bpro[- ]?ana\b|\bthinspo\b|\bthigh gap\b/,
      /\b(se faire|me faire|te faire) vomir\b/,
      /\bvomir (apres (le|chaque) repas|pour maigrir)\b/,
      /\blaxatifs? pour (maigrir|compenser)\b/,
      /\b(objectif|challenge) (de )?[0-7][0-9]{2} ?kcal\b/,
      /\brester sous (les )?[0-7][0-9]{2} ?kcal\b/,
      /\bsauter (tous les|les) repas\b/,
      /\bcacher (la|ta) nourriture\b/,
      /\bastuces? pour (ne pas|eviter de) manger\b/,
      /\bmaigrir a tout prix\b/,
    ],
  },
  {
    reason: "medical_dangereux",
    severity: "high",
    patterns: [
      /\barrete?z? (ton|votre|l')? ?(insuline|traitement|medicaments?)\b/,
      /\b(remplace|remplacez) (ton|votre) (traitement|medicament)\b/,
      /\b(guerit|soigne) (le cancer|le diabete|toutes les maladies)\b/,
      /\bpas besoin de (medecin|docteur|ordonnance)\b/,
      /\b(clenbuterol|dnp|dinitrophenol|anabolisants?|steroides?) \b/,
      /\bprends? [0-9]+ ?(mg|g|ml|comprimes|gelules) de\b/,
      /\bjeuner [0-9]+ jours? (d'affilee|de suite|sans)\b/,
    ],
  },
  {
    reason: "contenu_sensible",
    severity: "medium",
    patterns: [
      /\bje (deteste|hais) mon corps\b/,
      /\bje me trouve (enorme|degoutant|degoutante|immonde)\b/,
      /\bbruleur de graisse miracle\b/,
      /\bperds? [0-9]+ ?(kg|kilos) en (une|1|2|deux) semaines?\b/,
    ],
  },
];

export function moderateText(raw: string): ModerationVerdict {
  const text = normalize(raw);
  const reasons: string[] = [];
  let severity: ModerationVerdict["severity"] = "none";

  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      reasons.push(rule.reason);
      if (rule.severity === "high") severity = "high";
      else if (severity === "none") severity = "medium";
    }
  }

  return { allow: severity !== "high", reasons, severity };
}
