export type KashrutClass = "bassari" | "halavi" | "parve";

export function classifyMeal(itemClasses: Array<KashrutClass | null>): {
  kashrutClass: KashrutClass | null;
  conflict: boolean;
  uncertain: boolean;
} {
  const known = itemClasses.filter((c): c is KashrutClass => c !== null);
  const uncertain = known.length < itemClasses.length;
  const hasBassari = known.includes("bassari");
  const hasHalavi = known.includes("halavi");

  if (hasBassari && hasHalavi) {
    return { kashrutClass: null, conflict: true, uncertain };
  }
  if (hasBassari)
    return { kashrutClass: "bassari", conflict: false, uncertain };
  if (hasHalavi) return { kashrutClass: "halavi", conflict: false, uncertain };
  if (known.length > 0) {
    return { kashrutClass: "parve", conflict: false, uncertain };
  }
  return { kashrutClass: null, conflict: false, uncertain };
}

export function meatWaitEnd(lastBassariAt: Date, waitHours: number): Date {
  return new Date(lastBassariAt.getTime() + waitHours * 3_600_000);
}

export function meatWaitStatus(
  lastBassariAt: Date | null,
  waitHours: number,
  now: Date = new Date(),
): { active: boolean; remainingMinutes: number; endsAt: Date | null } {
  if (!lastBassariAt) {
    return { active: false, remainingMinutes: 0, endsAt: null };
  }
  const endsAt = meatWaitEnd(lastBassariAt, waitHours);
  const remainingMs = endsAt.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return { active: false, remainingMinutes: 0, endsAt };
  }
  return {
    active: true,
    remainingMinutes: Math.ceil(remainingMs / 60_000),
    endsAt,
  };
}
