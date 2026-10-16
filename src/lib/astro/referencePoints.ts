const DEG = Math.PI / 180;

type EquatorialPosition = { ra: number; dec: number };

const EQUATORIAL_TO_GALACTIC = [
  [-0.0548755604162154, -0.873437090234885, -0.4838350155487132],
  [0.494109427875584, -0.444829629960011, 0.746982244497219],
  [-0.8676661490190047, -0.1980763734312015, 0.4559837761750669],
] as const;

/** Convert IAU Galactic coordinates to the application's J2000 equatorial frame. */
export function galacticToEquatorial(lDeg: number, bDeg: number): EquatorialPosition {
  const l = lDeg * DEG;
  const b = bDeg * DEG;
  const galactic = [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)];
  const equatorial = [0, 0, 0];

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      equatorial[row]! += EQUATORIAL_TO_GALACTIC[column]![row]! * galactic[column]!;
    }
  }

  return {
    ra: (((Math.atan2(equatorial[1]!, equatorial[0]!) / DEG) % 360) + 360) % 360,
    dec: Math.atan2(equatorial[2]!, Math.hypot(equatorial[0]!, equatorial[1]!)) / DEG,
  };
}

/** Sample the J2000 Galactic Equator for rendering as a sky-space path. */
export function galacticEquator(stepDeg = 2): [number, number][] {
  const points: [number, number][] = [];
  for (let longitude = 0; longitude <= 360; longitude += stepDeg) {
    const position = galacticToEquatorial(longitude, 0);
    points.push([position.ra, position.dec]);
  }
  return points;
}

export const NORTH_CELESTIAL_POLE: EquatorialPosition = { ra: 0, dec: 90 };
export const SOUTH_CELESTIAL_POLE: EquatorialPosition = { ra: 0, dec: -90 };
export const NORTH_GALACTIC_POLE = galacticToEquatorial(0, 90);
export const SOUTH_GALACTIC_POLE = galacticToEquatorial(0, -90);
export const VERNAL_EQUINOX: EquatorialPosition = { ra: 0, dec: 0 };
export const AUTUMNAL_EQUINOX: EquatorialPosition = { ra: 180, dec: 0 };
