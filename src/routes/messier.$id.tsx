import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LocalImageGallery } from "@/components/app/LocalImageGallery";
import { SkyViewer } from "@/components/sky/SkyViewer";
import { Button } from "@/components/ui/button";
import { getMessier } from "@/lib/astro/messier";
import { getConstellation } from "@/lib/astro/catalog";

export const Route = createFileRoute("/messier/$id")({
  loader: ({ params }) => {
    const object = getMessier(params.id);
    if (!object) throw notFound();
    return { object };
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.object.designation} — AstroTrainer` : "Messier object — AstroTrainer" }] }),
  component: MessierDetail,
});

function MessierDetail() {
  const { object } = Route.useLoaderData();
  const constellation = getConstellation(object.constellationId) ?? null;
  return (
    <main className="mx-auto grid min-w-0 max-w-7xl gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="min-w-0 space-y-4">
        <section className="panel overflow-hidden p-4">
          <LocalImageGallery objectId={object.id} alt={`${object.designation}${object.name ? ` ${object.name}` : ""}`} />
        </section>
        <section className="panel overflow-hidden">
          <SkyViewer
            view={{ ra: object.ra, dec: object.dec, fov: 24, rotation: 0 }}
            constellation={constellation}
            defaultLines={false}
            defaultLabels={false}
            defaultBoundary={false}
            defaultGrid
            markers={[{ ra: object.ra, dec: object.dec, color: "#f7c66a", label: object.designation }]}
            className="h-[360px] sm:h-[460px]"
          />
        </section>
      </div>
      <aside className="panel min-w-0 p-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 gap-1.5 text-muted-foreground"><Link to="/messier"><ArrowLeft className="size-4" /> Messier catalog</Link></Button>
        <p className="label-caps">{object.type}</p>
        <h1 className="mt-1 font-display text-3xl font-bold">{object.designation}</h1>
        {object.name && <p className="mt-1 text-lg text-primary">{object.name}</p>}
        <p className="mt-4 min-w-0 break-words text-sm leading-relaxed text-muted-foreground">{object.description}</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          {[["Constellation", object.constellationName], ["Magnitude", String(object.magnitude)], ["Angular size", object.angularSize], ["RA", `${Math.floor(object.ra / 15).toString().padStart(2, "0")}h ${(object.ra / 15 % 1 * 60).toFixed(1)}m`], ["Dec", `${object.dec >= 0 ? "+" : ""}${object.dec.toFixed(1)}°`], ["NGC / IC", object.ngc ?? "—"]].map(([label, value]) => <div key={label}><dt className="label-caps">{label}</dt><dd className="mt-1 text-muted-foreground">{value}</dd></div>)}
        </dl>
        {object.aliases.length > 0 && <p className="mt-5 break-words text-sm"><span className="label-caps">Aliases </span><span className="text-muted-foreground">{object.aliases.join(", ")}</span></p>}
        <Button asChild className="mt-6"><Link to="/messier/practice" search={{ target: object.id }}>Practice This Object</Link></Button>
      </aside>
    </main>
  );
}