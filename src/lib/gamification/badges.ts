import type { GamificationStats } from "./levels";
import type { StreakResult } from "./streaks";

export type BadgeContext = {
  stats: GamificationStats;
  journalStreak: StreakResult;
};

type BadgeRule = { slug: string; earned: (ctx: BadgeContext) => boolean };

/** Annexe B — the 16 badges, one pure predicate each (fixture-testable). */
export const BADGE_RULES: BadgeRule[] = [
  {
    slug: "premiere-boulette",
    earned: ({ stats }) => stats.journalDates.length >= 1,
  },
  {
    slug: "semaine-sahha",
    earned: ({ journalStreak }) => journalStreak.best >= 7,
  },
  { slug: "chabbat-chalom", earned: ({ stats }) => stats.hasShabbatPlan },
  { slug: "roi-couscous", earned: ({ stats }) => stats.publishedRecipes >= 10 },
  { slug: "boutargue-dor", earned: ({ stats }) => stats.maxRecipeLikes >= 100 },
  { slug: "meme-approuve", earned: ({ stats }) => stats.familyShared },
  { slug: "yalla", earned: ({ stats }) => stats.sessionsCount >= 1 },
  { slug: "marcheur-belleville", earned: ({ stats }) => stats.walkKm >= 100 },
  { slug: "belek-le-beurre", earned: ({ stats }) => stats.meatWaitDays >= 7 },
  {
    slug: "pessah-sans-hametz",
    earned: ({ stats }) => stats.pessahCleanDays >= 8,
  },
  { slug: "apres-fetes", earned: ({ stats }) => stats.postFeastWeekDone },
  { slug: "moins-5", earned: ({ stats }) => stats.weightTrendDropPct >= 5 },
  { slug: "moins-10", earned: ({ stats }) => stats.weightTrendDropPct >= 10 },
  {
    slug: "tata-fiere",
    earned: ({ journalStreak }) => journalStreak.best >= 30,
  },
  { slug: "importateur", earned: ({ stats }) => stats.importedRecipes >= 10 },
  { slug: "kif-kif", earned: ({ stats }) => stats.stableBoutargueMonth },
];

export function earnedBadgeSlugs(ctx: BadgeContext): string[] {
  return BADGE_RULES.filter((rule) => rule.earned(ctx)).map((r) => r.slug);
}
