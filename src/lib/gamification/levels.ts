/** Brief §4.10 — sober levels, never patronizing. */
export const LEVELS = [
  { level: 1, name: "Apprenti·e boulette", minXp: 0 },
  { level: 2, name: "Brik confirmée", minXp: 200 },
  { level: 3, name: "Chef couscous", minXp: 600 },
  { level: 4, name: "Maître kémia", minXp: 1500 },
  { level: 5, name: "Roi/Reine de la boutargue", minXp: 3500 },
] as const;

export function levelForXp(xp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXp) current = level;
  }
  const next = LEVELS.find((l) => l.minXp > current.minXp) ?? null;
  return {
    level: current.level,
    name: current.name,
    minXp: current.minXp,
    nextMinXp: next?.minXp ?? null,
    nextName: next?.name ?? null,
  };
}

export type GamificationStats = {
  journalDates: string[]; // YYYY-MM-DD, deduped
  weighDates: string[];
  sportDates: string[];
  sessionsCount: number;
  walkKm: number;
  publishedRecipes: number;
  importedRecipes: number;
  proteinRecipes: number;
  maxRecipeLikes: number;
  familyShared: boolean;
  hasShabbatPlan: boolean;
  meatWaitDays: number;
  pessahCleanDays: number;
  postFeastWeekDone: boolean;
  weightTrendDropPct: number;
  stableBoutargueMonth: boolean;
  postsCount: number;
};

/** Deterministic, recomputable XP — no event log to drift out of sync. */
export function computeXp(stats: GamificationStats): number {
  return (
    stats.journalDates.length * 10 +
    stats.weighDates.length * 5 +
    stats.sessionsCount * 20 +
    stats.publishedRecipes * 30 +
    stats.importedRecipes * 10 +
    stats.postsCount * 5 +
    Math.round(stats.walkKm) * 2
  );
}
