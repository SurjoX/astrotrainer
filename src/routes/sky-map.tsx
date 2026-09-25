import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SkyViewer } from "@/components/sky/SkyViewer";
import type { ViewState } from "@/lib/astro/projection";

export const Route = createFileRoute("/sky-map")({
  head: () => ({
    meta: [
      { title: "Sky Map — AstroTrainer" },
      {
        name: "description",
        content:
          "Explore the whole sky with real constellation lines, boundaries, labels and an equatorial grid.",
      },
      { property: "og:title", content: "Sky Map — AstroTrainer" },
      {
        property: "og:description",
        content: "Whole-sky astronomy atlas with interactive zoom, pan and all 88 constellations.",
      },
    ],
  }),
  component: SkyMapPage,
});

function SkyMapPage() {
  const initialView = useMemo<ViewState>(
    () => ({
      ra: 0,
      dec: 0,
      fov: 150,
      rotation: 0,
    }),
    [],
  );

  return (
    <main className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps">Whole sky atlas</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Sky Map</h1>
        </div>
      </header>

      <div className="panel min-w-0 overflow-hidden border border-border/70 bg-card/50">
        <SkyViewer
          view={initialView}
          magnitudeLimit={6.2}
          defaultLines={false}
          defaultLabels={true}
          defaultBoundary={false}
          defaultGrid={false}
          defaultEcliptic={false}
          defaultCelestialEquator={false}
          showAllConstellationLines
          showAllConstellationBoundaries
          labelsMode="constellation"
          labelModeWhenOn="important"
          className="h-[calc(100vh-12rem)] min-h-[420px] sm:h-[calc(100vh-13rem)]"
          mapClassName="rounded-lg"
        />
      </div>
    </main>
  );
}
