import type { PlanContext, PlanSlot, PlanViolation } from "./types";
import { MEAL_SHARES, MEAL_TIMES } from "./week";

const TARGET_TOLERANCE = 0.1;
/** Only judge a day's calories when planned slots carry most of the target. */
const MIN_SHARE_FOR_TARGET_CHECK = 0.7;

function isChabbatFriendly(slot: PlanSlot): boolean {
  return slot.isLeftover || slot.tags.includes("chabbat");
}

/**
 * Programmatic kosher/calendar/target validation (brief §5 and §8).
 * The planner — AI or fallback — must produce zero violations; the UI blocks
 * manual edits that would introduce one.
 */
export function validatePlan(
  slots: PlanSlot[],
  ctx: PlanContext,
): PlanViolation[] {
  const violations: PlanViolation[] = [];
  const byDate = new Map<string, PlanSlot[]>();
  for (const slot of slots) {
    const list = byDate.get(slot.date) ?? [];
    list.push(slot);
    byDate.set(slot.date, list);
  }

  for (const [date, daySlots] of byDate) {
    const ordered = [...daySlots].sort(
      (a, b) => MEAL_TIMES[a.meal] - MEAL_TIMES[b.meal],
    );

    // Meat → dairy (and dairy → meat) wait between meals of the same day.
    for (let i = 0; ctx.kashrutEnabled && i < ordered.length; i += 1) {
      for (let j = i + 1; j < ordered.length; j += 1) {
        const earlier = ordered[i];
        const later = ordered[j];
        const gap = MEAL_TIMES[later.meal] - MEAL_TIMES[earlier.meal];
        if (
          earlier.kashrutClass === "bassari" &&
          later.kashrutClass === "halavi" &&
          gap < ctx.meatToDairyWaitHours
        ) {
          violations.push({
            date,
            meal: later.meal,
            rule: "meat_dairy_wait",
            message: `${later.title} (halavi) arrive ${gap} h après un repas bassari — délai requis : ${ctx.meatToDairyWaitHours} h.`,
          });
        }
        if (
          earlier.kashrutClass === "halavi" &&
          later.kashrutClass === "bassari" &&
          gap < ctx.dairyToMeatWaitHours
        ) {
          violations.push({
            date,
            meal: later.meal,
            rule: "meat_dairy_wait",
            message: `${later.title} (bassari) arrive trop vite après un repas halavi.`,
          });
        }
      }
    }

    // Fast days: no daytime meals planned.
    if (ctx.fastDates.has(date)) {
      for (const slot of ordered) {
        if (slot.meal === "petit_dej" || slot.meal === "dej") {
          violations.push({
            date,
            meal: slot.meal,
            rule: "fast_day",
            message: `Jour de jeûne : aucun repas ne doit être planifié en journée (${slot.title}).`,
          });
        }
      }
    }

    // Pessah: no hametz; kitniyot only if the user eats them.
    if (ctx.kashrutEnabled && ctx.pessahDates.has(date)) {
      for (const slot of ordered) {
        if (slot.hasHametz) {
          violations.push({
            date,
            meal: slot.meal,
            rule: "pessah_hametz",
            message: `${slot.title} contient du hametz pendant Pessah.`,
          });
        }
        if (!ctx.eatsKitniyot && slot.hasKitniyot) {
          violations.push({
            date,
            meal: slot.meal,
            rule: "pessah_kitniyot",
            message: `${slot.title} contient des kitniyot (profil sans kitniyot à Pessah).`,
          });
        }
      }
    }

    // Calorie target ±10% on the planned share of the day.
    if (ctx.calorieTarget !== null && !ctx.fastDates.has(date)) {
      const withKcal = ordered.filter((slot) => slot.kcal !== null);
      if (withKcal.length === ordered.length && ordered.length > 0) {
        const share = ordered.reduce(
          (sum, slot) => sum + MEAL_SHARES[slot.meal],
          0,
        );
        if (share >= MIN_SHARE_FOR_TARGET_CHECK) {
          const planned = ordered.reduce(
            (sum, slot) => sum + (slot.kcal ?? 0) * slot.servings,
            0,
          );
          const expected = ctx.calorieTarget * share;
          if (Math.abs(planned - expected) / expected > TARGET_TOLERANCE) {
            violations.push({
              date,
              meal: null,
              rule: "calorie_target",
              message: `${Math.round(planned)} kcal planifiées pour une cible de ${Math.round(expected)} (±10 %).`,
            });
          }
        }
      }
    }
  }

  // Chabbat: Friday dinner and Saturday lunch are mandatory, and Saturday
  // lunch must be meal-prepped (leftover or a chabbat dish) — no cooking.
  if (ctx.shomerShabbat) {
    const friday = new Date(`${ctx.weekStart}T00:00:00Z`);
    friday.setUTCDate(friday.getUTCDate() + 4);
    const fridayStr = friday.toISOString().slice(0, 10);
    const saturday = new Date(friday.getTime() + 86_400_000);
    const saturdayStr = saturday.toISOString().slice(0, 10);

    const fridayDinner = slots.find(
      (slot) => slot.date === fridayStr && slot.meal === "diner",
    );
    const saturdayLunch = slots.find(
      (slot) => slot.date === saturdayStr && slot.meal === "dej",
    );
    if (!fridayDinner) {
      violations.push({
        date: fridayStr,
        meal: "diner",
        rule: "chabbat_missing",
        message: "Le dîner de chabbat (vendredi soir) n'est pas planifié.",
      });
    }
    if (!saturdayLunch) {
      violations.push({
        date: saturdayStr,
        meal: "dej",
        rule: "chabbat_missing",
        message: "Le déjeuner de chabbat (samedi midi) n'est pas planifié.",
      });
    } else if (!isChabbatFriendly(saturdayLunch)) {
      violations.push({
        date: saturdayStr,
        meal: "dej",
        rule: "chabbat_cooking",
        message: `${saturdayLunch.title} demande de cuisiner samedi : prévois un plat de chabbat ou des restes préparés avant.`,
      });
    }
  }

  return violations;
}
