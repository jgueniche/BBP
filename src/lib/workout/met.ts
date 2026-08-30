/** kcal = MET × poids (kg) × durée (h) — arrondi entier. */
export function kcalForActivity(
  met: number,
  weightKg: number,
  minutes: number,
): number {
  return Math.round(met * weightKg * (minutes / 60));
}

export type QuickActivity = {
  label: string;
  met: number;
};

/** Free-text quick log vocabulary ("marche 30 min", "foot le dimanche"). */
const ACTIVITIES: Array<[RegExp, QuickActivity]> = [
  [/marche\s+rapide|marche\s+nordique/i, { label: "Marche rapide", met: 4.3 }],
  [/marche|balade|promenade/i, { label: "Marche", met: 3.5 }],
  [/footing|jogging|course\s+lente/i, { label: "Footing", met: 8.3 }],
  [/course|running|run\b/i, { label: "Course à pied", met: 9.8 }],
  [/v[ée]lo|cyclisme|spinning/i, { label: "Vélo", met: 6.8 }],
  [/elliptique/i, { label: "Vélo elliptique", met: 5.0 }],
  [/rameur|aviron/i, { label: "Rameur", met: 7.0 }],
  [/natation|piscine|nage/i, { label: "Natation", met: 5.8 }],
  [/foot(ball)?\b/i, { label: "Football", met: 8.0 }],
  [/basket/i, { label: "Basket", met: 7.5 }],
  [/padel|tennis|badminton|squash/i, { label: "Raquettes", met: 7.3 }],
  [/muscu(lation)?|renfo(rcement)?|fonte/i, { label: "Musculation", met: 5.0 }],
  [/crossfit|hiit|circuit/i, { label: "HIIT / circuit", met: 10.0 }],
  [/corde\s+[àa]\s+sauter/i, { label: "Corde à sauter", met: 11.0 }],
  [/escalier/i, { label: "Montées d'escaliers", met: 8.8 }],
  [/rando(nn[ée]e)?/i, { label: "Randonnée", met: 6.0 }],
  [/yoga|stretching|[ée]tirements/i, { label: "Yoga / étirements", met: 2.5 }],
  [/pilates/i, { label: "Pilates", met: 3.0 }],
  [/danse|zumba/i, { label: "Danse", met: 5.5 }],
  [/boxe|krav|mma|judo/i, { label: "Sports de combat", met: 9.0 }],
  [/escalade/i, { label: "Escalade", met: 7.5 }],
  [/m[ée]nage|jardinage/i, { label: "Activité domestique", met: 3.5 }],
];

const DURATION_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(h(?:eures?)?|min(?:utes?)?)|(\d+)\s*h\s*(\d+)/i;

export type ParsedActivity = QuickActivity & { minutes: number };

/** "marche 30 min", "1h de vélo", "foot 1h30" → activity + minutes. */
export function parseQuickActivity(raw: string): ParsedActivity | null {
  const text = raw.trim();
  if (text.length < 3) return null;

  let minutes: number | null = null;
  const compound = /(\d+)\s*h\s*(\d+)/.exec(text);
  if (compound) {
    minutes = parseInt(compound[1], 10) * 60 + parseInt(compound[2], 10);
  } else {
    const match = DURATION_PATTERN.exec(text);
    if (match?.[1]) {
      const value = parseFloat(match[1].replace(",", "."));
      minutes = match[2]?.toLowerCase().startsWith("h")
        ? Math.round(value * 60)
        : Math.round(value);
    }
  }
  if (minutes === null || minutes < 1 || minutes > 600) return null;

  for (const [pattern, activity] of ACTIVITIES) {
    if (pattern.test(text)) return { ...activity, minutes };
  }
  return { label: "Activité", met: 4.0, minutes };
}
