import { angularSeparation, centroid, constellationById, starById, stars } from "./catalog";
import type { Constellation, Season, Star } from "./types";

/**
 * Asterisms are recognisable star patterns that are **not** an official IAU
 * category. Unlike the 88 constellations there is no single authoritative
 * catalogue, so every entry records how well established it is and, where the
 * sources disagree, the alternative definitions are kept explicitly rather than
 * silently merged.
 *
 * Stars are never duplicated here: each `principalStars` entry is a designation
 * resolved against the shared Bright Star / HYG catalog in `catalog.ts`.
 */

export const ASTERISM_CATEGORIES = [
  "Seasonal",
  "Circumpolar",
  "Constellation-based",
  "Cross-constellation",
  "Bright-star pattern",
  "Deep-sky / cluster asterism",
  "Traditional",
  "Navigational",
] as const;

export type AsterismCategory = (typeof ASTERISM_CATEGORIES)[number];

/** How firmly the pattern is established in observational literature. */
export type Recognition =
  "Widely recognised" | "Traditional" | "Observational pattern" | "Cluster asterism";

export type AsterismDifficulty = "beginner" | "intermediate" | "advanced";
export type Hemisphere = "north" | "south" | "both";

export interface AlternateDefinition {
  /** Where this variant definition comes from */
  source: string;
  /** Star designations of that variant */
  principalStars: string[];
  note?: string;
}

export interface AsterismDef {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  /** IAU constellation ids (lowercase abbreviations) the pattern lies in */
  constellations: string[];
  /** Catalog designations, e.g. "Alp UMa", "4 Vul", "HIP 95340" */
  principalStars: string[];
  /** Stars shown for context but not part of the pattern's vertices */
  contextStars?: string[];
  /** Connecting segments as index pairs into `principalStars` */
  lines: [number, number][];
  difficulty: AsterismDifficulty;
  categories: AsterismCategory[];
  recognition: Recognition;
  bestSeason?: Season;
  hemisphere: Hemisphere;
  /** Short descriptor of the pattern's nature, e.g. "Quadrilateral" */
  type: string;
  observationNotes?: string;
  /** Documented disagreement between sources */
  ambiguity?: string;
  alternateDefinitions?: AlternateDefinition[];
}

// ---------------------------------------------------------------------------
// Star designation resolution — no asterism-only star objects exist.
// ---------------------------------------------------------------------------

const byProper = new Map<string, Star>();
const byBayer = new Map<string, Star>();
const byFlamsteed = new Map<string, Star>();
for (const s of stars) {
  if (s.name && !byProper.has(s.name.toLowerCase())) byProper.set(s.name.toLowerCase(), s);
  if (s.bayer && s.constellation) {
    byBayer.set(`${s.bayer.toLowerCase()} ${s.constellation.toLowerCase()}`, s);
    const base = s.bayer.split("-")[0]!.toLowerCase();
    const key = `${base} ${s.constellation.toLowerCase()}`;
    if (!byBayer.has(key)) byBayer.set(key, s);
  }
  if (s.flamsteed && s.constellation) {
    byFlamsteed.set(`${s.flamsteed.toLowerCase()} ${s.constellation.toLowerCase()}`, s);
  }
}

/** Resolve "Alp UMa" / "4 Vul" / "Betelgeuse" / "HIP 95340" to a catalog star. */
export function resolveStarRef(ref: string): Star | undefined {
  const key = ref.trim().toLowerCase();
  if (key.startsWith("hip ")) return starById.get(Number(key.slice(4)));
  return byBayer.get(key) ?? byFlamsteed.get(key) ?? byProper.get(key);
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const asterismDefs: AsterismDef[] = [
  {
    id: "big-dipper",
    name: "Big Dipper",
    aliases: ["The Plough", "The Wagon", "Saptarishi"],
    description:
      "The seven-star bowl-and-handle pattern that forms the hindquarters and tail of Ursa Major. It is the most widely recognised asterism of the northern sky and the classic starting point for star hopping.",
    constellations: ["uma"],
    principalStars: ["Alp UMa", "Bet UMa", "Gam UMa", "Del UMa", "Eps UMa", "Zet UMa", "Eta UMa"],
    contextStars: ["Alcor"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
    difficulty: "beginner",
    categories: ["Constellation-based", "Circumpolar", "Bright-star pattern", "Navigational"],
    recognition: "Widely recognised",
    bestSeason: "Spring",
    hemisphere: "north",
    type: "Dipper / plough",
    observationNotes:
      "Mizar (ζ UMa) has the naked-eye companion Alcor about 12′ away — a classic eyesight test. Dubhe and Merak, the outer bowl stars, are the Pointers: extend the line between them roughly five times to reach Polaris.",
  },
  {
    id: "little-dipper",
    name: "Little Dipper",
    aliases: ["Small Dipper"],
    description:
      "A fainter seven-star dipper occupying the whole of Ursa Minor, with Polaris at the tip of the handle and the bright pair Kochab and Pherkad forming the outer bowl.",
    constellations: ["umi"],
    principalStars: ["Alp UMi", "Del UMi", "Eps UMi", "Zet UMi", "Bet UMi", "Gam UMi", "Eta UMi"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
    difficulty: "intermediate",
    categories: ["Constellation-based", "Circumpolar", "Navigational"],
    recognition: "Widely recognised",
    bestSeason: "Summer",
    hemisphere: "north",
    type: "Dipper",
    observationNotes:
      "Only Polaris, Kochab and Pherkad are brighter than magnitude 3.1; the remaining bowl and handle stars need a reasonably dark sky. Kochab and Pherkad are traditionally called the Guardians of the Pole.",
  },
  {
    id: "northern-cross",
    name: "Northern Cross",
    aliases: ["Cross of Cygnus"],
    description:
      "A large upright cross filling Cygnus: Deneb marks the top, Albireo the foot, and Aljanah and Fawaris the ends of the crossbar, with Sadr at the intersection.",
    constellations: ["cyg"],
    principalStars: ["Alp Cyg", "Gam Cyg", "Bet Cyg", "Eps Cyg", "Del Cyg"],
    lines: [
      [0, 1],
      [1, 2],
      [3, 1],
      [1, 4],
    ],
    difficulty: "beginner",
    categories: ["Constellation-based", "Bright-star pattern", "Seasonal"],
    recognition: "Widely recognised",
    bestSeason: "Summer",
    hemisphere: "north",
    type: "Cross",
    observationNotes:
      "The cross lies along the summer Milky Way; the Great Rift splits the band between Deneb and Albireo. Albireo (β Cyg) is a superb gold-and-blue double in any small telescope.",
  },
  {
    id: "great-square-of-pegasus",
    name: "Great Square of Pegasus",
    aliases: ["The Great Square"],
    description:
      "A large, nearly empty quadrilateral forming the body of Pegasus. Three corners belong to Pegasus while the north-eastern corner, Alpheratz, is officially α Andromedae.",
    constellations: ["peg", "and"],
    principalStars: ["Alp Peg", "Bet Peg", "Alp And", "Gam Peg"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
    difficulty: "beginner",
    categories: ["Cross-constellation", "Seasonal", "Bright-star pattern"],
    recognition: "Widely recognised",
    bestSeason: "Autumn",
    hemisphere: "both",
    type: "Quadrilateral",
    observationNotes:
      "Alpheratz is shared visually with Andromeda but catalogued as α Andromedae, not δ Pegasi (its former designation). Counting the stars visible inside the Square is a standard limiting-magnitude test.",
  },
  {
    id: "summer-triangle",
    name: "Summer Triangle",
    aliases: ["Navigator's Triangle"],
    description:
      "A vast triangle of first-magnitude stars — Vega, Deneb and Altair — that dominates northern summer evenings and straddles the Milky Way.",
    constellations: ["lyr", "cyg", "aql"],
    principalStars: ["Alp Lyr", "Alp Cyg", "Alp Aql"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
    difficulty: "beginner",
    categories: ["Seasonal", "Cross-constellation", "Bright-star pattern", "Navigational"],
    recognition: "Widely recognised",
    bestSeason: "Summer",
    hemisphere: "north",
    type: "Triangle",
    observationNotes:
      "Vega is the brightest of the three and culminates near the zenith from mid-northern latitudes. Deneb is by far the most luminous and most distant vertex.",
  },
  {
    id: "winter-triangle",
    name: "Winter Triangle",
    aliases: ["Great Southern Triangle"],
    description:
      "A near-equilateral triangle formed by Betelgeuse, Sirius and Procyon, three of the brightest stars of the winter evening sky.",
    constellations: ["ori", "cma", "cmi"],
    principalStars: ["Alp Ori", "Alp CMa", "Alp CMi"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
    difficulty: "beginner",
    categories: ["Seasonal", "Cross-constellation", "Bright-star pattern"],
    recognition: "Widely recognised",
    bestSeason: "Winter",
    hemisphere: "both",
    type: "Triangle",
    observationNotes:
      "The winter Milky Way runs through the triangle. Betelgeuse is a semiregular variable, so the triangle's appearance changes slightly from year to year.",
  },
  {
    id: "winter-hexagon",
    name: "Winter Hexagon",
    aliases: ["Winter Circle", "Heavenly G"],
    description:
      "A huge hexagon of six brilliant stars spanning six constellations, enclosing much of the winter evening sky.",
    constellations: ["aur", "gem", "cmi", "cma", "ori", "tau"],
    principalStars: ["Alp Aur", "Bet Gem", "Alp CMi", "Alp CMa", "Bet Ori", "Alp Tau"],
    contextStars: ["Alp Ori"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
    ],
    difficulty: "intermediate",
    categories: ["Seasonal", "Cross-constellation", "Bright-star pattern"],
    recognition: "Widely recognised",
    bestSeason: "Winter",
    hemisphere: "both",
    type: "Hexagon",
    observationNotes:
      "Betelgeuse lies inside the hexagon and is shown as an internal reference star — it is not one of the six vertices. Some sources use Castor rather than Pollux for the Gemini vertex.",
    ambiguity:
      "The Gemini vertex is given as Pollux by most sources and as Castor by others; both are listed below.",
    alternateDefinitions: [
      {
        source: "Castor variant",
        principalStars: ["Alp Aur", "Alp Gem", "Alp CMi", "Alp CMa", "Bet Ori", "Alp Tau"],
        note: "Uses Castor (α Gem) instead of Pollux for the northern-eastern vertex.",
      },
    ],
  },
  {
    id: "spring-triangle",
    name: "Spring Triangle",
    aliases: [],
    description:
      "A wide triangle of Arcturus, Spica and Regulus that marks the spring evening sky between Boötes, Virgo and Leo.",
    constellations: ["boo", "vir", "leo"],
    principalStars: ["Alp Boo", "Alp Vir", "Alp Leo"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
    difficulty: "beginner",
    categories: ["Seasonal", "Cross-constellation", "Bright-star pattern"],
    recognition: "Widely recognised",
    bestSeason: "Spring",
    hemisphere: "both",
    type: "Triangle",
    observationNotes:
      "Follow the arc of the Big Dipper's handle to Arcturus, then 'spike' to Spica. Some sources substitute Denebola (β Leo) for Regulus, giving a more equilateral figure.",
    ambiguity: "The third vertex is quoted as Regulus by some sources and Denebola by others.",
    alternateDefinitions: [
      {
        source: "Denebola variant",
        principalStars: ["Alp Boo", "Alp Vir", "Bet Leo"],
        note: "Denebola replaces Regulus, producing a more equilateral triangle.",
      },
    ],
  },
  {
    id: "autumn-triangle",
    name: "Autumn Triangle",
    aliases: ["Pegasus Triangle"],
    description:
      "A traditional autumn pattern joining Enif, Markab and Algenib along the western and southern edge of the Pegasus region.",
    constellations: ["peg"],
    principalStars: ["Eps Peg", "Alp Peg", "Gam Peg"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
    difficulty: "intermediate",
    categories: ["Seasonal", "Traditional"],
    recognition: "Traditional",
    bestSeason: "Autumn",
    hemisphere: "both",
    type: "Triangle",
    observationNotes:
      "This is a secondary, loosely standardised seasonal figure rather than a universally quoted asterism; several observing guides define an 'autumn triangle' using different stars, including a Pegasus–Pisces version.",
    ambiguity:
      "Unlike the Summer and Winter Triangles this pattern has no settled definition; treat it as a traditional convenience figure.",
  },
  {
    id: "diamond-of-virgo",
    name: "Diamond of Virgo",
    aliases: ["Great Diamond", "Great Diamond of Virgo"],
    description:
      "A large spring diamond running from Arcturus through Cor Caroli and Denebola down to Spica, enclosing the Coma–Virgo galaxy fields.",
    constellations: ["boo", "cvn", "com", "leo", "vir"],
    principalStars: ["Alp Boo", "Alp-2 CVn", "Bet Leo", "Alp Vir"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
    difficulty: "intermediate",
    categories: ["Seasonal", "Cross-constellation", "Bright-star pattern"],
    recognition: "Widely recognised",
    bestSeason: "Spring",
    hemisphere: "both",
    type: "Diamond / quadrilateral",
    observationNotes:
      "The Coma Berenices star cluster and the Virgo galaxy cluster lie inside the diamond, which is why it is often used as a spring deep-sky signpost.",
    ambiguity:
      "Sources differ on the western vertex and on whether Coma Berenices is counted as a member constellation; Denebola (β Leo) is the conventional choice used here.",
    alternateDefinitions: [
      {
        source: "Coma Berenices variant",
        principalStars: ["Alp Boo", "Alp-2 CVn", "Bet Leo", "Alp Vir"],
        note: "Same four stars, but Coma Berenices is listed as the enclosed rather than a member constellation.",
      },
    ],
  },
  {
    id: "pointers",
    name: "The Pointers",
    aliases: ["Pointer Stars", "Dubhe and Merak"],
    description:
      "The two outer bowl stars of the Big Dipper. The line drawn through them points almost directly at Polaris, making them the classic northern navigation aid.",
    constellations: ["uma"],
    principalStars: ["Alp UMa", "Bet UMa"],
    lines: [[0, 1]],
    difficulty: "beginner",
    categories: ["Navigational", "Constellation-based", "Circumpolar"],
    recognition: "Widely recognised",
    bestSeason: "Spring",
    hemisphere: "north",
    type: "Star pair",
    observationNotes:
      "The separation of Dubhe and Merak is about 5.4°, a useful ruler for estimating angular distances at the eyepiece-free naked eye.",
  },
  {
    id: "sickle-of-leo",
    name: "Sickle of Leo",
    aliases: ["The Sickle", "Backwards Question Mark"],
    description:
      "A backwards question mark forming the head and mane of Leo, ending at Regulus which sits at the base of the handle.",
    constellations: ["leo"],
    principalStars: ["Alp Leo", "Eta Leo", "Gam-1 Leo", "Zet Leo", "Mu Leo", "Eps Leo"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ],
    difficulty: "beginner",
    categories: ["Constellation-based", "Seasonal"],
    recognition: "Widely recognised",
    bestSeason: "Spring",
    hemisphere: "both",
    type: "Hook / sickle",
    observationNotes:
      "Algieba (γ¹ Leo) is a fine golden double star. The Leonid meteor shower radiant lies within the Sickle each November.",
  },
  {
    id: "teapot",
    name: "Teapot",
    aliases: ["Teapot of Sagittarius"],
    description:
      "The brightest stars of western Sagittarius form an unmistakable teapot, with a pointed spout, a triangular lid and a handle to the east.",
    constellations: ["sgr"],
    principalStars: [
      "Gam-2 Sgr",
      "Eps Sgr",
      "Del Sgr",
      "Lam Sgr",
      "Phi Sgr",
      "Sig Sgr",
      "Tau Sgr",
      "Zet Sgr",
    ],
    lines: [
      [0, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 1],
      [1, 0],
      [4, 7],
    ],
    difficulty: "intermediate",
    categories: ["Constellation-based", "Seasonal"],
    recognition: "Widely recognised",
    bestSeason: "Summer",
    hemisphere: "both",
    type: "Teapot",
    observationNotes:
      "The Milky Way rises from the spout like steam — the direction of the Galactic centre. Zeta Sagittarii (Ascella) closes the handle and is included by most depictions even though it is sometimes omitted from short star lists.",
  },
  {
    id: "coat-hanger",
    name: "Coat Hanger",
    aliases: ["Brocchi's Cluster", "Collinder 399", "Al Sufi's Cluster"],
    description:
      "A striking line of six stars with a hook of four beneath it, resembling an upside-down coat hanger. It is best seen in binoculars or a finder scope in southern Vulpecula.",
    constellations: ["vul"],
    principalStars: ["HIP 95340", "HIP 95487", "5 Vul", "7 Vul", "HIP 95582", "4 Vul"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [4, 5],
    ],
    difficulty: "intermediate",
    categories: ["Deep-sky / cluster asterism", "Constellation-based"],
    recognition: "Cluster asterism",
    bestSeason: "Summer",
    hemisphere: "both",
    type: "Binocular asterism",
    observationNotes:
      "Catalogued as Collinder 399, but astrometric studies show the stars are a chance line-of-sight grouping at different distances, not a physical open cluster. It has no Messier or NGC number; treat 'Brocchi's Cluster' as a historical name rather than a cluster designation.",
    ambiguity:
      "Star lists for the Coat Hanger vary because several members carry no Bayer or Flamsteed designation; the entries here reference catalog HIP numbers directly.",
  },
  {
    id: "keystone-of-hercules",
    name: "Keystone of Hercules",
    aliases: ["The Keystone"],
    description:
      "A lopsided quadrilateral forming the torso of Hercules, and the standard signpost for finding the great globular cluster M13.",
    constellations: ["her"],
    principalStars: ["Zet Her", "Eps Her", "Pi Her", "Eta Her"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
    difficulty: "intermediate",
    categories: ["Constellation-based"],
    recognition: "Widely recognised",
    bestSeason: "Summer",
    hemisphere: "north",
    type: "Quadrilateral",
    observationNotes:
      "M13 lies on the western side of the Keystone, about one third of the way from Eta to Zeta Herculis. M92 sits north of the figure.",
  },
  {
    id: "head-of-cetus",
    name: "Head of Cetus",
    aliases: ["Circlet of Cetus"],
    description:
      "A pentagon of moderately bright stars marking the head of Cetus, east of the main body of the constellation.",
    constellations: ["cet"],
    principalStars: ["Alp Cet", "Lam Cet", "Mu Cet", "Xi-2 Cet", "Gam Cet"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
    ],
    difficulty: "advanced",
    categories: ["Constellation-based", "Traditional"],
    recognition: "Observational pattern",
    bestSeason: "Autumn",
    hemisphere: "both",
    type: "Pentagon",
    observationNotes:
      "A traditional observational grouping rather than an official designation; star lists differ, with δ Cet sometimes included. Menkar (α Cet) is the brightest member and is a deep orange giant.",
    ambiguity: "Definitions vary between four, five and six stars depending on the source.",
    alternateDefinitions: [
      {
        source: "Six-star variant",
        principalStars: ["Alp Cet", "Lam Cet", "Mu Cet", "Xi-2 Cet", "Gam Cet", "Del Cet"],
        note: "Adds δ Ceti on the southern side of the head.",
      },
    ],
  },
  {
    id: "kids",
    name: "The Kids",
    aliases: ["Haedi", "The Goats"],
    description:
      "A small narrow triangle beside Capella in Auriga, traditionally the kid goats carried by the Charioteer.",
    constellations: ["aur"],
    principalStars: ["Eps Aur", "Zet Aur", "Eta Aur"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
    difficulty: "intermediate",
    categories: ["Constellation-based", "Traditional"],
    recognition: "Traditional",
    bestSeason: "Winter",
    hemisphere: "north",
    type: "Triangle",
    observationNotes:
      "Both Almaaz (ε Aur) and Saclateni (ζ Aur) are long-period eclipsing binaries; ε Aur fades for about two years every 27 years, the longest eclipse cycle known.",
  },
  {
    id: "false-cross",
    name: "False Cross",
    aliases: [],
    description:
      "A cross of four stars split between Carina and Vela that is larger and fainter than the true Southern Cross, and is frequently mistaken for it.",
    constellations: ["car", "vel"],
    principalStars: ["Eps Car", "Iot Car", "Kap Vel", "Del Vel"],
    lines: [
      [0, 2],
      [1, 3],
    ],
    difficulty: "intermediate",
    categories: ["Cross-constellation", "Navigational", "Bright-star pattern"],
    recognition: "Widely recognised",
    bestSeason: "Summer",
    hemisphere: "south",
    type: "Cross",
    observationNotes:
      "The False Cross has no bright pointer stars alongside it and its long axis does not aim at the south celestial pole — the standard way to tell it from Crux.",
  },
  {
    id: "diamond-cross",
    name: "Diamond Cross",
    aliases: [],
    description:
      "A diamond-shaped figure in Carina formed by Miaplacidus, Theta, Omega and Upsilon Carinae — the third cross-like pattern of the far southern Milky Way.",
    constellations: ["car"],
    principalStars: ["Bet Car", "Ups Car", "The Car", "Ome Car"],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
    difficulty: "advanced",
    categories: ["Constellation-based", "Bright-star pattern"],
    recognition: "Traditional",
    bestSeason: "Summer",
    hemisphere: "south",
    type: "Diamond",
    observationNotes:
      "Sits between the False Cross and Crux. θ Carinae is the brightest member of the naked-eye cluster IC 2602, the Southern Pleiades. Some references place the pattern partly in Centaurus; the four stars used here all lie within Carina.",
    ambiguity:
      "Membership is quoted inconsistently, with some sources drawing the figure toward Centaurus.",
  },
  {
    id: "southern-cross",
    name: "Southern Cross",
    aliases: ["Crux pattern"],
    description:
      "The compact cross-shaped star pattern that gives Crux its name. Crux itself is an official IAU constellation; 'Southern Cross' refers specifically to this recognisable figure of its brightest stars.",
    constellations: ["cru"],
    principalStars: ["Alp-1 Cru", "Bet Cru", "Gam Cru", "Del Cru", "Eps Cru"],
    lines: [
      [0, 2],
      [1, 3],
    ],
    difficulty: "beginner",
    categories: ["Constellation-based", "Navigational", "Bright-star pattern"],
    recognition: "Widely recognised",
    bestSeason: "Autumn",
    hemisphere: "south",
    type: "Cross",
    observationNotes:
      "Extending the long axis Gacrux → Acrux about four and a half times locates the south celestial pole. Epsilon Crucis sits inside the cross and is included in the flags of several southern nations but is not one of the four arm stars.",
  },
];

// ---------------------------------------------------------------------------
// Resolved runtime model
// ---------------------------------------------------------------------------

export interface Asterism extends AsterismDef {
  /** Catalog stars for `principalStars`, in the same order */
  stars: Star[];
  /** Catalog stars for `contextStars` */
  context: Star[];
  /** Connecting segments as HIP id pairs, ready for the shared renderer */
  lineData: [number, number][];
  figureStars: number[];
  centerRa: number;
  centerDec: number;
  /** Angular size of the pattern, degrees */
  spanDeg: number;
  constellationNames: string[];
}

function resolve(def: AsterismDef): Asterism {
  const resolved = def.principalStars
    .map((ref) => resolveStarRef(ref))
    .filter((s): s is Star => !!s);
  const context = (def.contextStars ?? [])
    .map((ref) => resolveStarRef(ref))
    .filter((s): s is Star => !!s);
  const lineData: [number, number][] = [];
  for (const [a, b] of def.lines) {
    const sa = def.principalStars[a] ? resolveStarRef(def.principalStars[a]!) : undefined;
    const sb = def.principalStars[b] ? resolveStarRef(def.principalStars[b]!) : undefined;
    if (sa && sb) lineData.push([sa.id, sb.id]);
  }
  const center = resolved.length ? centroid(resolved) : { ra: 0, dec: 0 };
  let span = 0;
  for (const s of resolved) {
    const sep = angularSeparation(center.ra, center.dec, s.ra, s.dec);
    if (sep > span) span = sep;
  }
  return {
    ...def,
    stars: resolved,
    context,
    lineData,
    figureStars: [...resolved.map((s) => s.id), ...context.map((s) => s.id)],
    centerRa: center.ra,
    centerDec: center.dec,
    spanDeg: span * 2,
    constellationNames: def.constellations.map((id) => constellationById.get(id)?.name ?? id),
  };
}

export const asterisms: Asterism[] = asterismDefs
  .map(resolve)
  .sort((a, b) => a.name.localeCompare(b.name));

export const asterismById = new Map<string, Asterism>(asterisms.map((a) => [a.id, a]));

export function getAsterism(id: string): Asterism | undefined {
  return asterismById.get(id);
}

export const ASTERISM_COUNT = asterisms.length;

/**
 * Adapter to the shared `Constellation` shape so the existing StarMap /
 * SkyViewer rendering pipeline can draw an asterism with no parallel renderer.
 */
export function asterismAsFigure(a: Asterism): Constellation {
  const primary = constellationById.get(a.constellations[0] ?? "");
  return {
    id: a.id,
    name: a.name,
    abbreviation: primary?.abbreviation ?? "",
    figure: a.type,
    description: a.description,
    hemisphere: a.hemisphere === "south" ? "Southern" : "Northern",
    region: a.centerDec > 30 ? "Northern" : a.centerDec < -30 ? "Southern" : "Equatorial",
    isEcliptic: false,
    centerRa: a.centerRa,
    centerDec: a.centerDec,
    bestSeason: a.bestSeason ?? "Winter",
    brightStars: a.stars.map((s) => s.id),
    lineData: a.lineData,
    figureStars: a.figureStars,
  };
}

/** Stars worth labelling on the map: the pattern's own stars, brightest first. */
export function asterismLabelStars(a: Asterism): Star[] {
  return [...a.stars, ...a.context].sort((x, y) => x.magnitude - y.magnitude).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const searchIndex = new Map<string, string>(
  asterisms.map((a) => [
    a.id,
    [
      a.name,
      ...a.aliases,
      a.type,
      a.recognition,
      ...a.categories,
      a.bestSeason ?? "",
      ...a.constellationNames,
      ...a.constellations,
      ...a.constellations.map((id) => constellationById.get(id)?.abbreviation ?? ""),
      ...a.principalStars,
      ...a.stars.map((s) => [s.name ?? "", s.bayer ?? "", s.flamsteed ?? ""].join(" ")),
      ...a.context.map((s) => s.name ?? ""),
    ]
      .join(" ")
      .toLowerCase(),
  ]),
);

/** Matches name, alias, star name/designation, constellation name or abbreviation. */
export function searchAsterisms(query: string): Asterism[] {
  const q = query.trim().toLowerCase();
  if (!q) return asterisms;
  const terms = q.split(/\s+/);
  return asterisms.filter((a) => {
    const hay = searchIndex.get(a.id) ?? "";
    return terms.every((t) => hay.includes(t));
  });
}

/** Development integrity check — every designation must resolve to the catalog. */
export function validateAsterisms(): string[] {
  const problems: string[] = [];
  for (const def of asterismDefs) {
    for (const ref of [...def.principalStars, ...(def.contextStars ?? [])]) {
      if (!resolveStarRef(ref)) problems.push(`${def.id}: unresolved star "${ref}"`);
    }
    for (const [a, b] of def.lines) {
      if (!def.principalStars[a] || !def.principalStars[b]) {
        problems.push(`${def.id}: line index out of range [${a}, ${b}]`);
      }
    }
    for (const c of def.constellations) {
      if (!constellationById.has(c)) problems.push(`${def.id}: unknown constellation "${c}"`);
    }
  }
  return problems;
}
