import rawStars from "@/data/stars.json";
import rawConstellations from "@/data/constellations.json";
import type { Constellation, Star } from "./types";

interface RawStar {
  hip: number;
  ra: number;
  dec: number;
  mag: number;
  p: string | null;
  b: string | null;
  f: string | null;
  c: string | null;
  sp: string | null;
  hd: number | null;
}

const DEG = Math.PI / 180;

/**
 * Bright Star / HYG catalog (HIP cross-referenced, V/50 photometry), limited to
 * magnitude 6.6 plus every star used by a conventional constellation figure.
 * Built once per session and shared by every renderer and question generator.
 */
export const stars: Star[] = (rawStars as RawStar[]).map((s) => ({
  id: s.hip,
  hip: s.hip,
  hd: s.hd,
  name: s.p,
  bayer: s.b,
  flamsteed: s.f,
  ra: s.ra,
  dec: s.dec,
  magnitude: s.mag,
  spectralType: s.sp,
  constellation: s.c,
}));

export const starById = new Map<number, Star>(stars.map((s) => [s.id, s]));

/** Cartesian unit vectors, precomputed once for fast angular-distance filtering. */
export const starVectors = new Float64Array(stars.length * 3);
stars.forEach((s, i) => {
  const ra = s.ra * DEG;
  const dec = s.dec * DEG;
  starVectors[i * 3] = Math.cos(dec) * Math.cos(ra);
  starVectors[i * 3 + 1] = Math.cos(dec) * Math.sin(ra);
  starVectors[i * 3 + 2] = Math.sin(dec);
});

export const constellations: Constellation[] = (rawConstellations as Constellation[])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

export const constellationById = new Map<string, Constellation>(
  constellations.map((c) => [c.id, c]),
);

export function getConstellation(id: string): Constellation | undefined {
  return constellationById.get(id);
}

/** Bayer letter abbreviations to Greek letter mapping. */
const BAYER_SYMBOLS: Record<string, string> = {
  Alp: "α",
  Bet: "β",
  Gam: "γ",
  Del: "δ",
  Eps: "ε",
  Zet: "ζ",
  Eta: "η",
  The: "θ",
  Iot: "ι",
  Kap: "κ",
  Lam: "λ",
  Mu: "μ",
  Nu: "ν",
  Xi: "ξ",
  Omi: "ο",
  Pi: "π",
  Rho: "ρ",
  Sig: "σ",
  Tau: "τ",
  Ups: "υ",
  Phi: "φ",
  Chi: "χ",
  Psi: "ψ",
  Ome: "ω",
};

/** Convert Bayer code (e.g., "Alp") to Greek symbol (e.g., "α"). */
export function bayerToSymbol(bayerCode: string | null): string | null {
  if (!bayerCode) return null;
  // Handle numbered variants like "Kap-1", "Gam-3" → just use base letter
  const base = bayerCode.split("-")[0]!;
  return BAYER_SYMBOLS[base] ?? null;
}

/** Named stars of the figure, brightest first — the "important" label set. */
const importantCache = new Map<string, Star[]>();
export function importantStars(c: Constellation): Star[] {
  const cached = importantCache.get(c.id);
  if (cached) return cached;
  const named = c.figureStars
    .map((h) => starById.get(h))
    .filter((s): s is Star => !!s && !!s.name)
    .sort((a, b) => a.magnitude - b.magnitude)
    .slice(0, 8);
  importantCache.set(c.id, named);
  return named;
}

/** Format star label with Bayer designation if available: "Betelgeuse — α Ori". */
export function starLabelWithBayer(s: Star): string {
  if (!s.name) return starLabel(s);
  const bayerSymbol = bayerToSymbol(s.bayer);
  if (bayerSymbol) {
    const bayerPart = s.constellation ? `${bayerSymbol} ${s.constellation}` : bayerSymbol;
    return `${s.name} — ${bayerPart}`;
  }
  return s.name;
}

/** Format star label with compact Bayer in parentheses: "Betelgeuse (α)". */
export function starLabelCompact(s: Star): string {
  if (!s.name) return starLabel(s);
  const bayerSymbol = bayerToSymbol(s.bayer);
  if (bayerSymbol) {
    return `${s.name} (${bayerSymbol})`;
  }
  return s.name;
}

export function starLabel(s: Star): string {
  if (s.name) return s.name;
  if (s.bayer) return `${s.bayer} ${s.constellation ?? ""}`.trim();
  if (s.flamsteed) return `${s.flamsteed} ${s.constellation ?? ""}`.trim();
  return `HIP ${s.hip}`;
}

/** Angular separation in degrees. */
export function angularSeparation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const a = dec1 * DEG;
  const b = dec2 * DEG;
  const d = (ra1 - ra2) * DEG;
  const cos = Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(d);
  return Math.acos(Math.min(1, Math.max(-1, cos))) / DEG;
}

/** Spherical mean direction of a set of stars. */
export function centroid(list: Star[]): { ra: number; dec: number } {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const s of list) {
    const ra = s.ra * DEG;
    const dec = s.dec * DEG;
    x += Math.cos(dec) * Math.cos(ra);
    y += Math.cos(dec) * Math.sin(ra);
    z += Math.sin(dec);
  }
  const r = Math.hypot(x, y, z) || 1;
  return {
    ra: (((Math.atan2(y, x) / DEG) % 360) + 360) % 360,
    dec: Math.asin(z / r) / DEG,
  };
}

export function figureStarsOf(c: Constellation): Star[] {
  return c.figureStars.map((h) => starById.get(h)).filter((s): s is Star => !!s);
}

/**
 * Stars within `radiusDeg` of a direction, down to `magLimit`.
 * Uses the precomputed unit vectors — no trigonometry per star per frame.
 */
export function starsInField(
  centerRa: number,
  centerDec: number,
  radiusDeg: number,
  magLimit: number,
): Star[] {
  const ra = centerRa * DEG;
  const dec = centerDec * DEG;
  const cx = Math.cos(dec) * Math.cos(ra);
  const cy = Math.cos(dec) * Math.sin(ra);
  const cz = Math.sin(dec);
  const minDot = Math.cos(Math.min(179, radiusDeg) * DEG);
  const out: Star[] = [];
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (!s || s.magnitude > magLimit) continue;
    const dot =
      cx * (starVectors[i * 3] ?? 0) +
      cy * (starVectors[i * 3 + 1] ?? 0) +
      cz * (starVectors[i * 3 + 2] ?? 0);
    if (dot >= minDot) out.push(s);
  }
  return out;
}
