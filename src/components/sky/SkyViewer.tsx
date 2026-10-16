import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  Spline,
  Tag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { messierObjects } from "@/lib/astro/messier";
import { OVERLAY_COLORS } from "@/lib/astro/overlayColors";
import {
  AUTUMNAL_EQUINOX,
  NORTH_CELESTIAL_POLE,
  NORTH_GALACTIC_POLE,
  SOUTH_CELESTIAL_POLE,
  SOUTH_GALACTIC_POLE,
  VERNAL_EQUINOX,
} from "@/lib/astro/referencePoints";
import { fitConstellation } from "@/lib/astro/fov";
import type { ViewState } from "@/lib/astro/projection";
import type { Constellation, LabelMode, Star } from "@/lib/astro/types";
import { cn } from "@/lib/utils";
import { StarMap, type SkyMarker, type StarMapHandle } from "./StarMap";

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
  allowExpand?: boolean;
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

type Visibility = {
  lines: boolean;
  labels: boolean;
  asterismLabels: boolean;
  boundary: boolean;
  grid: boolean;
  ecliptic: boolean;
  celestialEquator: boolean;
  galacticEquator: boolean;
  ncp: boolean;
  scp: boolean;
  ngp: boolean;
  sgp: boolean;
  vernalEquinox: boolean;
  autumnalEquinox: boolean;
  messier: boolean;
  asterisms: boolean;
};

type VisibilityKey = keyof Visibility;

const LINE_ITEMS: { key: VisibilityKey; label: string; color: string }[] = [
  { key: "lines", label: "Constellation Lines", color: OVERLAY_COLORS.constellationLines },
  {
    key: "boundary",
    label: "Constellation Boundaries",
    color: OVERLAY_COLORS.constellationBoundaries,
  },
  { key: "grid", label: "Equatorial Coordinate Grid", color: OVERLAY_COLORS.equatorialGrid },
  { key: "ecliptic", label: "Ecliptic", color: OVERLAY_COLORS.ecliptic },
  { key: "celestialEquator", label: "Celestial Equator", color: OVERLAY_COLORS.celestialEquator },
  { key: "galacticEquator", label: "Galactic Equator", color: OVERLAY_COLORS.galacticEquator },
  { key: "asterisms", label: "Asterisms", color: OVERLAY_COLORS.asterisms },
];

const MARKER_ITEMS: { key: VisibilityKey; label: string; color: string; title?: string }[] = [
  { key: "ncp", label: "North Celestial Pole (NCP)", color: OVERLAY_COLORS.celestialPoles },
  { key: "scp", label: "South Celestial Pole (SCP)", color: OVERLAY_COLORS.celestialPoles },
  { key: "ngp", label: "North Galactic Pole", color: OVERLAY_COLORS.galacticPoles },
  { key: "sgp", label: "South Galactic Pole", color: OVERLAY_COLORS.galacticPoles },
  { key: "vernalEquinox", label: "Vernal Equinox", color: OVERLAY_COLORS.equinoxes },
  { key: "autumnalEquinox", label: "Autumnal Equinox", color: OVERLAY_COLORS.equinoxes },
  { key: "messier", label: "Show Messier Objects", color: OVERLAY_COLORS.messier },
];

const ACTIVE_ITEM_STYLE = (color: string): React.CSSProperties => ({
  color,
  backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
  borderColor: `color-mix(in srgb, ${color} 32%, transparent)`,
});

const TOGGLE_STYLE = (
  color: string,
  checked: boolean,
): React.CSSProperties & {
  "--overlay-toggle-color": string;
  "--overlay-toggle-background": string;
  "--overlay-toggle-border": string;
} => ({
  "--overlay-toggle-color": color,
  "--overlay-toggle-background": `color-mix(in srgb, ${color} 14%, transparent)`,
  "--overlay-toggle-border": `color-mix(in srgb, ${color} 32%, transparent)`,
  ...(checked ? ACTIVE_ITEM_STYLE(color) : {}),
});

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
  allowExpand = false,
  className,
  mapClassName,
  labelModeWhenOn = "important",
  onSkyClick,
  markers,
  boundaryIds,
  labelStars,
}: SkyViewerProps) {
  const mapRef = useRef<StarMapHandle>(null);
  const [expanded, setExpanded] = useState(false);
  const [openMenu, setOpenMenu] = useState<"lines" | "markers" | "labels" | null>(null);
  const [visibility, setVisibility] = useState<Visibility>({
    lines: defaultLines,
    labels: defaultLabels,
    asterismLabels: false,
    boundary: defaultBoundary,
    grid: defaultGrid,
    ecliptic: defaultEcliptic,
    celestialEquator: defaultCelestialEquator,
    galacticEquator: false,
    ncp: false,
    scp: false,
    ngp: false,
    sgp: false,
    vernalEquinox: false,
    autumnalEquinox: false,
    messier: false,
    asterisms: false,
  });

  useEffect(() => {
    setVisibility((current) => ({
      ...current,
      lines: defaultLines,
      labels: defaultLabels,
      boundary: defaultBoundary,
      grid: defaultGrid,
      ecliptic: defaultEcliptic,
      celestialEquator: defaultCelestialEquator,
    }));
  }, [
    defaultLines,
    defaultLabels,
    defaultBoundary,
    defaultGrid,
    defaultEcliptic,
    defaultCelestialEquator,
  ]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (openMenu !== null) {
        setOpenMenu(null);
      } else {
        setExpanded(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [expanded, openMenu]);

  const toggle = (key: VisibilityKey, checked: boolean) => {
    setVisibility((current) => ({ ...current, [key]: checked }));
  };

  const starLabelsOn = labelsMode !== "constellation" && visibility.labels;
  const constellationLabelsOn = labelsMode === "constellation" && visibility.labels;

  const baseView = useMemo<ViewState>(() => {
    if (view) return view;
    if (constellation) return fitConstellation(constellation);
    return { ra: 0, dec: 0, fov: 60, rotation: 0 };
  }, [view, constellation]);

  const referenceMarkers = useMemo<SkyMarker[]>(() => {
    const result: SkyMarker[] = [];
    const addPoint = (
      position: { ra: number; dec: number },
      label: string,
      color: string,
      markerStyle: SkyMarker["markerStyle"] = "plus",
      symbol?: string,
    ) =>
      result.push({
        ...position,
        label,
        color,
        markerStyle,
        ...(symbol ? { symbol } : {}),
      });

    if (visibility.ncp) addPoint(NORTH_CELESTIAL_POLE, "NCP", OVERLAY_COLORS.celestialPoles);
    if (visibility.scp) addPoint(SOUTH_CELESTIAL_POLE, "SCP", OVERLAY_COLORS.celestialPoles);
    if (visibility.ngp) addPoint(NORTH_GALACTIC_POLE, "NGP", OVERLAY_COLORS.galacticPoles);
    if (visibility.sgp) addPoint(SOUTH_GALACTIC_POLE, "SGP", OVERLAY_COLORS.galacticPoles);
    if (visibility.vernalEquinox)
      addPoint(VERNAL_EQUINOX, "Vernal Equinox", OVERLAY_COLORS.equinoxes, "symbol", "♈");
    if (visibility.autumnalEquinox)
      addPoint(AUTUMNAL_EQUINOX, "Autumnal Equinox", OVERLAY_COLORS.equinoxes, "symbol", "♎");
    if (visibility.messier) {
      for (const object of messierObjects) {
        addPoint(
          { ra: object.ra, dec: object.dec },
          object.designation,
          OVERLAY_COLORS.messier,
          "plus",
        );
      }
    }

    return result;
  }, [
    visibility.ncp,
    visibility.scp,
    visibility.ngp,
    visibility.sgp,
    visibility.vernalEquinox,
    visibility.autumnalEquinox,
    visibility.messier,
  ]);

  const allMarkers = useMemo(
    () => [...(markers ?? []), ...referenceMarkers],
    [markers, referenceMarkers],
  );

  const renderToggle = (key: VisibilityKey, label: string, color: string, title?: string) => (
    <DropdownMenuCheckboxItem
      key={key}
      checked={visibility[key]}
      onCheckedChange={(checked) => toggle(key, checked)}
      onSelect={(event) => event.preventDefault()}
      title={title}
      data-sky-overlay-toggle=""
      className={cn(
        "min-h-9 border border-transparent pr-3 focus-visible:ring-2 focus-visible:ring-ring",
        visibility[key] && "font-medium",
      )}
      style={TOGGLE_STYLE(color, visibility[key])}
    >
      {label}
    </DropdownMenuCheckboxItem>
  );

  const handleMenuInteractOutside = (event: Event) => {
    if (!(event.target instanceof Element) || !event.target.closest("[data-sky-menu-trigger]")) {
      event.preventDefault();
    }
  };

  return (
    <div
      className={cn(
        "relative min-w-0 w-full max-w-full",
        expanded && "sky-map-expanded",
        expanded
          ? "fixed inset-0 z-[100] flex h-screen h-[100dvh] w-screen max-w-none flex-col overflow-hidden bg-[var(--sky)] p-2 sm:p-3"
          : className,
      )}
    >
      <div className={expanded ? "min-h-0 flex-1" : "h-full"}>
        <StarMap
          ref={mapRef}
          target={constellation ?? null}
          view={baseView}
          magnitudeLimit={magnitudeLimit}
          showLines={visibility.lines}
          showAllConstellationLines={showAllConstellationLines}
          showBoundary={visibility.boundary}
          showAllConstellationBoundaries={showAllConstellationBoundaries}
          showGrid={visibility.grid}
          showConstellationLabels={constellationLabelsOn}
          showEcliptic={visibility.ecliptic}
          showCelestialEquator={visibility.celestialEquator}
          showGalacticEquator={visibility.galacticEquator}
          showAsterisms={visibility.asterisms}
          showAsterismLabels={visibility.asterismLabels}
          labelMode={starLabelsOn ? labelModeWhenOn : "none"}
          boundaryIds={boundaryIds}
          labelStars={starLabelsOn ? labelStars : undefined}
          emphasizeTarget={emphasizeTarget}
          onSkyClick={onSkyClick}
          markers={allMarkers}
          className={cn("h-full w-full", !expanded && mapClassName)}
        />
      </div>

      <div
        className={cn(
          "relative z-20 flex flex-wrap items-center gap-1.5",
          expanded
            ? "w-full shrink-0 justify-between border-t border-white/10 bg-slate-950/75 px-1 py-2 backdrop-blur-md sm:px-2"
            : "pointer-events-none absolute inset-x-0 bottom-0 p-2 sm:p-3",
        )}
      >
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
            <DropdownMenu
              open={openMenu === "lines"}
              onOpenChange={(open) =>
                setOpenMenu((current) => (open ? "lines" : current === "lines" ? null : current))
              }
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full px-2.5 text-[0.7rem] font-medium text-muted-foreground"
                  aria-label="Open Lines menu"
                  data-sky-menu-trigger=""
                >
                  <Spline className="size-3.5" />
                  Lines
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={8}
                collisionPadding={8}
                className="z-[120] w-64"
                onInteractOutside={handleMenuInteractOutside}
              >
                <DropdownMenuLabel>Lines</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LINE_ITEMS.map(({ key, label, color }) => renderToggle(key, label, color))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu
              open={openMenu === "markers"}
              onOpenChange={(open) =>
                setOpenMenu((current) =>
                  open ? "markers" : current === "markers" ? null : current,
                )
              }
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full px-2.5 text-[0.7rem] font-medium text-muted-foreground"
                  aria-label="Open Markers menu"
                  data-sky-menu-trigger=""
                >
                  Markers
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={8}
                collisionPadding={8}
                className="z-[120] w-64"
                onInteractOutside={handleMenuInteractOutside}
              >
                <DropdownMenuLabel>Markers</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {MARKER_ITEMS.map(({ key, label, color, title }) =>
                  renderToggle(key, label, color, title),
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu
              open={openMenu === "labels"}
              onOpenChange={(open) =>
                setOpenMenu((current) => (open ? "labels" : current === "labels" ? null : current))
              }
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full px-2.5 text-[0.7rem] font-medium text-muted-foreground"
                  aria-label="Open Labels menu"
                  data-sky-menu-trigger=""
                >
                  <Tag className="size-3.5" />
                  Labels
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={8}
                collisionPadding={8}
                className="z-[120] w-64"
                onInteractOutside={handleMenuInteractOutside}
              >
                <DropdownMenuLabel>Labels</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {renderToggle(
                  "labels",
                  labelsMode === "constellation" ? "Constellation Labels" : "Star Labels",
                  "#d7e4ff",
                )}
                {renderToggle("asterismLabels", "Asterism Labels", OVERLAY_COLORS.asterisms)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {allowExpand && (
          <div className="pointer-events-auto ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 rounded-full border border-white/10 bg-slate-950/60 px-3 text-xs shadow-[0_12px_30px_rgba(2,8,18,0.42)] backdrop-blur-md"
              aria-label={expanded ? "Exit expanded sky map" : "Expand sky map"}
              onClick={() => {
                setOpenMenu(null);
                setExpanded((current) => !current);
              }}
            >
              {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              {expanded ? "Collapse" : "Extend"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
