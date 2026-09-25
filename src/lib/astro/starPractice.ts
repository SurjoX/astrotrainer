import rawStars from "@/data/star-practice.json";
import { getConstellation, stars } from "@/lib/astro/catalog";
import type { ViewState } from "@/lib/astro/projection";
import type { Constellation, Difficulty } from "@/lib/astro/types";

export interface StarPracticeEntry {
  id: string;
  hip: number;
  name: string | null;
  bayer: string | null;
  constellation: string;
  constellationName: string;
  ra: number;
  dec: number;
  magnitude: number;
  difficulty: "easy" | "hard";
  traditionalName: string | null;
  spectralType: string | null;
  distance: string | null;
  aliases: string[];
  notes: string | null;
}

export interface StarPracticeQuestion {
  id: string;
  star: StarPracticeEntry;
  difficulty: Difficulty;
  view: ViewState;
}

export type StarPracticeNameType = "common" | "bayer";

export interface StarPracticeModeConfig {
  fov: number;
  viewportOffsetDeg: number;
}

export const STAR_LOCATION_TOLERANCE_DEG = 3.5;

const EASY_STAR_KEYS = new Set([
  "alpheratz",
  "caph",
  "algenib",
  "ankaa",
  "schedar",
  "diphda",
  "achird",
  "ruchbah",
  "mirach",
  "revati",
  "achernar",
  "mothallah",
  "mesarthim",
  "sheratan",
  "alrescha",
  "almach",
  "hamal",
  "mira",
  "polaris",
  "miram",
  "menkar",
  "algol",
  "mirfak",
  "cursa",
  "alcyone",
  "prima hyadum",
  "ain",
  "aldebaran",
  "rigel",
  "capella",
  "bellatrix",
  "elnath",
  "nihal",
  "mintaka",
  "arneb",
  "meissa",
  "alnilam",
  "alnitak",
  "saiph",
  "betelgeuse",
  "menkalinan",
  "mirzam",
  "canopus",
  "alhena",
  "sirius",
  "adhara",
  "wezen",
  "wasat",
  "aludra",
  "gomeisa",
  "castor",
  "procyon",
  "pollux",
  "miaplacidus",
  "alsephina",
  "markeb",
  "alphard",
  "rasalas",
  "regulus",
  "adhafera",
  "algieba",
  "merak",
  "dubhe",
  "zosma",
  "chertan",
  "denebola",
  "phecda",
  "alchiba",
  "gienah",
  "porrima",
  "algorab",
  "chara",
  "alioth",
  "vindemiatrix",
  "mizar",
  "spica",
  "heze",
  "alkaid",
  "muphrid",
  "hadar",
  "thuban",
  "menkent",
  "arcturus",
  "seginus",
  "toliman",
  "rigil kentaurus",
  "izar",
  "kochab",
  "zubenelgenubi",
  "zubeneschamali",
  "pherkad",
  "alphecca",
  "unukalhai",
  "dschubba",
  "antares",
  "cebalrai",
  "eltanin",
  "rasalhague",
  "sargas",
  "shaula",
  "vega",
  "kaus australis",
  "kaus borealis",
  "nunki",
  "sulafat",
  "ascella",
  "tarazed",
  "altair",
  "alshain",
  "deneb",
  "albireo",
  "sadr",
  "alderamin",
  "alnair",
  "skat",
  "fomalhaut",
  "markab",
  "enif",
  "scheat",
  "sadalsuud",
  "sadalmelik",
  "peacock",
  "alp and",
  "bet cas",
  "gam peg",
  "alp phe",
  "alp cas",
  "bet cet",
  "eta cas",
  "del cas",
  "bet and",
  "zet psc",
  "alp eri",
  "alp tri",
  "gam 2 ari",
  "bet ari",
  "alp psc",
  "gam 1 and",
  "alp ari",
  "omi cet",
  "alp umi",
  "eta per",
  "alp cet",
  "bet per",
  "alp per",
  "bet eri",
  "eta tau",
  "gam tau",
  "eps tau",
  "alp tau",
  "bet ori",
  "alp aur",
  "gam ori",
  "bet tau",
  "bet lep",
  "del ori",
  "alp lep",
  "lam ori",
  "eps ori",
  "zet ori",
  "kap ori",
  "alp ori",
  "bet aur",
  "bet cma",
  "alp car",
  "gam gem",
  "alp cma",
  "eps cma",
  "del cma",
  "del gem",
  "eta cma",
  "bet cmi",
  "alp gem",
  "alp cmi",
  "bet gem",
  "bet car",
  "del vel",
  "kap vel",
  "alp hya",
  "mu leo",
  "alp leo",
  "zet leo",
  "gam 1 leo",
  "bet uma",
  "alp uma",
  "del leo",
  "the leo",
  "bet leo",
  "gam uma",
  "alp crv",
  "gam crv",
  "gam vir",
  "del crv",
  "bet cvn",
  "eps uma",
  "eps vir",
  "zet uma",
  "alp vir",
  "zet vir",
  "eta uma",
  "eta boo",
  "bet cen",
  "alp dra",
  "the cen",
  "alp boo",
  "gam boo",
  "alp 2 cen",
  "alp 1 cen",
  "eps boo",
  "bet umi",
  "alp 2 lib",
  "bet lib",
  "gam umi",
  "alp crb",
  "alp ser",
  "del sco",
  "alp sco",
  "bet oph",
  "gam dra",
  "alp oph",
  "the sco",
  "lam sco",
  "alp lyr",
  "eps sgr",
  "lam sgr",
  "sig sgr",
  "gam lyr",
  "zet sgr",
  "gam aql",
  "alp aql",
  "bet aql",
  "alp cyg",
  "bet 1 cyg",
  "gam cyg",
  "alp cep",
  "alp gru",
  "del aqr",
  "alp psa",
  "alp peg",
  "eps peg",
  "bet peg",
  "bet aqr",
  "alp aqr",
  "alp pav",
]);

function normalizeStarIdentityKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyStarDifficulty(
  entry: Pick<StarPracticeEntry, "name" | "bayer" | "constellation" | "aliases">,
): "easy" | "hard" {
  const keys = new Set<string>();
  if (entry.name) keys.add(normalizeStarIdentityKey(entry.name));
  if (entry.bayer && entry.constellation) {
    keys.add(normalizeStarIdentityKey(`${entry.bayer} ${entry.constellation}`));
  }
  for (const alias of entry.aliases) {
    const normalized = normalizeStarIdentityKey(alias);
    if (normalized) keys.add(normalized);
  }

  for (const key of keys) {
    if (EASY_STAR_KEYS.has(key)) {
      return "easy";
    }
  }

  return "hard";
}

export const STAR_PRACTICE_MODE_CONFIG: Record<Difficulty, StarPracticeModeConfig> = {
  beginner: { fov: 38, viewportOffsetDeg: 7 },
  intermediate: { fov: 38, viewportOffsetDeg: 9 },
  advanced: { fov: 40, viewportOffsetDeg: 10 },
};

export function getStarPracticeModeConfig(difficulty: Difficulty): StarPracticeModeConfig {
  return STAR_PRACTICE_MODE_CONFIG[difficulty] ?? STAR_PRACTICE_MODE_CONFIG.beginner;
}

const BAYER_TO_ENGLISH: Record<string, string> = {
  Alp: "Alpha",
  Bet: "Beta",
  Gam: "Gamma",
  Del: "Delta",
  Eps: "Epsilon",
  Zet: "Zeta",
  Eta: "Eta",
  The: "Theta",
  Iot: "Iota",
  Kap: "Kappa",
  Lam: "Lambda",
  Mu: "Mu",
  Nu: "Nu",
  Xi: "Xi",
  Omi: "Omicron",
  Pi: "Pi",
  Rho: "Rho",
  Sig: "Sigma",
  Tau: "Tau",
  Ups: "Upsilon",
  Phi: "Phi",
  Chi: "Chi",
  Psi: "Psi",
  Ome: "Omega",
};

const GREEK_MAP: Record<string, string> = {
  α: "alpha",
  ά: "alpha",
  β: "beta",
  γ: "gamma",
  δ: "delta",
  ε: "epsilon",
  ζ: "zeta",
  η: "eta",
  θ: "theta",
  ι: "iota",
  κ: "kappa",
  λ: "lambda",
  μ: "mu",
  ν: "nu",
  ξ: "xi",
  ο: "omicron",
  π: "pi",
  ρ: "rho",
  σ: "sigma",
  ς: "sigma",
  τ: "tau",
  υ: "upsilon",
  φ: "phi",
  χ: "chi",
  ψ: "psi",
  ω: "omega",
};

type RawStarPracticeEntry = {
  id: string;
  hip: number;
  name: string | null;
  bayer: string | null;
  constellation: string;
  constellationName: string;
  ra: number;
  dec: number;
  magnitude: number;
  traditionalName: string | null;
  spectralType: string | null;
  distance: string | null;
  aliases: string[];
  notes: string | null;
};

const legacyStarPracticeCatalog: StarPracticeEntry[] = (rawStars as RawStarPracticeEntry[])
  .map((entry) => ({
    ...entry,
    difficulty: classifyStarDifficulty({
      name: entry.name,
      bayer: entry.bayer,
      constellation: entry.constellation,
      aliases: entry.aliases,
    }),
    aliases: Array.from(new Set(entry.aliases.map((alias) => alias.trim()).filter(Boolean))),
  }))
  .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));

const legacyHipIds = new Set(legacyStarPracticeCatalog.map((entry) => entry.hip));
const bayerOnlyPracticeHips = new Set([
  39953, 61932, 66657, 71860, 71352, 86670, 81377, 68002, 59196, 73273, 52727, 61585,
]);

const generatedStarPracticeCatalog: StarPracticeEntry[] = stars
  .filter(
    (star) =>
      star.constellation &&
      star.bayer &&
      star.magnitude <= 3.5 &&
      (Boolean(star.name) || bayerOnlyPracticeHips.has(star.hip)) &&
      !legacyHipIds.has(star.hip),
  )
  .map((star) => ({
    id: `hip-${star.hip}`,
    hip: star.hip,
    name: star.name,
    bayer: star.bayer,
    constellation: star.constellation!,
    constellationName: getConstellation(star.constellation!)?.name ?? star.constellation!,
    ra: star.ra,
    dec: star.dec,
    magnitude: star.magnitude,
    difficulty: classifyStarDifficulty({
      name: star.name,
      bayer: star.bayer,
      constellation: star.constellation!,
      aliases: [...(star.name ? [star.name] : []), `${star.bayer} ${star.constellation}`],
    }),
    traditionalName: null,
    spectralType: star.spectralType,
    distance: null,
    aliases: [...(star.name ? [star.name] : []), `${star.bayer} ${star.constellation}`],
    notes: null,
  }));

export const starPracticeCatalog: StarPracticeEntry[] = [
  ...legacyStarPracticeCatalog,
  ...generatedStarPracticeCatalog,
].sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));

const starPracticeById = new Map(starPracticeCatalog.map((entry) => [entry.id, entry]));

export function getStarPracticeEntry(id: string): StarPracticeEntry | undefined {
  return starPracticeById.get(id);
}

export function getStarConstellation(
  star: Pick<StarPracticeEntry, "constellation">,
): Constellation | undefined {
  return getConstellation(star.constellation);
}

export function getStarPracticeEligiblePool(
  type: StarPracticeNameType,
  difficulty?: Difficulty,
): StarPracticeEntry[] {
  const namedPool = starPracticeCatalog.filter((entry) =>
    type === "common" ? Boolean(entry.name?.trim()) : Boolean(entry.bayer?.trim()),
  );

  if (difficulty === "beginner") return namedPool.filter((entry) => entry.difficulty === "easy");
  if (difficulty === "intermediate") {
    return namedPool.filter((entry) => entry.difficulty === "hard");
  }
  return namedPool;
}

export function shuffleStarPracticePool(
  type: StarPracticeNameType,
  difficulty?: Difficulty,
): StarPracticeEntry[] {
  const shuffled = [...getStarPracticeEligiblePool(type, difficulty)];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

function normalizeText(value: string): string {
  if (!value) return "";

  const withGreekNames = Array.from(value.normalize("NFKD"))
    .map((char) => GREEK_MAP[char] ?? char)
    .join("");

  return withGreekNames
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_+/()[\]{}.,:'"`-]+/g, " ")
    .replace(/\balf\b/g, "alp")
    .replace(/\balfa\b/g, "alp")
    .replace(/\balpha\b/g, "alp")
    .replace(/\bbeta\b/g, "bet")
    .replace(/\bgamma\b/g, "gam")
    .replace(/\bdelta\b/g, "del")
    .replace(/\bepsilon\b/g, "eps")
    .replace(/\bzeta\b/g, "zet")
    .replace(/\beta\b/g, "eta")
    .replace(/\btheta\b/g, "the")
    .replace(/\biota\b/g, "iot")
    .replace(/\bkappa\b/g, "kap")
    .replace(/\blambda\b/g, "lam")
    .replace(/\bmu\b/g, "mu")
    .replace(/\bnu\b/g, "nu")
    .replace(/\bxi\b/g, "xi")
    .replace(/\bomicron\b/g, "omi")
    .replace(/\bpi\b/g, "pi")
    .replace(/\brho\b/g, "rho")
    .replace(/\bsigma\b/g, "sig")
    .replace(/\btau\b/g, "tau")
    .replace(/\bupsilon\b/g, "ups")
    .replace(/\bphi\b/g, "phi")
    .replace(/\bchi\b/g, "chi")
    .replace(/\bpsi\b/g, "psi")
    .replace(/\bomega\b/g, "ome")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAnswer(value: string | null | undefined): string {
  return normalizeText(value ?? "");
}

export function getStarPracticeName(
  star: Pick<StarPracticeEntry, "name" | "bayer" | "constellationName" | "constellation">,
  type: StarPracticeNameType,
): string {
  if (type === "bayer") {
    if (!star.bayer) return star.name || star.constellationName;
    const [letter, suffix] = star.bayer.split("-");
    const english = `${BAYER_TO_ENGLISH[letter!] ?? letter}${suffix ? `-${suffix}` : ""}`;
    return `${english} ${star.constellationName || star.constellation}`;
  }
  return star.name || "Unknown star";
}

export function getStarPracticeAnswerOptions(
  star: Pick<
    StarPracticeEntry,
    "name" | "aliases" | "bayer" | "constellation" | "constellationName"
  >,
  type: StarPracticeNameType,
): string[] {
  const options = new Set<string>();

  if (type === "common") {
    if (star.name) options.add(normalizeAnswer(star.name));
    for (const alias of star.aliases) {
      if (alias) options.add(normalizeAnswer(alias));
    }
    return [...options];
  }

  if (star.bayer) {
    const [letter, suffix] = star.bayer.split("-");
    const english = `${BAYER_TO_ENGLISH[letter!] ?? letter}${suffix ? `-${suffix}` : ""}`;
    const fullEnglish = `${english} ${star.constellationName || star.constellation}`;
    const fullLatin = `${star.bayer} ${star.constellationName || star.constellation}`;
    const shortLatin = `${star.bayer} ${star.constellation.slice(0, 1)}`;
    options.add(normalizeAnswer(fullEnglish));
    options.add(normalizeAnswer(fullLatin));
    options.add(normalizeAnswer(star.bayer));
    options.add(normalizeAnswer(shortLatin));
  }

  for (const alias of star.aliases) {
    const normalized = normalizeAnswer(alias);
    if (
      normalized.includes("alpha") ||
      normalized.includes("beta") ||
      normalized.includes("gamma") ||
      normalized.includes("delta") ||
      normalized.includes("epsilon") ||
      normalized.includes("zeta") ||
      normalized.includes("eta") ||
      normalized.includes("theta") ||
      normalized.includes("iota") ||
      normalized.includes("kappa") ||
      normalized.includes("lambda") ||
      normalized.includes("mu") ||
      normalized.includes("nu") ||
      normalized.includes("xi") ||
      normalized.includes("omicron") ||
      normalized.includes("pi") ||
      normalized.includes("rho") ||
      normalized.includes("sigma") ||
      normalized.includes("tau") ||
      normalized.includes("upsilon") ||
      normalized.includes("phi") ||
      normalized.includes("chi") ||
      normalized.includes("psi") ||
      normalized.includes("omega")
    ) {
      options.add(normalized);
    }
  }

  return [...options];
}

export function matchesStarAnswer(
  star: Pick<
    StarPracticeEntry,
    "name" | "aliases" | "bayer" | "constellation" | "constellationName"
  >,
  answer: string | null | undefined,
  type: StarPracticeNameType = "common",
): boolean {
  const input = normalizeAnswer(answer);
  if (!input) return false;

  return getStarPracticeAnswerOptions(star, type).includes(input);
}

function offsetSkyPosition(ra: number, dec: number, distanceDeg: number, bearingDeg: number) {
  const distance = (distanceDeg * Math.PI) / 180;
  const bearing = (bearingDeg * Math.PI) / 180;
  const latitude = (dec * Math.PI) / 180;
  const longitude = (ra * Math.PI) / 180;
  const nextLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(distance) +
      Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing),
  );
  const nextLongitude =
    longitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude),
      Math.cos(distance) - Math.sin(latitude) * Math.sin(nextLatitude),
    );

  return {
    ra: ((((nextLongitude * 180) / Math.PI) % 360) + 360) % 360,
    dec: (nextLatitude * 180) / Math.PI,
  };
}

export function buildStarPracticeQuestion(
  forcedId?: string,
  difficulty: Difficulty = "beginner",
): StarPracticeQuestion {
  const star = (forcedId ? getStarPracticeEntry(forcedId) : undefined) ?? starPracticeCatalog[0]!;
  const config = getStarPracticeModeConfig(difficulty);
  const center = offsetSkyPosition(
    star.ra,
    star.dec,
    config.viewportOffsetDeg + Math.random() * 5,
    Math.random() * 360,
  );

  return {
    id: `${star.id}-${difficulty}-${Math.random().toString(36).slice(2, 8)}`,
    star,
    difficulty,
    view: {
      ra: center.ra,
      dec: center.dec,
      fov: config.fov,
      rotation: (Math.random() - 0.5) * 55,
    },
  };
}

export function validateStarCatalog(): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  const seenCoordinates = new Map<string, string>();

  for (const entry of starPracticeCatalog) {
    if (!entry.id) errors.push("Star practice entry missing id");
    if (seen.has(entry.id)) errors.push(`Duplicate star practice id: ${entry.id}`);
    seen.set(entry.id, entry.name ?? "");

    const coordinateKey = `${entry.ra.toFixed(5)}:${entry.dec.toFixed(5)}`;
    if (seenCoordinates.has(coordinateKey)) {
      errors.push(
        `Duplicate star coordinates: ${entry.id} and ${seenCoordinates.get(coordinateKey)}`,
      );
    }
    seenCoordinates.set(coordinateKey, entry.id);

    if (entry.ra < 0 || entry.ra >= 360) errors.push(`${entry.id}: RA out of range (${entry.ra})`);
    if (entry.dec < -90 || entry.dec > 90)
      errors.push(`${entry.id}: Dec out of range (${entry.dec})`);
    if (!(entry.magnitude > -3 && entry.magnitude < 15))
      errors.push(`${entry.id}: implausible magnitude (${entry.magnitude})`);
    if (entry.bayer == null) errors.push(`${entry.id}: missing Bayer designation`);
    if (entry.name == null && entry.aliases.length === 0)
      errors.push(`${entry.id}: missing aliases`);
    if (!getConstellation(entry.constellation))
      errors.push(`${entry.id}: unknown constellation ${entry.constellation}`);
  }

  return errors;
}
