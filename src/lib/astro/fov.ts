import { angularSeparation, centroid, figureStarsOf } from "./catalog";
import { Projection } from "./projection";
import type { Constellation } from "./types";
import type { ViewState } from "./projection";

export const MIN_FOV = 2;
export const MAX_FOV = 150;

/**
 * Dynamic field of view: measure the angular extent of the stick figure,
 * centre on it, then add margin. Small figures (Crux, Sagitta, Equuleus)
 * stay tight; sprawling ones (Hydra, Eridanus) get enough sky to read.
 */
export function fitConstellation(c: Constellation, aspect = 1): ViewState {
  const figure = figureStarsOf(c);
  let center = figure.length ? centroid(figure) : { ra: c.centerRa, dec: c.centerDec };

  // Re-centre on the projected bounding box so lopsided figures (Hydra, Eridanus)
  // sit in the middle of the frame rather than being dragged by their star density.
  if (figure.length > 1) {
    const probe = new Projection({ ...center, fov: 120, rotation: 0 }, 1000, 1000);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const s of figure) {
      const p = probe.project(s.ra, s.dec);
      if (!p) continue;
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    if (Number.isFinite(minX)) {
      center = probe.unproject((minX + maxX) / 2, (minY + maxY) / 2);
    }
  }

  let maxSep = 0;
  for (const s of figure) {
    const sep = angularSeparation(center.ra, center.dec, s.ra, s.dec);
    if (sep > maxSep) maxSep = sep;
  }
  // margin scales down for very large figures so they still fill the frame
  const margin = maxSep > 40 ? 1.18 : maxSep > 15 ? 1.35 : 1.6;
  let fov = 2 * maxSep * margin;
  // the shorter viewport axis defines the FOV, so widen when the frame is wide
  if (aspect > 1) fov = Math.max(fov, (2 * maxSep * margin) / Math.max(1, aspect * 0.9));
  fov = Math.min(MAX_FOV, Math.max(6, fov));
  return { ra: center.ra, dec: center.dec, fov, rotation: 0 };
}

export function clampFov(fov: number): number {
  return Math.min(MAX_FOV, Math.max(MIN_FOV, fov));
}
