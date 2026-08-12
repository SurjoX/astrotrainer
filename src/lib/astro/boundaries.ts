import raw from "@/data/boundaries.json";

/**
 * Official IAU (Delporte 1930) constellation boundaries, catalogue VI/49
 * `bound_18.dat` vertices precessed from B1875.0 to J2000.0 and densified
 * along each original constant-RA / constant-Dec edge so the characteristic
 * J2000 curvature of the boundaries is preserved.
 *
 * Shape: constellation id -> list of closed polylines -> [raDeg, decDeg] points.
 */
export type BoundaryPolyline = [number, number][];

const boundaries = raw as unknown as Record<string, BoundaryPolyline[]>;

export function boundaryOf(constellationId: string): BoundaryPolyline[] {
  return boundaries[constellationId] ?? [];
}

export function hasBoundary(constellationId: string): boolean {
  return !!boundaries[constellationId];
}
