import { Location } from "@hebcal/core";

/**
 * Curated city list for candle-lighting times — the audience's main cities
 * (France, Israel, and a few diaspora hubs). Matching is accent- and
 * case-insensitive with prefix tolerance; anything unknown falls back to
 * Paris (documented in the profile UI).
 */
type CityDef = {
  name: string;
  lat: number;
  lng: number;
  tz: string;
  cc: string;
  il: boolean;
};

const CITIES: CityDef[] = [
  // France
  {
    name: "Paris",
    lat: 48.8566,
    lng: 2.3522,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Marseille",
    lat: 43.2965,
    lng: 5.3698,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Lyon",
    lat: 45.764,
    lng: 4.8357,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Nice",
    lat: 43.7102,
    lng: 7.262,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Toulouse",
    lat: 43.6047,
    lng: 1.4442,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Strasbourg",
    lat: 48.5734,
    lng: 7.7521,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Bordeaux",
    lat: 44.8378,
    lng: -0.5792,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Lille",
    lat: 50.6292,
    lng: 3.0573,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Nantes",
    lat: 47.2184,
    lng: -1.5536,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Montpellier",
    lat: 43.6108,
    lng: 3.8767,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Grenoble",
    lat: 45.1885,
    lng: 5.7245,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Aix-en-Provence",
    lat: 43.5297,
    lng: 5.4474,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Cannes",
    lat: 43.5528,
    lng: 7.0174,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Antibes",
    lat: 43.5804,
    lng: 7.1251,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Toulon",
    lat: 43.1242,
    lng: 5.928,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Metz",
    lat: 49.1193,
    lng: 6.1757,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Nancy",
    lat: 48.6921,
    lng: 6.1844,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Créteil",
    lat: 48.7904,
    lng: 2.4556,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Sarcelles",
    lat: 48.9723,
    lng: 2.3781,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Boulogne-Billancourt",
    lat: 48.8397,
    lng: 2.2399,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Neuilly-sur-Seine",
    lat: 48.8846,
    lng: 2.2686,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Levallois-Perret",
    lat: 48.8935,
    lng: 2.2874,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Vincennes",
    lat: 48.8478,
    lng: 2.4392,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Saint-Mandé",
    lat: 48.8422,
    lng: 2.4188,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  {
    name: "Villeurbanne",
    lat: 45.7719,
    lng: 4.8902,
    tz: "Europe/Paris",
    cc: "FR",
    il: false,
  },
  // Israel
  {
    name: "Jérusalem",
    lat: 31.7683,
    lng: 35.2137,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  {
    name: "Tel Aviv",
    lat: 32.0853,
    lng: 34.7818,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  {
    name: "Haïfa",
    lat: 32.794,
    lng: 34.9896,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  {
    name: "Netanya",
    lat: 32.3215,
    lng: 34.8532,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  {
    name: "Ashdod",
    lat: 31.8044,
    lng: 34.6553,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  {
    name: "Ashkelon",
    lat: 31.6688,
    lng: 34.5743,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  {
    name: "Raanana",
    lat: 32.1848,
    lng: 34.8713,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  {
    name: "Herzliya",
    lat: 32.1663,
    lng: 34.8436,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  {
    name: "Bat Yam",
    lat: 32.0231,
    lng: 34.7503,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  {
    name: "Rishon LeZion",
    lat: 31.9642,
    lng: 34.8044,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  {
    name: "Beer Sheva",
    lat: 31.2518,
    lng: 34.7913,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  {
    name: "Eilat",
    lat: 29.5581,
    lng: 34.9482,
    tz: "Asia/Jerusalem",
    cc: "IL",
    il: true,
  },
  // Diaspora hubs
  {
    name: "Bruxelles",
    lat: 50.8503,
    lng: 4.3517,
    tz: "Europe/Brussels",
    cc: "BE",
    il: false,
  },
  {
    name: "Genève",
    lat: 46.2044,
    lng: 6.1432,
    tz: "Europe/Zurich",
    cc: "CH",
    il: false,
  },
  {
    name: "Lausanne",
    lat: 46.5197,
    lng: 6.6323,
    tz: "Europe/Zurich",
    cc: "CH",
    il: false,
  },
  {
    name: "Londres",
    lat: 51.5074,
    lng: -0.1278,
    tz: "Europe/London",
    cc: "GB",
    il: false,
  },
  {
    name: "Montréal",
    lat: 45.5017,
    lng: -73.5673,
    tz: "America/Toronto",
    cc: "CA",
    il: false,
  },
  {
    name: "Casablanca",
    lat: 33.5731,
    lng: -7.5898,
    tz: "Africa/Casablanca",
    cc: "MA",
    il: false,
  },
  {
    name: "Tunis",
    lat: 36.8065,
    lng: 10.1815,
    tz: "Africa/Tunis",
    cc: "TN",
    il: false,
  },
  {
    name: "Djerba",
    lat: 33.8076,
    lng: 10.8451,
    tz: "Africa/Tunis",
    cc: "TN",
    il: false,
  },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-'\s]+/g, " ")
    .trim();
}

export type ResolvedLocation = {
  location: Location;
  cityName: string;
  matched: boolean;
  inIsrael: boolean;
};

const PARIS = CITIES[0];

function toLocation(city: CityDef): Location {
  return new Location(city.lat, city.lng, city.il, city.tz, city.name, city.cc);
}

/** Resolve a free-text profile city to a hebcal Location (Paris fallback). */
export function resolveLocation(city: string | null): ResolvedLocation {
  if (city) {
    const wanted = normalize(city);
    if (wanted.length >= 3) {
      const exact = CITIES.find((c) => normalize(c.name) === wanted);
      const fuzzy =
        exact ??
        CITIES.find(
          (c) =>
            normalize(c.name).startsWith(wanted) ||
            wanted.startsWith(normalize(c.name)),
        );
      if (fuzzy) {
        return {
          location: toLocation(fuzzy),
          cityName: fuzzy.name,
          matched: true,
          inIsrael: fuzzy.il,
        };
      }
    }
  }
  return {
    location: toLocation(PARIS),
    cityName: PARIS.name,
    matched: false,
    inIsrael: false,
  };
}

export const KNOWN_CITIES = CITIES.map((c) => c.name);
