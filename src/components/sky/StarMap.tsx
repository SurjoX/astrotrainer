import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  angularSeparation,
  constellations,
  importantStars,
  starById,
  starLabelCompact,
  starsInField,
} from "@/lib/astro/catalog";
import { clampFov, fitConstellation } from "@/lib/astro/fov";
import { boundaryOf } from "@/lib/astro/boundaries";
import { buildGrid, decLabel, raLabel } from "@/lib/astro/grid";
import { Projection, type ViewState } from "@/lib/astro/projection";
import type { Constellation, LabelMode, Star } from "@/lib/astro/types";
import { cn } from "@/lib/utils";

export interface StarMapHandle {
  zoomBy: (factor: number) => void;
  reset: () => void;
  fit: () => void;
  getView: () => ViewState;
}

export interface StarMapProps {
  /** The constellation this field is built around (lines, labels, highlight) */
  target?: Constellation | null;
  view: ViewState;
  magnitudeLimit?: number;
  showLines?: boolean;
  /** Render all 88 IAU constellation line sets instead of only the target constellation */
  showAllConstellationLines?: boolean;
  /** Official IAU boundary of the target constellation */
  showBoundary?: boolean;
  /** Render all 88 IAU constellation boundaries instead of only the target constellation */
  showAllConstellationBoundaries?: boolean;
  /** J2000 equatorial coordinate grid */
  showGrid?: boolean;
  /** Constellation names for the currently visible sky region */
  showConstellationLabels?: boolean;
  /** Ecliptic path */
  showEcliptic?: boolean;
  /** Celestial equator */
  showCelestialEquator?: boolean;
  labelMode?: LabelMode;
  /**
   * Constellation ids whose official IAU boundary should be drawn instead of the
   * target's own. Used by asterisms that span several constellations.
   */
  boundaryIds?: string[] | undefined;
  /** Explicit stars to label, overriding the target-derived selection. */
  labelStars?: Star[] | undefined;
  /** Dim stars that are not part of the target figure */
  emphasizeTarget?: boolean;
  interactive?: boolean;
  showCompass?: boolean;
  className?: string;
  onStarClick?: (star: Star) => void;
  onSkyClick?: ((position: { ra: number; dec: number }) => void) | undefined;
  markers?: SkyMarker[] | undefined;
  onViewChange?: (view: ViewState) => void;
}

export interface SkyMarker {
  ra: number;
  dec: number;
  color?: string;
  label?: string;
}

function starColor(spect: string | null): string {
  const t = (spect ?? "").charAt(0).toUpperCase();

  switch (t) {
    case "O":
      return "#b9d0ff";
    case "B":
      return "#c9dbff";
    case "A":
      return "#e9efff";
    case "F":
      return "#fffdf4";
    case "G":
      return "#fff1c4";
    case "K":
      return "#ffd6a3";
    case "M":
      return "#ffb98d";
    default:
      return "#f2f5ff";
  }
}

/**
 * More realistic stellar point.
 *
 * Instead of rendering every star as a flat circle, this creates:
 *   1. A very subtle outer halo
 *   2. A small luminous body
 *   3. A tiny bright core
 *
 * Bright stars receive a stronger halo while faint stars remain
 * small and point-like.
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
  magnitude: number,
) {
  ctx.save();

  ctx.globalAlpha = alpha;

  /*
   * Only relatively bright stars receive a visible halo.
   * This prevents the entire sky from looking like a collection
   * of glowing blobs.
   */
  if (magnitude < 4.0) {
    const haloRadius = radius * (magnitude < 1.5 ? 5.5 : magnitude < 2.6 ? 4.0 : 2.7);

    const haloStrength = magnitude < 1.5 ? 0.3 : magnitude < 2.6 ? 0.2 : 0.1;

    const glow = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);

    glow.addColorStop(0, `rgba(205,225,255,${haloStrength * alpha})`);

    glow.addColorStop(0.25, `rgba(190,215,255,${haloStrength * 0.35 * alpha})`);

    glow.addColorStop(1, "rgba(190,215,255,0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  /*
   * Main stellar body.
   *
   * A radial gradient makes the centre slightly brighter than
   * the edge, instead of producing a perfectly flat circle.
   */
  const body = ctx.createRadialGradient(
    x - radius * 0.25,
    y - radius * 0.25,
    radius * 0.05,
    x,
    y,
    radius,
  );

  body.addColorStop(0, "#ffffff");

  body.addColorStop(0.35, color);

  body.addColorStop(1, color);

  ctx.fillStyle = body;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  /*
   * Tiny white stellar core.
   *
   * This is deliberately very small. The aim is a star-like
   * point rather than a visible geometric circle.
   */
  if (radius >= 1.25) {
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(x - radius * 0.15, y - radius * 0.15, Math.max(0.35, radius * 0.25), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export const StarMap = forwardRef<StarMapHandle, StarMapProps>(function StarMap(
  {
    target,
    view,
    magnitudeLimit = 6.5,
    showLines = false,
    showAllConstellationLines = false,
    showBoundary = false,
    showAllConstellationBoundaries = false,
    showGrid = false,
    showConstellationLabels = false,
    showEcliptic = false,
    showCelestialEquator = false,
    labelMode = "none",
    boundaryIds,
    labelStars: labelStarsProp,
    emphasizeTarget = false,
    interactive = true,
    showCompass = true,
    className,
    onStarClick,
    onSkyClick,
    markers = [],
    onViewChange,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState({
    w: 800,
    h: 600,
  });

  const [localView, setLocalView] = useState<ViewState>(view);

  const viewRef = useRef(localView);
  viewRef.current = localView;

  const dragRef = useRef<{
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);

  const touchPointsRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    distance: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  useEffect(() => {
    setLocalView(view);
  }, [view]);

  const commit = useCallback(
    (next: ViewState) => {
      setLocalView(next);
      onViewChange?.(next);
    },
    [onViewChange],
  );

  // ------------------------------------------------------------
  // VIEWPORT MEASUREMENT
  // ------------------------------------------------------------

  useEffect(() => {
    const el = wrapRef.current;

    if (!el) return;

    const ro = new ResizeObserver(() => {
      setSize({
        w: el.clientWidth,
        h: el.clientHeight,
      });
    });

    ro.observe(el);

    setSize({
      w: el.clientWidth,
      h: el.clientHeight,
    });

    return () => ro.disconnect();
  }, []);

  // ------------------------------------------------------------
  // STARS IN CURRENT FIELD
  // ------------------------------------------------------------

  const field = useMemo(() => {
    const aspect = size.w / Math.max(1, size.h);

    const radius = (localView.fov / 2) * Math.max(1, aspect) * 1.25 + 2;

    return starsInField(localView.ra, localView.dec, Math.min(120, radius), magnitudeLimit);
  }, [localView.ra, localView.dec, localView.fov, magnitudeLimit, size.w, size.h]);

  const fieldRadius = useMemo(() => {
    const aspect = size.w / Math.max(1, size.h);

    return Math.min(120, (localView.fov / 2) * Math.max(1, aspect) * 1.25 + 2);
  }, [localView.fov, size.w, size.h]);

  // ------------------------------------------------------------
  // RENDERING
  // ------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || size.w === 0 || size.h === 0) {
      return;
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1);

    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, size.w, size.h);

    const proj = new Projection(localView, size.w, size.h);

    const figureSet = new Set(target?.figureStars ?? []);

    // ----------------------------------------------------------
    // SKY-SPACE POLYLINE
    // ----------------------------------------------------------

    const strokePath = (pts: [number, number][], closed: boolean) => {
      ctx.beginPath();

      let pen = false;

      let prev: {
        x: number;
        y: number;
      } | null = null;

      const first = pts[0];

      const list = closed && first ? [...pts, first] : pts;

      for (const [ra, dec] of list) {
        const p = proj.project(ra, dec);

        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
          pen = false;
          prev = null;
          continue;
        }

        const jump = prev
          ? Math.hypot(p.x - prev.x, p.y - prev.y) > Math.max(size.w, size.h)
          : false;

        if (!pen || jump) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }

        pen = true;
        prev = p;
      }

      ctx.stroke();
    };

    // ----------------------------------------------------------
    // EQUATORIAL GRID
    // ----------------------------------------------------------

    if (showGrid) {
      const grid = buildGrid(localView.ra, localView.dec, localView.fov, fieldRadius);

      ctx.lineWidth = 1;

      for (const line of grid) {
        ctx.strokeStyle = line.major
          ? "rgba(126,190,255,0.30)"
          : line.meridian
            ? "rgba(150,178,220,0.16)"
            : "rgba(150,178,220,0.13)";

        ctx.setLineDash(line.major ? [] : [4, 5]);

        strokePath(line.points, false);
      }

      ctx.setLineDash([]);

      ctx.font = "500 10px ui-monospace, SFMono-Regular, monospace";

      ctx.fillStyle = "rgba(150,178,220,0.55)";

      ctx.textBaseline = "middle";

      const usedX: number[] = [];
      const usedY: number[] = [];

      for (const line of grid) {
        const mid = line.points[Math.floor(line.points.length / 2)];

        if (!mid) continue;

        const p = proj.project(mid[0], mid[1]);

        if (!p) continue;

        if (line.meridian) {
          if (p.x < 20 || p.x > size.w - 20) {
            continue;
          }

          if (usedX.some((x) => Math.abs(x - p.x) < 46)) {
            continue;
          }

          usedX.push(p.x);

          ctx.textAlign = "center";

          ctx.fillText(raLabel(line.value), p.x, 12);
        } else {
          if (p.y < 16 || p.y > size.h - 16) {
            continue;
          }

          if (usedY.some((y) => Math.abs(y - p.y) < 16)) {
            continue;
          }

          usedY.push(p.y);

          ctx.textAlign = "left";

          ctx.fillText(decLabel(line.value), 6, p.y);
        }
      }

      ctx.textAlign = "left";
    }

    // ----------------------------------------------------------
    // IAU BOUNDARY
    // ----------------------------------------------------------

    const boundaryTargets = boundaryIds ??
      (showAllConstellationBoundaries
        ? constellations.map((c) => c.id)
        : target
          ? [target.id]
          : []);

    if (showBoundary && boundaryTargets.length > 0) {
      ctx.lineWidth = 1.1;

      ctx.strokeStyle = "rgba(126,190,255,0.42)";

      ctx.setLineDash([7, 5]);

      ctx.lineJoin = "round";

      for (const id of boundaryTargets) {
        for (const poly of boundaryOf(id)) {
          strokePath(poly, true);
        }
      }

      ctx.setLineDash([]);
    }

    // ----------------------------------------------------------
    // STAR SIZE
    // ----------------------------------------------------------

    /*
     * Astronomical magnitude is logarithmic, so the radius
     * changes exponentially with magnitude.
     *
     * Faint stars remain tiny points.
     * Bright stars become noticeably larger.
     */
    const zoomBoost = Math.max(0.75, Math.min(1.5, 45 / localView.fov + 0.55));

    const radiusFor = (mag: number) => {
      const base = 0.55 * Math.pow(1.52, Math.max(-1.5, 6.4 - mag));

      return Math.min(7.5, Math.max(0.55, base * zoomBoost));
    };

    // ----------------------------------------------------------
    // STAR POSITIONS
    // ----------------------------------------------------------

    const positions = new Map<
      number,
      {
        x: number;
        y: number;
      }
    >();

    for (const s of field) {
      const p = proj.project(s.ra, s.dec);

      if (!p) continue;

      positions.set(s.id, p);

      if (p.x < -40 || p.y < -40 || p.x > size.w + 40 || p.y > size.h + 40) {
        continue;
      }

      const inFigure = figureSet.has(s.id);

      const radius = radiusFor(s.magnitude);

      const alpha = emphasizeTarget && !inFigure ? 0.42 : 1;

      const color = starColor(s.spectralType);

      drawStar(ctx, p.x, p.y, radius, color, alpha, s.magnitude);
    }

    // ----------------------------------------------------------
    // CONSTELLATION STICK FIGURE
    // ----------------------------------------------------------

    if (showLines) {
      const lineTargets = showAllConstellationLines ? constellations : target ? [target] : [];

      if (lineTargets.length > 0) {
        ctx.lineWidth = 1.25;

        ctx.strokeStyle = "rgba(122,196,255,0.62)";

        ctx.lineCap = "round";

        ctx.beginPath();

        for (const current of lineTargets) {
          for (const [a, b] of current.lineData) {
            const sa = starById.get(a);
            const sb = starById.get(b);

            if (!sa || !sb) continue;

            const pa = positions.get(a) ?? proj.project(sa.ra, sa.dec);
            const pb = positions.get(b) ?? proj.project(sb.ra, sb.dec);

            if (!pa || !pb) continue;

            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
          }
        }

        ctx.stroke();
      }
    }

    for (const marker of markers) {
      const p = proj.project(marker.ra, marker.dec);
      if (!p) continue;
      const color = marker.color ?? "#f7c66a";
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - 12, p.y);
      ctx.lineTo(p.x + 12, p.y);
      ctx.moveTo(p.x, p.y - 12);
      ctx.lineTo(p.x, p.y + 12);
      ctx.stroke();
      if (marker.label) {
        ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(marker.label, p.x + 12, p.y - 10);
      }
      ctx.restore();
    }

    // ----------------------------------------------------------
    // ASTRONOMICAL OVERLAYS
    // ----------------------------------------------------------

    if (showEcliptic) {
      const path: [number, number][] = [];
      const eps = (23.43928 * Math.PI) / 180;

      for (let lambda = 0; lambda <= 360; lambda += 5) {
        const l = (lambda * Math.PI) / 180;
        const x = Math.cos(l);
        const y = Math.sin(l) * Math.cos(eps);
        const z = Math.sin(l) * Math.sin(eps);

        const ra = (Math.atan2(y, x) * 180) / Math.PI;
        const dec = (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI;
        path.push([((ra % 360) + 360) % 360, dec]);
      }

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(255, 86, 86, 0.96)";
      ctx.setLineDash([]);
      strokePath(path, false);
    }

    if (showCelestialEquator) {
      const path: [number, number][] = [];

      for (let ra = 0; ra <= 360; ra += 5) {
        path.push([ra, 0]);
      }

      ctx.lineWidth = 1.35;
      ctx.strokeStyle = "rgba(60, 255, 110, 0.96)";
      ctx.setLineDash([]);
      strokePath(path, false);
    }

    // ----------------------------------------------------------
    // LABELS
    // ----------------------------------------------------------

    if (
      labelMode !== "none" &&
      (target || labelMode === "all" || (labelStarsProp?.length ?? 0) > 0)
    ) {
      let labelStars: Star[] = [];

      if (labelStarsProp && labelStarsProp.length > 0) {
        labelStars = labelStarsProp;
      } else if (labelMode === "target" && target) {
        labelStars = importantStars(target).slice(0, 3);
      } else if (labelMode === "important" && target) {
        labelStars = importantStars(target);
      } else if (labelMode === "all") {
        labelStars = field.filter((s) => s.name && s.magnitude < 3.6);
      }

      ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";

      ctx.textBaseline = "middle";

      const taken: {
        x: number;
        y: number;
        w: number;
        h: number;
      }[] = [];

      // --------------------------------------------------------
      // CONSTELLATION NAME
      // --------------------------------------------------------

      if (target) {
        const c = proj.project(target.centerRa, target.centerDec);

        if (c && c.x > 60 && c.y > 24 && c.x < size.w - 60 && c.y < size.h - 24) {
          ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";

          const text = target.name.toUpperCase();

          const w = ctx.measureText(text).width;

          taken.push({
            x: c.x - w / 2 - 6,
            y: c.y - 10,
            w: w + 12,
            h: 20,
          });

          ctx.fillStyle = "rgba(126,190,255,0.5)";

          ctx.textAlign = "center";

          ctx.fillText(text, c.x, c.y);

          ctx.textAlign = "left";
        }

        ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
      }

      // --------------------------------------------------------
      // STAR LABELS
      // --------------------------------------------------------

      for (const s of labelStars) {
        const p = positions.get(s.id) ?? proj.project(s.ra, s.dec);

        if (!p) continue;

        if (p.x < 8 || p.y < 8 || p.x > size.w - 8 || p.y > size.h - 8) {
          continue;
        }

        const text = starLabelCompact(s);

        const w = ctx.measureText(text).width;

        const box = {
          x: p.x + 8,
          y: p.y - 6,
          w: w + 4,
          h: 14,
        };

        const clash = taken.some(
          (t) =>
            box.x < t.x + t.w && box.x + box.w > t.x && box.y < t.y + t.h && box.y + box.h > t.y,
        );

        if (clash) continue;

        taken.push(box);

        ctx.fillStyle = "rgba(168,199,250,0.92)";

        ctx.fillText(text, p.x + 9, p.y - 1);
      }
    }

    if (showConstellationLabels) {
      ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(215,228,255,0.88)";

      const taken: { x: number; y: number; w: number; h: number }[] = [];

      for (const current of constellations) {
        const p = proj.project(current.centerRa, current.centerDec);
        if (!p) continue;
        if (p.x < 18 || p.y < 18 || p.x > size.w - 18 || p.y > size.h - 18) continue;

        const text = current.name.toUpperCase();
        const w = ctx.measureText(text).width;
        const box = { x: p.x - w / 2 - 6, y: p.y - 9, w: w + 12, h: 18 };

        const clash = taken.some(
          (t) =>
            box.x < t.x + t.w && box.x + box.w > t.x && box.y < t.y + t.h && box.y + box.h > t.y,
        );

        if (clash) continue;

        taken.push(box);
        ctx.fillText(text, p.x, p.y);
      }

      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }

    // ----------------------------------------------------------
    // COMPASS
    // ----------------------------------------------------------

    if (showCompass) {
      const c = {
        x: size.w - 46,
        y: size.h - 46,
      };

      const north = proj.project(localView.ra, Math.min(89.5, localView.dec + 1));

      const center = proj.project(localView.ra, localView.dec);

      let angle = -Math.PI / 2;

      if (north && center) {
        angle = Math.atan2(north.y - center.y, north.x - center.x);
      }

      ctx.save();

      ctx.translate(c.x, c.y);

      ctx.strokeStyle = "rgba(150,178,220,0.35)";

      ctx.lineWidth = 1;

      ctx.beginPath();

      ctx.arc(0, 0, 22, 0, Math.PI * 2);

      ctx.stroke();

      ctx.rotate(angle);

      ctx.beginPath();

      ctx.moveTo(0, 0);

      ctx.lineTo(16, 0);

      ctx.strokeStyle = "rgba(122,196,255,0.85)";

      ctx.stroke();

      ctx.restore();

      const nx = c.x + Math.cos(angle) * 30;

      const ny = c.y + Math.sin(angle) * 30;

      ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";

      ctx.fillStyle = "rgba(150,178,220,0.8)";

      ctx.textAlign = "center";

      ctx.textBaseline = "middle";

      ctx.fillText("N", nx, ny);

      ctx.fillText(
        "E",
        c.x + Math.cos(angle + Math.PI / 2) * 30,
        c.y + Math.sin(angle + Math.PI / 2) * 30,
      );

      ctx.textAlign = "left";
    }
  }, [
    field,
    fieldRadius,
    localView,
    size,
    showLines,
    showBoundary,
    showAllConstellationBoundaries,
    boundaryIds,
    labelStarsProp,
    showGrid,
    showConstellationLabels,
    showEcliptic,
    showCelestialEquator,
    labelMode,
    target,
    emphasizeTarget,
    markers,
    showCompass,
  ]);

  // ------------------------------------------------------------
  // INTERACTION
  // ------------------------------------------------------------

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const v = viewRef.current;

      const nextFov = clampFov(v.fov / factor);

      if (nextFov === v.fov) {
        return;
      }

      let next: ViewState = {
        ...v,
        fov: nextFov,
      };

      if (cx !== undefined && cy !== undefined && size.w > 0) {
        const before = new Projection(v, size.w, size.h);

        const sky = before.unproject(cx, cy);

        for (let i = 0; i < 2; i++) {
          const proj = new Projection(next, size.w, size.h);

          const p = proj.project(sky.ra, sky.dec);

          if (!p) break;

          const dx = cx - p.x;

          const dy = cy - p.y;

          const c = proj.unproject(size.w / 2 - dx, size.h / 2 - dy);

          next = {
            ...next,
            ra: c.ra,
            dec: c.dec,
          };
        }
      }

      commit(next);
    },
    [commit, size.h, size.w],
  );

  const zoomRef = useRef(zoomAt);

  zoomRef.current = zoomAt;

  useEffect(() => {
    const el = wrapRef.current;

    if (!el || !interactive) {
      return;
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);

      const rect = el.getBoundingClientRect();

      zoomRef.current(Math.exp(-dy * 0.0018), e.clientX - rect.left, e.clientY - rect.top);
    };

    el.addEventListener("wheel", onWheel, {
      passive: false,
    });

    return () => el.removeEventListener("wheel", onWheel);
  }, [interactive]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;

    if (e.pointerType === "touch") {
      touchPointsRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });
    }

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    if (e.pointerType === "touch" && touchPointsRef.current.size >= 2) {
      const points = [...touchPointsRef.current.values()];
      const first = points[0]!;
      const second = points[1]!;
      pinchRef.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        centerX: (first.x + second.x) / 2,
        centerY: (first.y + second.y) / 2,
      };
      dragRef.current = null;
      return;
    }

    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") {
      const point = touchPointsRef.current.get(e.pointerId);
      if (point) {
        point.x = e.clientX;
        point.y = e.clientY;
      }

      if (pinchRef.current && touchPointsRef.current.size >= 2) {
        const points = [...touchPointsRef.current.values()];
        const first = points[0]!;
        const second = points[1]!;
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        const previous = pinchRef.current;

        if (distance > 0 && previous.distance > 0) {
          const rawRatio = distance / previous.distance;
          const dampedRatio = Math.min(1.06, Math.max(0.94, Math.pow(rawRatio, 0.35)));
          const rect = wrapRef.current?.getBoundingClientRect();
          if (rect) {
            zoomRef.current(dampedRatio, previous.centerX - rect.left, previous.centerY - rect.top);
          }
        }

        pinchRef.current = {
          distance,
          centerX: (first.x + second.x) / 2,
          centerY: (first.y + second.y) / 2,
        };
        return;
      }
    }

    const drag = dragRef.current;

    if (!drag || !interactive) {
      return;
    }

    const dx = e.clientX - drag.x;

    const dy = e.clientY - drag.y;

    if (Math.abs(dx) + Math.abs(dy) < 2) {
      return;
    }

    drag.moved = true;

    drag.x = e.clientX;

    drag.y = e.clientY;

    const proj = new Projection(viewRef.current, size.w, size.h);

    const c = proj.unproject(size.w / 2 - dx, size.h / 2 - dy);

    commit({
      ...viewRef.current,
      ra: c.ra,
      dec: c.dec,
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") {
      const drag = dragRef.current;
      const wasPinching = pinchRef.current !== null;
      touchPointsRef.current.delete(e.pointerId);
      if (touchPointsRef.current.size < 2) {
        pinchRef.current = null;
      }
      dragRef.current = null;
      if (wasPinching || !drag || drag.moved) return;
      dragRef.current = drag;
    }

    const drag = dragRef.current;

    dragRef.current = null;

    if (!drag || drag.moved || (!onStarClick && !onSkyClick)) {
      return;
    }

    const rect = wrapRef.current?.getBoundingClientRect();

    if (!rect) return;

    const proj = new Projection(viewRef.current, size.w, size.h);

    const sky = proj.unproject(e.clientX - rect.left, e.clientY - rect.top);

    onSkyClick?.(sky);

    if (!onStarClick) return;

    let best: Star | null = null;

    let bestSep = Infinity;

    for (const s of field) {
      const sep = angularSeparation(sky.ra, sky.dec, s.ra, s.dec);

      if (sep < bestSep) {
        bestSep = sep;
        best = s;
      }
    }

    if (best && bestSep < proj.degPerPixel * 18) {
      onStarClick(best);
    }
  };

  // ------------------------------------------------------------
  // COMPASS ROTATION CONTROL
  // ------------------------------------------------------------

  const compassRef = useRef<{
    cx: number;
    cy: number;
    angle: number;
    moved: boolean;
  } | null>(null);

  const compassAngle = (e: React.PointerEvent, cx: number, cy: number) =>
    (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;

  const onCompassDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    compassRef.current = {
      cx,
      cy,
      angle: compassAngle(e, cx, cy),
      moved: false,
    };
  };

  const onCompassMove = (e: React.PointerEvent) => {
    const c = compassRef.current;
    if (!c) return;
    e.stopPropagation();
    const angle = compassAngle(e, c.cx, c.cy);
    let delta = angle - c.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    if (!c.moved && Math.abs(delta) < 2) return;
    c.moved = true;
    c.angle = angle;
    const v = viewRef.current;
    commit({
      ...v,
      rotation: ((((v.rotation + delta) % 360) + 540) % 360) - 180,
    });
  };

  const onCompassUp = (e: React.PointerEvent) => {
    const c = compassRef.current;
    compassRef.current = null;
    if (!c) return;
    e.stopPropagation();
    if (!c.moved) {
      commit({ ...viewRef.current, rotation: 0 });
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      zoomBy: (factor: number) => zoomRef.current(factor),

      reset: () => commit(view),

      fit: () => {
        if (target) {
          commit(fitConstellation(target, size.w / Math.max(1, size.h)));
        } else {
          commit(view);
        }
      },

      getView: () => viewRef.current,
    }),
    [commit, target, size.w, size.h, view],
  );

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative min-w-0 w-full max-w-full touch-none overflow-hidden bg-[var(--sky)] select-none",
        interactive && "cursor-grab active:cursor-grabbing",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(e) => {
        if (e.pointerType === "touch") {
          touchPointsRef.current.delete(e.pointerId);
          if (touchPointsRef.current.size < 2) pinchRef.current = null;
        }
        dragRef.current = null;
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          display: "block",
        }}
      />
      {showCompass && interactive && (
        <div
          role="slider"
          aria-label="Rotate sky map"
          aria-valuenow={Math.round(localView.rotation)}
          aria-valuemin={-180}
          aria-valuemax={180}
          tabIndex={0}
          title="Drag to rotate, click to reset rotation"
          className="absolute z-10 cursor-grab rounded-full active:cursor-grabbing"
          style={{
            right: 18,
            bottom: 18,
            width: 56,
            height: 56,
          }}
          onPointerDown={onCompassDown}
          onPointerMove={onCompassMove}
          onPointerUp={onCompassUp}
          onPointerCancel={() => {
            compassRef.current = null;
          }}
        />
      )}
    </div>
  );
});
