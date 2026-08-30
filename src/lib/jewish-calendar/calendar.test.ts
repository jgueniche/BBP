import { describe, expect, it } from "vitest";

import {
  activePostFeast,
  computeCalendarDays,
  DEFAULT_CALENDAR_SETTINGS,
  feastEnds,
  type CalendarSettings,
} from "./engine";
import { resolveLocation } from "./locations";

const PARIS: CalendarSettings = { ...DEFAULT_CALENDAR_SETTINGS };

function year2027(settings: CalendarSettings = PARIS) {
  return computeCalendarDays("2027-01-01", 365, settings);
}

function day(days: ReturnType<typeof year2027>, date: string) {
  const found = days.find((d) => d.date === date);
  if (!found) throw new Error(`day ${date} missing`);
  return found;
}

// DoD session 13: hebcal output checked against independently known 2027
// dates (Pourim 23/03, Pessah I 22/04, Chavouot 11/06, Ticha BeAv 12/08,
// Roch Hachana 02/10, Kippour 11/10, Souccot 16/10, Hanouka 25/12).
describe("2027 reference dates (DoD)", () => {
  const days = year2027();

  it("places Pourim on March 23 as a feast without chag rules", () => {
    const pourim = day(days, "2027-03-23");
    expect(pourim.holidays).toContain("Purim");
    expect(pourim.isFeast).toBe(true);
    expect(pourim.isChag).toBe(false);
  });

  it("covers all of Pessah from erev April 21 to April 29 (diaspora)", () => {
    expect(day(days, "2027-04-21").isPessah).toBe(true); // erev — hametz out
    expect(day(days, "2027-04-22").isChag).toBe(true); // Pessah I
    expect(day(days, "2027-04-25").isPessah).toBe(true); // chol hamoed
    expect(day(days, "2027-04-25").isChag).toBe(false);
    expect(day(days, "2027-04-29").isChag).toBe(true); // Pessah VIII
    expect(day(days, "2027-04-29").isPessah).toBe(true);
    expect(day(days, "2027-04-30").isPessah).toBe(false);
    expect(day(days, "2027-05-21").isPessah).toBe(false); // Pessah Sheni
  });

  it("marks Chavouot June 11-12 as chag lacté", () => {
    expect(day(days, "2027-06-11").isChavouot).toBe(true);
    expect(day(days, "2027-06-11").isChag).toBe(true);
    expect(day(days, "2027-06-12").isChag).toBe(true); // diaspora day II
  });

  it("keeps Ticha BeAv (Aug 12) as a fast even with minor fasts off", () => {
    expect(day(days, "2027-08-12").isFast).toBe(true);
    expect(day(days, "2027-08-11").isFast).toBe(false); // erev: daytime is normal
  });

  it("hides minor fasts by default and shows them when opted in", () => {
    expect(day(days, "2027-07-22").isFast).toBe(false); // 17 Tamouz, opt-out
    const withMinor = computeCalendarDays("2027-07-01", 31, {
      ...PARIS,
      minorFasts: true,
    });
    expect(day(withMinor, "2027-07-22").isFast).toBe(true);
    const tichri = computeCalendarDays("2027-10-01", 10, {
      ...PARIS,
      minorFasts: true,
    });
    expect(day(tichri, "2027-10-04").isFast).toBe(true); // Tzom Guedalia
  });

  it("marks Roch Hachana Oct 2-3 and Kippour Oct 11 (chag + fast, no kiff)", () => {
    expect(day(days, "2027-10-02").isChag).toBe(true);
    expect(day(days, "2027-10-03").isChag).toBe(true);
    const kippour = day(days, "2027-10-11");
    expect(kippour.isChag).toBe(true);
    expect(kippour.isFast).toBe(true);
    expect(kippour.isFeast).toBe(false);
    expect(day(days, "2027-10-16").isChag).toBe(true); // Souccot I
    expect(day(days, "2027-10-24").isChag).toBe(true); // Simhat Torah
  });

  it("lights Hanouka from December 25 with budget kiff", () => {
    const first = day(days, "2027-12-25");
    expect(first.isHanouka).toBe(true);
    expect(first.isFeast).toBe(true);
    expect(first.isChag).toBe(false); // no chag rules on Hanouka
  });

  it("gives every Friday a candle time and every Saturday a havdalah", () => {
    const fridays = days.filter(
      (d) => new Date(`${d.date}T12:00:00Z`).getUTCDay() === 5,
    );
    expect(fridays.length).toBeGreaterThan(50);
    expect(fridays.every((d) => d.candleTime !== null)).toBe(true);
    const saturdays = days.filter(
      (d) => new Date(`${d.date}T12:00:00Z`).getUTCDay() === 6,
    );
    // Havdalah can be replaced by chag candle-lighting when yom tov follows.
    expect(
      saturdays.filter((d) => d.havdalahTime !== null).length,
    ).toBeGreaterThan(45);
  });
});

describe("Israel option", () => {
  const il = year2027({ ...PARIS, city: "Tel Aviv" });

  it("ends Pessah on April 28 (7 days) in Israel", () => {
    expect(day(il, "2027-04-28").isChag).toBe(true); // Pessah VII
    expect(day(il, "2027-04-29").isPessah).toBe(false);
  });

  it("keeps Chavouot to one day in Israel", () => {
    expect(day(il, "2027-06-11").isChag).toBe(true);
    expect(day(il, "2027-06-12").isChag).toBe(false);
  });

  it("is inferred from an Israeli city and honored via the explicit flag", () => {
    expect(resolveLocation("tel aviv").inIsrael).toBe(true);
    const flagged = year2027({ ...PARIS, israelCalendar: true });
    expect(day(flagged, "2027-04-29").isPessah).toBe(false);
  });
});

describe("locations", () => {
  it("matches cities fuzzily and falls back to Paris", () => {
    expect(resolveLocation("marseille").cityName).toBe("Marseille");
    expect(resolveLocation("Neuilly").cityName).toBe("Neuilly-sur-Seine");
    expect(resolveLocation("jerusalem").cityName).toBe("Jérusalem");
    expect(resolveLocation("Trifouillis").matched).toBe(false);
    expect(resolveLocation("Trifouillis").cityName).toBe("Paris");
    expect(resolveLocation(null).cityName).toBe("Paris");
  });

  it("shifts candle times with the configured offset", () => {
    const at18 = computeCalendarDays("2027-06-04", 1, PARIS);
    const at40 = computeCalendarDays("2027-06-04", 1, {
      ...PARIS,
      candleOffsetMin: 40,
    });
    expect(at18[0].candleTime).not.toBeNull();
    expect(at40[0].candleTime).not.toBeNull();
    expect(at40[0].candleTime! < at18[0].candleTime!).toBe(true);
  });
});

describe("après-fêtes windows", () => {
  const days = year2027();

  it("does not end Tichri at the Roch Hachana gap", () => {
    const ends = feastEnds(days);
    const tichri = ends.filter((e) => e.feast === "tichri");
    expect(tichri).toHaveLength(1);
    expect(tichri[0].endedOn).toBe("2027-10-24"); // Simhat Torah
  });

  it("opens a 7-day window after Pessah and closes it", () => {
    expect(activePostFeast(days, "2027-05-02")?.feast).toBe("pessah");
    expect(activePostFeast(days, "2027-04-29")).toBeNull(); // still Pessah
    expect(activePostFeast(days, "2027-05-08")).toBeNull(); // window over
  });

  it("opens the window after Simhat Torah and Hanouka", () => {
    expect(activePostFeast(days, "2027-10-26")?.feast).toBe("tichri");
    expect(activePostFeast(days, "2027-11-05")).toBeNull();
    const withJan = computeCalendarDays("2027-12-01", 60, PARIS);
    expect(activePostFeast(withJan, "2028-01-04")?.feast).toBe("hanouka");
  });
});
