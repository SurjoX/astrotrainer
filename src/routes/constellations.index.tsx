import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { constellations, importantStars, starLabel } from "@/lib/astro/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/constellations/")({
  head: () => ({
    meta: [
      { title: "Constellation Atlas — All 88 IAU Constellations | AstroTrainer" },
      {
        name: "description",
        content:
          "Browse all 88 official IAU constellations with traditional figures, key stars, best observing season and an interactive star map for each.",
      },
      { property: "og:title", content: "Constellation Atlas — All 88 IAU Constellations" },
      {
        property: "og:description",
        content: "Traditional figures, key stars and interactive sky views for every IAU constellation.",
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

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return constellations.filter((c) => {
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.abbreviation.toLowerCase().includes(q) ||
        c.figure.toLowerCase().includes(q);
      const matchesCategory =
        category === "All" ||
        (category === "Ecliptic" ? c.isEcliptic : c.region === category);
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  const random = () => {
    const c = constellations[Math.floor(Math.random() * constellations.length)]!;
    navigate({ to: "/constellations/$id", params: { id: c.id } });
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Constellation Atlas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All 88 official IAU constellations, drawn with the modern Stellarium line figures.
          </p>
        </div>
        <Button variant="secondary" onClick={random} className="gap-2">
          <Shuffle className="size-4" /> Random Constellation
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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
        <span className="font-mono text-xs text-muted-foreground sm:ml-auto">
          {list.length} of 88
        </span>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <li key={c.id} className="panel flex flex-col p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{c.name}</h2>
              <span className="font-mono text-xs text-muted-foreground">{c.abbreviation}</span>
            </div>
            <p className="text-sm text-primary">{c.figure}</p>
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {c.description}
            </p>
            <p className="mt-3 text-xs">
              <span className="label-caps">Key stars </span>
              <span className="text-muted-foreground">
                {importantStars(c).slice(0, 4).map(starLabel).join(", ") || "—"}
              </span>
            </p>
            <p className="mt-1 text-xs">
              <span className="label-caps">Best observed </span>
              <span className="text-muted-foreground">{c.bestSeason}</span>
            </p>
            <Button asChild variant="secondary" size="sm" className="mt-4 self-start">
              <Link to="/constellations/$id" params={{ id: c.id }}>
                View in Sky
              </Link>
            </Button>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No constellation matches “{query}”.
        </p>
      )}
    </main>
  );
}