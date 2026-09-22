import { boundaryOf } from "./boundaries";
import { constellations, starById } from "./catalog";
import { validateMessierData } from "./messier";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  counts: { constellations: number; stars: number; segments: number; messier: number };
}

/** Integrity check over the astronomy dataset. Runs in dev on app start. */
export function validateAstronomyData(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  errors.push(...validateMessierData());
  const ids = new Set<string>();
  const abbrs = new Set<string>();
  let segments = 0;

  if (constellations.length !== 88) {
    errors.push(`Expected exactly 88 constellations, found ${constellations.length}`);
  }

  for (const c of constellations) {
    if (ids.has(c.id)) errors.push(`Duplicate constellation id: ${c.id}`);
    ids.add(c.id);
    if (abbrs.has(c.abbreviation)) errors.push(`Duplicate abbreviation: ${c.abbreviation}`);
    abbrs.add(c.abbreviation);
    if (!c.name || !c.abbreviation || !c.figure) errors.push(`${c.id}: missing metadata`);
    if (!c.lineData.length) errors.push(`${c.id}: no stick-figure line data`);
    if (!c.figureStars.length) errors.push(`${c.id}: no figure stars`);

    for (const [a, b] of c.lineData) {
      segments += 1;
      if (!starById.has(a)) errors.push(`${c.id}: dangling line reference HIP ${a}`);
      if (!starById.has(b)) errors.push(`${c.id}: dangling line reference HIP ${b}`);
      if (a === b) errors.push(`${c.id}: degenerate segment on HIP ${a}`);
    }
    for (const h of c.figureStars) {
      const s = starById.get(h);
      if (!s) {
        errors.push(`${c.id}: unknown figure star HIP ${h}`);
        continue;
      }
      if (!(s.ra >= 0 && s.ra < 360)) errors.push(`HIP ${h}: RA out of range (${s.ra})`);
      if (!(s.dec >= -90 && s.dec <= 90)) errors.push(`HIP ${h}: Dec out of range (${s.dec})`);
      if (!(s.magnitude > -2 && s.magnitude < 15)) errors.push(`HIP ${h}: implausible magnitude`);
    }
    if (c.brightStars.length < 2) warnings.push(`${c.id}: fewer than 2 bright stars listed`);

    const polys = boundaryOf(c.id);
    if (!polys.length) errors.push(`${c.id}: missing IAU boundary polygon`);
    for (const poly of polys) {
      if (poly.length < 4) errors.push(`${c.id}: degenerate boundary polygon`);
      for (const [ra, dec] of poly) {
        if (!(ra >= 0 && ra < 360) || !(dec >= -90 && dec <= 90)) {
          errors.push(`${c.id}: boundary vertex out of range (${ra}, ${dec})`);
          break;
        }
      }
    }
  }

  const ecliptic = constellations.filter((c) => c.isEcliptic);
  if (ecliptic.length !== 13) errors.push(`Ecliptic set should hold 13 constellations, found ${ecliptic.length}`);
  if (!ecliptic.some((c) => c.id === "oph")) errors.push("Ophiuchus is missing from the ecliptic set");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: { constellations: constellations.length, stars: starById.size, segments, messier: 110 },
  };
}