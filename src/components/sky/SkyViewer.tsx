import { useEffect, useMemo, useRef, useState } from "react";
import { Grid3x3, Minus, Plus, RotateCcw, Spline, Squircle, Tag } from "lucide-react";
import { StarMap, type SkyMarker, type StarMapHandle } from "./StarMap";
import { fitConstellation } from "@/lib/astro/fov";
import type { ViewState } from "@/lib/astro/projection";
import type { Constellation, LabelMode, Star } from "@/lib/astro/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SkyViewerProps {
  constellation?: Constellation | null;
  /** Overrides the auto-fitted view (used by practice questions) */
  view?: ViewState;
  magnitudeLimit?: number;
  defaultLines?: boolean;
  showAllConstellationLines?: boolean;
  defaultLabels?: boolean;
  defaultBoundary?: boolean;
  defaultGrid?: boolean;
  defaultEcliptic?: boolean;
  defaultCelestialEquator?: boolean;
  showAllConstellationBoundaries?: boolean;
  labelsMode?: "star" | "constellation";
  emphasizeTarget?: boolean;
  lockToggles?: boolean;
  className?: string;
  mapClassName?: string;
  labelModeWhenOn?: LabelMode;
  onSkyClick?: (position: { ra: number; dec: number }) => void;
  markers?: SkyMarker[] | undefined;
  /** Constellation ids whose IAU boundary to draw (asterisms span several) */
  boundaryIds?: string[] | undefined;
  /** Explicit stars to label instead of the target-derived selection */
  labelStars?: Star[] | undefined;
}

/**
 * The single sky surface used by practice, the post-answer reveal, Study
 * Constellation and the atlas' View in Sky. Only visibility flags differ.
 */
export function SkyViewer({
  constellation,
  view,
  magnitudeLimit = 6.2,
  defaultLines = true,
  showAllConstellationLines = false,
  defaultLabels = true,
  defaultBoundary = false,
  defaultGrid = false,
  defaultEcliptic = false,
  defaultCelestialEquator = false,
  showAllConstellationBoundaries = false,
  labelsMode = "star",
  emphasizeTarget = false,
  lockToggles = false,
  className,
  mapClassName,
  labelModeWhenOn = "important",
  onSkyClick,
  markers,
  boundaryIds,
  labelStars,
}: SkyViewerProps) {
  const mapRef = useRef<StarMapHandle>(null);
  const [lines, setLines] = useState(defaultLines);
  const [labels, setLabels] = useState(defaultLabels);
  const [boundary, setBoundary] = useState(defaultBoundary);
  const [grid, setGrid] = useState(defaultGrid);
  const [ecliptic, setEcliptic] = useState(defaultEcliptic);
  const [celestialEquator, setCelestialEquator] = useState(defaultCelestialEquator);

  useEffect(() => setLines(defaultLines), [defaultLines]);
  useEffect(() => setLabels(defaultLabels), [defaultLabels]);
  useEffect(() => setBoundary(defaultBoundary), [defaultBoundary]);
  useEffect(() => setGrid(defaultGrid), [defaultGrid]);
  useEffect(() => setEcliptic(defaultEcliptic), [defaultEcliptic]);
  useEffect(() => setCelestialEquator(defaultCelestialEquator), [defaultCelestialEquator]);

  const starLabelsOn = labelsMode !== "constellation" && labels;
  const constellationLabelsOn = labelsMode === "constellation" && labels;

  const baseView = useMemo<ViewState>(() => {
    if (view) return view;
    if (constellation) return fitConstellation(constellation);
    return { ra: 0, dec: 0, fov: 60, rotation: 0 };
  }, [view, constellation]);

  return (
    <div className={cn("relative min-w-0 w-full max-w-full", className)}>
      <StarMap
        ref={mapRef}
        target={constellation ?? null}
        view={baseView}
        magnitudeLimit={magnitudeLimit}
        showLines={lines}
        showAllConstellationLines={showAllConstellationLines}
        showBoundary={boundary}
        showAllConstellationBoundaries={showAllConstellationBoundaries}
        showGrid={grid}
        showConstellationLabels={constellationLabelsOn}
        showEcliptic={ecliptic}
        showCelestialEquator={celestialEquator}
        labelMode={starLabelsOn ? labelModeWhenOn : "none"}
        boundaryIds={boundaryIds}
        labelStars={starLabelsOn ? labelStars : undefined}
        emphasizeTarget={emphasizeTarget}
        onSkyClick={onSkyClick}
        markers={markers}
        className={cn("h-full w-full", mapClassName)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 p-2 sm:p-3">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-full border border-white/10 bg-slate-950/60 p-1 shadow-[0_12px_30px_rgba(2,8,18,0.42)] backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            aria-label="Zoom in"
            onClick={() => mapRef.current?.zoomBy(1.35)}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            aria-label="Zoom out"
            onClick={() => mapRef.current?.zoomBy(1 / 1.35)}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            aria-label="Reset view"
            onClick={() => mapRef.current?.reset()}
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
        {!lockToggles && (
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-full border border-white/10 bg-slate-950/60 p-1 shadow-[0_12px_30px_rgba(2,8,18,0.42)] backdrop-blur-md">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 rounded-full px-2.5 text-[0.7rem] font-medium",
                lines
                  ? "bg-primary/12 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground",
              )}
              onClick={() => setLines((v) => !v)}
              aria-pressed={lines}
            >
              <Spline className="size-3.5" /> Lines
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 rounded-full px-2.5 text-[0.7rem] font-medium",
                labels
                  ? "bg-primary/12 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground",
              )}
              onClick={() => setLabels((v) => !v)}
              aria-pressed={labels}
            >
              <Tag className="size-3.5" /> Labels
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 rounded-full px-2.5 text-[0.7rem] font-medium",
                boundary
                  ? "bg-primary/12 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground",
              )}
              onClick={() => setBoundary((v) => !v)}
              aria-pressed={boundary}
            >
              <Squircle className="size-3.5" /> Boundary
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 rounded-full px-2.5 text-[0.7rem] font-medium",
                grid
                  ? "bg-primary/12 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground",
              )}
              onClick={() => setGrid((v) => !v)}
              aria-pressed={grid}
            >
              <Grid3x3 className="size-3.5" /> Grid
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 rounded-full px-2.5 text-[0.7rem] font-medium",
                ecliptic
                  ? "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/25"
                  : "text-muted-foreground",
              )}
              onClick={() => setEcliptic((v) => !v)}
              aria-pressed={ecliptic}
            >
              Ecliptic
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 rounded-full px-2.5 text-[0.7rem] font-medium",
                celestialEquator
                  ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/25"
                  : "text-muted-foreground",
              )}
              onClick={() => setCelestialEquator((v) => !v)}
              aria-pressed={celestialEquator}
            >
              Celestial Equator
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
