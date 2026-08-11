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
  importantStars,
  starById,
  starLabel,
  starsInField,
} from "@/lib/astro/catalog";
import { clampFov, fitConstellation } from "@/lib/astro/fov";
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
  labelMode?: LabelMode;
  /** Dim stars that are not part of the target figure */
  emphasizeTarget?: boolean;
  interactive?: boolean;
  showCompass?: boolean;
  className?: string;
  onStarClick?: (star: Star) => void;
  onViewChange?: (view: ViewState) => void;
}

function starColor(spect: string | null): string {
  const t = (spect ?? "").charAt(0).toUpperCase();
  switch (t) {
    case "O":
      return "#a8c4ff";
    case "B":
      return "#c2d5ff";
    case "A":
      return "#e6ecff";
    case "F":
      return "#f8f6ef";
    case "G":
      return "#ffeeb8";
    case "K":
      return "#ffd39a";
    case "M":
      return "#ffb182";
    default:
      return "#eef2ff";
  }
}

export const StarMap = forwardRef<StarMapHandle, StarMapProps>(function StarMap(
  {
    target,
    view,
    magnitudeLimit = 6.5,
    showLines = false,
    labelMode = "none",
    emphasizeTarget = false,
    interactive = true,
    showCompass = true,
    className,
    onStarClick,
    onViewChange,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [localView, setLocalView] = useState<ViewState>(view);
  const viewRef = useRef(localView);
  viewRef.current = localView;
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

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

  // viewport measurement
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const field = useMemo(() => {
    const aspect = size.w / Math.max(1, size.h);
    const radius = (localView.fov / 2) * Math.max(1, aspect) * 1.25 + 2;
    return starsInField(localView.ra, localView.dec, Math.min(120, radius), magnitudeLimit);
  }, [localView.ra, localView.dec, localView.fov, magnitudeLimit, size.w, size.h]);

  // ---- rendering -----------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || size.h === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    const proj = new Projection(localView, size.w, size.h);
    const figureSet = new Set(target?.figureStars ?? []);

    // magnitude → radius, gently scaled with zoom level
    const zoomBoost = Math.max(0.75, Math.min(1.5, 45 / localView.fov + 0.55));
    const radiusFor = (mag: number) => {
      const base = Math.max(0.8, 0.85 * Math.pow(1.55, Math.max(-1.5, 6.4 - mag)));
      return Math.min(11, base * zoomBoost);
    };

    const positions = new Map<number, { x: number; y: number }>();
    for (const s of field) {
      const p = proj.project(s.ra, s.dec);
      if (!p) continue;
      if (p.x < -40 || p.y < -40 || p.x > size.w + 40 || p.y > size.h + 40) {
        positions.set(s.id, p);
        continue;
      }
      positions.set(s.id, p);
      const inFigure = figureSet.has(s.id);
      const r = radiusFor(s.magnitude);
      const alpha = emphasizeTarget && !inFigure ? 0.5 : 1;
      const color = starColor(s.spectralType);

      if (s.magnitude < 2.6) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4.2);
        glow.addColorStop(0, `rgba(190,214,255,${0.34 * alpha})`);
        glow.addColorStop(1, "rgba(190,214,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // constellation stick figure — same line data everywhere in the app
    if (showLines && target) {
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = "rgba(122,196,255,0.62)";
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const [a, b] of target.lineData) {
        const sa = starById.get(a);
        const sb = starById.get(b);
        if (!sa || !sb) continue;
        const pa = positions.get(a) ?? proj.project(sa.ra, sa.dec);
        const pb = positions.get(b) ?? proj.project(sb.ra, sb.dec);
        if (!pa || !pb) continue;
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      }
      ctx.stroke();
    }

    // labels with simple rectangle collision avoidance
    if (labelMode !== "none" && (target || labelMode === "all")) {
      let labelStars: Star[] = [];
      if (labelMode === "target" && target) {
        labelStars = importantStars(target).slice(0, 3);
      } else if (labelMode === "important" && target) {
        labelStars = importantStars(target);
      } else if (labelMode === "all") {
        labelStars = field.filter((s) => s.name && s.magnitude < 3.6);
      }
      ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
      ctx.textBaseline = "middle";
      const taken: { x: number; y: number; w: number; h: number }[] = [];

      // constellation name first, so star labels give way to it
      if (target) {
        const c = proj.project(target.centerRa, target.centerDec);
        if (c && c.x > 60 && c.y > 24 && c.x < size.w - 60 && c.y < size.h - 24) {
          ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
          const text = target.name.toUpperCase();
          const w = ctx.measureText(text).width;
          taken.push({ x: c.x - w / 2 - 6, y: c.y - 10, w: w + 12, h: 20 });
          ctx.fillStyle = "rgba(126,190,255,0.5)";
          ctx.textAlign = "center";
          ctx.fillText(text, c.x, c.y);
          ctx.textAlign = "left";
        }
        ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
      }

      for (const s of labelStars) {
        const p = positions.get(s.id) ?? proj.project(s.ra, s.dec);
        if (!p) continue;
        if (p.x < 8 || p.y < 8 || p.x > size.w - 8 || p.y > size.h - 8) continue;
        const text = starLabel(s);
        const w = ctx.measureText(text).width;
        const box = { x: p.x + 8, y: p.y - 6, w: w + 4, h: 14 };
        const clash = taken.some(
          (t) => box.x < t.x + t.w && box.x + box.w > t.x && box.y < t.y + t.h && box.y + box.h > t.y,
        );
        if (clash) continue;
        taken.push(box);
        ctx.fillStyle = "rgba(168,199,250,0.92)";
        ctx.fillText(text, p.x + 9, p.y - 1);
      }
    }

    // compass: direction of celestial north at the field centre
    if (showCompass) {
      const c = { x: size.w - 46, y: size.h - 46 };
      const north = proj.project(localView.ra, Math.min(89.5, localView.dec + 1));
      const center = proj.project(localView.ra, localView.dec);
      let angle = -Math.PI / 2;
      if (north && center) angle = Math.atan2(north.y - center.y, north.x - center.x);
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
      ctx.fillText("E", c.x + Math.cos(angle + Math.PI / 2) * 30, c.y + Math.sin(angle + Math.PI / 2) * 30);
      ctx.textAlign = "left";
    }
  }, [field, localView, size, showLines, labelMode, target, emphasizeTarget, showCompass]);

  // ---- interaction ---------------------------------------------------------
  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const v = viewRef.current;
      const nextFov = clampFov(v.fov / factor);
      if (nextFov === v.fov) return;
      let next: ViewState = { ...v, fov: nextFov };
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
          next = { ...next, ra: c.ra, dec: c.dec };
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
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      zoomRef.current(Math.exp(-dy * 0.0018), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [interactive]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !interactive) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) < 2) return;
    drag.moved = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
    const proj = new Projection(viewRef.current, size.w, size.h);
    const c = proj.unproject(size.w / 2 - dx, size.h / 2 - dy);
    commit({ ...viewRef.current, ra: c.ra, dec: c.dec });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved || !onStarClick) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const proj = new Projection(viewRef.current, size.w, size.h);
    const sky = proj.unproject(e.clientX - rect.left, e.clientY - rect.top);
    let best: Star | null = null;
    let bestSep = Infinity;
    for (const s of field) {
      const sep = angularSeparation(sky.ra, sky.dec, s.ra, s.dec);
      if (sep < bestSep) {
        bestSep = sep;
        best = s;
      }
    }
    if (best && bestSep < proj.degPerPixel * 18) onStarClick(best);
  };

  useImperativeHandle(ref, () => ({
    zoomBy: (factor: number) => zoomRef.current(factor),
    reset: () => commit(view),
    fit: () => {
      if (target) commit(fitConstellation(target, size.w / Math.max(1, size.h)));
      else commit(view);
    },
    getView: () => viewRef.current,
  }));

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative touch-none overflow-hidden bg-[var(--sky)] select-none",
        interactive && "cursor-grab active:cursor-grabbing",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (dragRef.current = null)}
    >
      <canvas ref={canvasRef} style={{ width: size.w, height: size.h }} />
    </div>
  );
});