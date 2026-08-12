/** J2000 equatorial coordinate grid geometry (independent of any renderer). */

export interface GridLine {
  points: [number, number][];
  /** true for a line of constant RA (meridian) */
  meridian: boolean;
  /** RA in degrees for meridians, Dec in degrees for parallels */
  value: number;
  major: boolean;
}

/** Grid density chosen from the current field of view, in degrees. */
export function gridSteps(fovDeg: number): { decStep: number; raStepDeg: number } {
  if (fovDeg > 90) return { decStep: 15, raStepDeg: 30 };
  if (fovDeg > 45) return { decStep: 10, raStepDeg: 15 };
  if (fovDeg > 20) return { decStep: 5, raStepDeg: 15 };
  if (fovDeg > 8) return { decStep: 2, raStepDeg: 7.5 };
  if (fovDeg > 3) return { decStep: 1, raStepDeg: 3.75 };
  return { decStep: 0.5, raStepDeg: 1.25 };
}

/** Builds the visible portion of the equatorial grid around a field centre. */
export function buildGrid(
  centerRa: number,
  centerDec: number,
  fovDeg: number,
  radiusDeg: number,
): GridLine[] {
  const { decStep, raStepDeg } = gridSteps(fovDeg);
  const lines: GridLine[] = [];
  const sample = Math.max(0.25, Math.min(2, fovDeg / 40));

  const decMin = Math.max(-90, Math.floor((centerDec - radiusDeg) / decStep) * decStep);
  const decMax = Math.min(90, Math.ceil((centerDec + radiusDeg) / decStep) * decStep);

  // parallels (constant declination)
  for (let dec = decMin; dec <= decMax + 1e-9; dec += decStep) {
    if (dec <= -90 || dec >= 90) continue;
    const cos = Math.max(0.02, Math.cos((dec * Math.PI) / 180));
    const halfSpan = Math.min(180, radiusDeg / cos);
    const step = Math.max(0.5, sample / cos);
    const pts: [number, number][] = [];
    for (let d = -halfSpan; d <= halfSpan + 1e-9; d += step) {
      pts.push([(((centerRa + d) % 360) + 360) % 360, dec]);
    }
    lines.push({ points: pts, meridian: false, value: dec, major: Math.abs(dec) < 1e-9 });
  }

  // meridians (constant right ascension)
  const raSpan = Math.min(180, radiusDeg / Math.max(0.05, Math.cos((centerDec * Math.PI) / 180)));
  const raMin = Math.floor((centerRa - raSpan) / raStepDeg) * raStepDeg;
  const raMax = Math.ceil((centerRa + raSpan) / raStepDeg) * raStepDeg;
  for (let ra = raMin; ra <= raMax + 1e-9; ra += raStepDeg) {
    const lo = Math.max(-90, centerDec - radiusDeg);
    const hi = Math.min(90, centerDec + radiusDeg);
    const pts: [number, number][] = [];
    for (let dec = lo; dec <= hi + 1e-9; dec += sample) {
      pts.push([(((ra % 360) + 360) % 360), dec]);
    }
    const norm = (((ra % 360) + 360) % 360);
    lines.push({ points: pts, meridian: true, value: norm, major: Math.abs(norm) < 1e-9 });
  }

  return lines;
}

/** "5h 20m" style label for a meridian. */
export function raLabel(raDeg: number): string {
  const hours = raDeg / 15;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}m`;
}

export function decLabel(decDeg: number): string {
  const sign = decDeg < 0 ? "−" : "+";
  const v = Math.abs(decDeg);
  return `${sign}${Number.isInteger(v) ? v : v.toFixed(1)}°`;
}
