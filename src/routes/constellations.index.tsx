import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Search, Shuffle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { constellations, importantStars, starLabelWithBayer } from "@/lib/astro/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/constellations/")({
  head: () => ({
    meta: [
      {
        title: "Constellation Atlas — All 88 IAU Constellations | AstroTrainer",
      },
      {
        name: "description",
        content:
          "Browse all 88 official IAU constellations with traditional figures, key stars, best observing season and an interactive star map for each.",
      },
      {
        property: "og:title",
        content: "Constellation Atlas — All 88 IAU Constellations",
      },
      {
        property: "og:description",
        content:
          "Traditional figures, key stars and interactive sky views for every IAU constellation.",
      },
    ],
  }),
  component: AtlasPage,
});

const CATEGORIES = ["All", "Northern", "Equatorial", "Southern", "Ecliptic"] as const;

type Category = (typeof CATEGORIES)[number];

function AtlasPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");

  // The constellation whose IAU chart is currently open.
  const [iauConstellation, setIauConstellation] = useState<(typeof constellations)[number] | null>(
    null,
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();

    return constellations.filter((c) => {
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.abbreviation.toLowerCase().includes(q) ||
        c.figure.toLowerCase().includes(q);

      const matchesCategory =
        category === "All" || (category === "Ecliptic" ? c.isEcliptic : c.region === category);

      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  // Pick a random constellation.
  const random = () => {
    const c = constellations[Math.floor(Math.random() * constellations.length)]!;

    navigate({
      to: "/constellations/$id",
      params: { id: c.id },
    });
  };

  /*
   * IAU PDFs are stored in:
   *
   * public/iau-constellations/
   *
   * using lowercase abbreviations:
   *
   * UMa -> uma.pdf
   * UMi -> umi.pdf
   * Ori -> ori.pdf
   * Cyg -> cyg.pdf
   * etc.
   */
  const getIauPdfPath = (abbreviation: string) =>
    `/iau-constellations/${abbreviation.toLowerCase()}.pdf`;

  const closeIauViewer = () => {
    setIauConstellation(null);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ====================================================== */}
      {/* PAGE HEADER                                            */}
      {/* ====================================================== */}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Constellation Atlas</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            All 88 official IAU constellations, drawn with the modern Stellarium line figures.
          </p>
        </div>

        <Button variant="secondary" onClick={random} className="gap-2">
          <Shuffle className="size-4" />
          Random Constellation
        </Button>
      </div>

      {/* ====================================================== */}
      {/* SEARCH + FILTERS                                      */}
      {/* ====================================================== */}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search constellations..."
            aria-label="Search constellations"
            className="pl-9"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-md border border-border px-3 py-1.5 text-xs transition-colors",
                category === c
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Count */}
        <span className="font-mono text-xs text-muted-foreground sm:ml-auto">
          {list.length} of 88
        </span>
      </div>

      {/* ====================================================== */}
      {/* CONSTELLATION CARDS                                   */}
      {/* ====================================================== */}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <li key={c.id} className="panel flex flex-col p-4">
            {/* Name + abbreviation */}
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{c.name}</h2>

              <span className="font-mono text-xs text-muted-foreground">{c.abbreviation}</span>
            </div>

            {/* Figure */}
            <p className="text-sm text-primary">{c.figure}</p>

            {/* Description */}
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {c.description}
            </p>

            {/* Bright stars */}
            <p className="mt-3 text-xs">
              <span className="label-caps">Bright stars </span>

              <span className="text-muted-foreground">
                {importantStars(c).slice(0, 4).map(starLabelWithBayer).join(", ") || "—"}
              </span>
            </p>

            {/* Best observed */}
            <p className="mt-1 text-xs">
              <span className="label-caps">Best observed </span>

              <span className="text-muted-foreground">{c.bestSeason}</span>
            </p>

            {/* ================================================== */}
            {/* ACTION BUTTONS                                    */}
            {/* ================================================== */}

            <div className="mt-4 flex flex-wrap gap-2">
              {/* View in Sky */}
              <Button asChild variant="secondary" size="sm">
                <Link to="/constellations/$id" params={{ id: c.id }}>
                  View in Sky
                </Link>
              </Button>

              {/* IAU Chart */}
              <Button variant="secondary" size="sm" onClick={() => setIauConstellation(c)}>
                IAU Chart
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {/* ====================================================== */}
      {/* NO SEARCH RESULTS                                     */}
      {/* ====================================================== */}

      {list.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No constellation matches “{query}”.
        </p>
      )}

      {/* ====================================================== */}
      {/* IAU PDF MODAL                                         */}
      {/* ====================================================== */}

      {iauConstellation &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={`${iauConstellation.name} IAU chart`}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                closeIauViewer();
              }
            }}
          >
            {/* ================================================== */}
            {/* MODAL                                              */}
            {/* ================================================== */}

            <div className="flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
              {/* ================================================= */}
              {/* MODAL HEADER                                     */}
              {/* ================================================= */}

              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
                {/* Title */}
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold">{iauConstellation.name}</h2>

                  <p className="text-xs text-muted-foreground">Official IAU constellation chart</p>
                </div>

                {/* Header actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {/* Download PDF */}
                  <a
                    href={getIauPdfPath(iauConstellation.abbreviation)}
                    download={`${iauConstellation.abbreviation.toLowerCase()}.pdf`}
                  >
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Download className="size-4" />
                      Download PDF
                    </Button>
                  </a>

                  {/* Close */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeIauViewer}
                    aria-label="Close IAU chart"
                  >
                    <X className="size-5" />
                  </Button>
                </div>
              </div>

              {/* ================================================= */}
              {/* PDF VIEWER                                       */}
              {/* ================================================= */}

              <div className="min-h-0 flex-1 bg-muted">
                <iframe
                  src={getIauPdfPath(iauConstellation.abbreviation)}
                  title={`${iauConstellation.name} IAU chart`}
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </main>
  );
}
