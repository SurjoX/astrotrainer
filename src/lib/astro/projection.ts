/**
 * Stereographic projection of equatorial coordinates onto the viewport.
 * Stereographic (rather than gnomonic) keeps very large fields such as
 * Hydra or Eridanus renderable without extreme edge distortion.
 */
const DEG = Math.PI / 180;

export interface ViewState {
  /** Field centre, degrees */
  ra: number;
  dec: number;
  /** Angular diameter of the shorter viewport axis, degrees */
  fov: number;
  /** Screen-plane rotation, degrees */
  rotation: number;
}

export class Projection {
  private sinD0: number;
  private cosD0: number;
  private ra0: number;
  private scale: number;
  private cosRot: number;
  private sinRot: number;

  constructor(
    private view: ViewState,
    private width: number,
    private height: number,
  ) {
    const d0 = view.dec * DEG;
    this.sinD0 = Math.sin(d0);
    this.cosD0 = Math.cos(d0);
    this.ra0 = view.ra * DEG;
    const half = Math.min(width, height) / 2;
    // stereographic radius for angle t is 2*tan(t/2)
    this.scale = half / (2 * Math.tan(((view.fov / 2) * DEG) / 2));
    const r = view.rotation * DEG;
    this.cosRot = Math.cos(r);
    this.sinRot = Math.sin(r);
  }

  /** Sky → screen. Returns null when the point is behind the projection. */
  project(raDeg: number, decDeg: number): { x: number; y: number } | null {
    const d = decDeg * DEG;
    const dra = raDeg * DEG - this.ra0;
    const sinD = Math.sin(d);
    const cosD = Math.cos(d);
    const cosC = this.sinD0 * sinD + this.cosD0 * cosD * Math.cos(dra);
    if (cosC < -0.9) return null;
    const k = 2 / (1 + cosC);
    // +x is East (left on a sky map), +y is North (up)
    const px = -k * cosD * Math.sin(dra);
    const py = k * (this.cosD0 * sinD - this.sinD0 * cosD * Math.cos(dra));
    const rx = px * this.cosRot - py * this.sinRot;
    const ry = px * this.sinRot + py * this.cosRot;
    return {
      x: this.width / 2 + rx * this.scale,
      y: this.height / 2 - ry * this.scale,
    };
  }

  /** Screen → sky, used for click/tap hit-testing and future "find the star" modes. */
  unproject(x: number, y: number): { ra: number; dec: number } {
    const rx = (x - this.width / 2) / this.scale;
    const ry = -(y - this.height / 2) / this.scale;
    const px = rx * this.cosRot + ry * this.sinRot;
    const py = -rx * this.sinRot + ry * this.cosRot;
    const r = Math.hypot(px, py);
    const c = 2 * Math.atan2(r, 2);
    const sinC = Math.sin(c);
    const cosC = Math.cos(c);
    if (r === 0) return { ra: this.view.ra, dec: this.view.dec };
    const dec = Math.asin(cosC * this.sinD0 + (py * sinC * this.cosD0) / r);
    const ra = this.ra0 + Math.atan2(-px * sinC, r * this.cosD0 * cosC - py * this.sinD0 * sinC);
    return {
      ra: (((ra / DEG) % 360) + 360) % 360,
      dec: dec / DEG,
    };
  }

  /** Approximate degrees covered per screen pixel at the field centre. */
  get degPerPixel(): number {
    return this.view.fov / Math.min(this.width, this.height);
  }
}
