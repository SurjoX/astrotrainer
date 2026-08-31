import { useEffect, useMemo, useRef, useState } from "react";
import { Grid3x3, Maximize2, Minus, Plus, RotateCcw, Spline, Squircle, Tag } from "lucide-react";
import { StarMap, type StarMapHandle } from "./StarMap";
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
  defaultLabels?: boolean;
  defaultBoundary?: boolean;
  defaultGrid?: boolean;
  emphasizeTarget?: boolean;
  lockToggles?: boolean;
  className?: string;
  mapClassName?: string;
  labelModeWhenOn?: LabelMode;
  /** Constellation ids whose IAU boundary to draw (asterisms span several) */
  boundaryIds?: string[];
  /** Explicit stars to label instead of the target-derived selection */
  labelStars?: Star[];
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
  defaultLabels = true,
  defaultBoundary = false,
  defaultGrid = false,
  emphasizeTarget = false,
  lockToggles = false,
  className,
  mapClassName,
  labelModeWhenOn = "important",
  boundaryIds,
  labelStars,
}: SkyViewerProps) {
  const mapRef = useRef<StarMapHandle>(null);
  const [lines, setLines] = useState(defaultLines);
  const [labels, setLabels] = useState(defaultLabels);
  const [boundary, setBoundary] = useState(defaultBoundary);
  const [grid, setGrid] = useState(defaultGrid);

  useEffect(() => setLines(defaultLines), [defaultLines]);
  useEffect(() => setLabels(defaultLabels), [defaultLabels]);
  useEffect(() => setBoundary(defaultBoundary), [defaultBoundary]);
  useEffect(() => setGrid(defaultGrid), [defaultGrid]);

  const baseView = useMemo<ViewState>(() => {
    if (view) return view;
    if (constellation) return fitConstellation(constellation);
    return { ra: 0, dec: 0, fov: 60, rotation: 0 };
  }, [view, constellation]);

  return (
    <div className={cn("relative", className)}>
      <StarMap
        ref={mapRef}
        target={constellation ?? null}
        view={baseView}
        magnitudeLimit={magnitudeLimit}
        showLines={lines}
        showBoundary={boundary}
        showGrid={grid}
        labelMode={labels ? labelModeWhenOn : "none"}
        boundaryIds={boundaryIds}
        labelStars={labels ? labelStars : undefined}
        emphasizeTarget={emphasizeTarget}
        className={cn("h-full w-full", mapClassName)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 p-2 sm:p-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-border/70 bg-background/70 p-1 backdrop-blur">
          <Button variant="ghost" size="icon" className="size-8" aria-label="Zoom in" onClick={() => mapRef.current?.zoomBy(1.35)}>
            <Plus className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Zoom out" onClick={() => mapRef.current?.zoomBy(1 / 1.35)}>
            <Minus className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Reset view" onClick={() => mapRef.current?.reset()}>
            <RotateCcw className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Fit constellation" onClick={() => mapRef.current?.fit()}>
            <Maximize2 className="size-4" />
          </Button>
        </div>
        {!lockToggles && (
          <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-border/70 bg-background/70 p-1 backdrop-blur">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1.5 px-2 text-xs", lines ? "text-primary" : "text-muted-foreground")}
              onClick={() => setLines((v) => !v)}
              aria-pressed={lines}
            >
              <Spline className="size-3.5" /> Lines
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1.5 px-2 text-xs", labels ? "text-primary" : "text-muted-foreground")}
              onClick={() => setLabels((v) => !v)}
              aria-pressed={labels}
            >
              <Tag className="size-3.5" /> Labels
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1.5 px-2 text-xs", boundary ? "text-primary" : "text-muted-foreground")}
              onClick={() => setBoundary((v) => !v)}
              aria-pressed={boundary}
            >
              <Squircle className="size-3.5" /> Boundary
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1.5 px-2 text-xs", grid ? "text-primary" : "text-muted-foreground")}
              onClick={() => setGrid((v) => !v)}
              aria-pressed={grid}
            >
              <Grid3x3 className="size-3.5" /> Grid
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}