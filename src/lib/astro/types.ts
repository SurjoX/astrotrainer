/** Core astronomy domain types. Rendering, question generation and UI all read from these. */

export interface Star {
  /** Hipparcos identifier — the primary key of the catalog */
  id: number;
  hip: number;
  hd: number | null;
  /** Common/proper name (e.g. "Betelgeuse") when catalogued */
  name: string | null;
  /** Bayer designation letter (e.g. "alp") */
  bayer: string | null;
  /** Flamsteed number */
  flamsteed: string | null;
  /** Right ascension, degrees (J2000) */
  ra: number;
  /** Declination, degrees (J2000) */
  dec: number;
  /** Apparent visual magnitude */
  magnitude: number;
  spectralType: string | null;
  /** IAU constellation abbreviation the star lies in */
  constellation: string | null;
}

export type SkyRegion = "Northern" | "Equatorial" | "Southern";
export type Season = "Winter" | "Spring" | "Summer" | "Autumn";

export interface Constellation {
  id: string;
  name: string;
  abbreviation: string;
  /** Traditional figure, e.g. "The Great Hunter" */
  figure: string;
  description: string;
  hemisphere: "Northern" | "Southern";
  region: SkyRegion;
  isEcliptic: boolean;
  centerRa: number;
  centerDec: number;
  bestSeason: Season;
  /** HIP ids of the brightest figure stars */
  brightStars: number[];
  /** Conventional stick-figure segments as HIP id pairs (Stellarium modern sky culture) */
  lineData: [number, number][];
  /** Every HIP id referenced by the stick figure */
  figureStars: number[];
}

/** Extensible question taxonomy — only IDENTIFY_CONSTELLATION is implemented today. */
export enum QuestionType {
  IDENTIFY_CONSTELLATION = "IDENTIFY_CONSTELLATION",
  IDENTIFY_STAR = "IDENTIFY_STAR",
  FIND_STAR = "FIND_STAR",
  IDENTIFY_MESSIER = "IDENTIFY_MESSIER",
  FIND_MESSIER = "FIND_MESSIER",
  COORDINATE_TASK = "COORDINATE_TASK",
  OBSERVATION_TASK = "OBSERVATION_TASK",
}

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type LabelMode = "none" | "target" | "important" | "all";

/** Everything the renderer needs to draw a question's sky field. */
export interface SkyState {
  centerRa: number;
  centerDec: number;
  fovDeg: number;
  rotation: number;
  magnitudeLimit: number;
  showLines: boolean;
  labelMode: LabelMode;
}

export interface Choice {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  /** Domain id of the answer target (constellation id today, star/Messier id later) */
  target: string;
  difficulty: Difficulty;
  skyState: SkyState;
  choices: Choice[];
  correctAnswer: string;
}