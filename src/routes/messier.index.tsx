import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocalImageGallery } from "@/components/app/LocalImageGallery";
import { messierObjects, randomMessier, searchMessier, type MessierType } from "@/lib/astro/messier";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messier/")({
  head: () => ({ meta: [{ title: "Messier Objects — AstroTrainer" }] }),
  component: MessierCatalog,
});

const FILTERS: { label: string; value: MessierType | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Galaxies", value: "Galaxy" },
  { label: "Nebulae", value: "Nebula" },
  { label: "Open Clusters", value: "Open Cluster" },
  { label: "Globular Clusters", value: "Globular Cluster" },
  { label: "Planetary Nebulae", value: "Planetary Nebula" },
  { label: "Other", value: "Other" },
];

function MessierCatalog() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MessierType | "All">("All");
  const list = useMemo(
    () => searchMessier(query).filter((object) => filter === "All" || object.filterType === filter),
    [query, filter],
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Messier Objects</h1>
          <p className="mt-1 text-sm text-muted-foreground">The complete M1–M110 deep-sky catalog.</p>
        </div>
        <Button variant="secondary" className="gap-2" onClick={() => navigate({ to: "/messier/$id", params: { id: randomMessier().id } })}>
          <Shuffle className="size-4" /> Random object
        </Button>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search M42, Orion, galaxy..." aria-label="Search Messier objects" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((item) => (
            <button key={item.value} onClick={() => setFilter(item.value)} className={cn("rounded-md border border-border px-3 py-1.5 text-xs transition-colors", filter === item.value ? "border-primary/60 bg-primary/15" : "text-muted-foreground hover:bg-secondary/60")}>
              {item.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs text-muted-foreground sm:ml-auto">{list.length} of 110</span>
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((object) => (
          <li key={object.id} className="panel overflow-hidden p-4">
            <LocalImageGallery objectId={object.id} alt={`${object.designation}${object.name ? ` ${object.name}` : ""}`} />
            <div className="mt-4 flex min-w-0 items-baseline justify-between gap-2">
              <h2 className="min-w-0 font-display text-lg font-semibold">{object.designation}</h2>
              <span className="min-w-0 text-right text-xs text-muted-foreground">{object.type}</span>
            </div>
            {object.name && <p className="text-sm text-primary">{object.name}</p>}
            <p className="mt-2 text-xs text-muted-foreground">{object.constellationName} · mag {object.magnitude}</p>
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <Link to="/messier/$id" params={{ id: object.id }}>View object</Link>
            </Button>
          </li>
        ))}
      </ul>
    </main>
  );
}