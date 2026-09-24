import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SkyViewer } from "@/components/sky/SkyViewer";
import { Button } from "@/components/ui/button";
import { asterismAsFigure, asterismLabelStars, getAsterism } from "@/lib/astro/asterisms";

export const Route = createFileRoute("/asterisms/$id")({
  loader: ({ params }) => {
    const asterism = getAsterism(params.id);
    if (!asterism) throw notFound();
    return { asterism };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Asterism not found — AstroTrainer" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const a = loaderData.asterism;
    const title = `${a.name} — ${a.type} asterism | AstroTrainer`;
    const description = `${a.description} Spans ${a.constellationNames.join(", ")}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  errorComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Could not load this asterism</h1>
      <Button asChild className="mt-4" variant="secondary">
        <Link to="/asterisms">Back to asterisms</Link>
      </Button>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Asterism not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That pattern is not in the catalog yet.</p>
      <Button asChild className="mt-4" variant="secondary">
        <Link to="/asterisms">Browse asterisms</Link>
      </Button>
    </main>
  ),
  component: AsterismDetail,
});

function AsterismDetail() {
  const { asterism } = Route.useLoaderData();
  const figure = asterismAsFigure(asterism);
  const labelStars = asterismLabelStars(asterism);
  const useBoundaries = asterism.constellations.length > 0;

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1.55fr_1fr]">
      <div className="panel overflow-hidden">
        <SkyViewer
          constellation={figure}
          magnitudeLimit={6}
          defaultLines
          defaultLabels
          defaultBoundary={useBoundaries}
          defaultGrid
          emphasizeTarget
          labelStars={labelStars}
          boundaryIds={useBoundaries ? asterism.constellations : undefined}
          className="h-[46vh] min-h-[300px] lg:h-[calc(100vh-8rem)]"
        />
      </div>

      <aside className="panel p-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-3 gap-1.5 text-muted-foreground"
        >
          <Link to="/asterisms">
            <ArrowLeft className="size-4" /> Asterisms
          </Link>
        </Button>

        <h1 className="font-display text-2xl font-bold">{asterism.name}</h1>
        {asterism.aliases.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Also known as {asterism.aliases.join(" · ")}
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{asterism.description}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["Type", asterism.type],
            ["Category", asterism.categories.join(", ")],
            ["Difficulty", asterism.difficulty],
            ["Recognition", asterism.recognition],
            ["Constellations", asterism.constellationNames.join(", ")],
            ["Span", `${asterism.spanDeg.toFixed(1)}°`],
            ...(asterism.bestSeason ? [["Best season", asterism.bestSeason]] : []),
            ["Hemisphere", asterism.hemisphere],
          ].map(([label, value]) => (
            <div key={label} className="panel p-3">
              <dt className="label-caps">{label}</dt>
              <dd className="mt-1 text-sm capitalize">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-5">
          <h2 className="label-caps">Principal stars</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {asterism.stars.map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span>
                  {s.name ??
                    ([s.bayer, s.constellation].filter(Boolean).join(" ") || `HIP ${s.hip}`)}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  mag {s.magnitude.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {asterism.observationNotes && (
          <section className="mt-5">
            <h2 className="label-caps">Observation notes</h2>
            <p className="mt-1 text-sm text-muted-foreground">{asterism.observationNotes}</p>
          </section>
        )}

        {asterism.ambiguity && (
          <section className="mt-5">
            <h2 className="label-caps">Ambiguity</h2>
            <p className="mt-1 text-sm text-muted-foreground">{asterism.ambiguity}</p>
          </section>
        )}

        {asterism.alternateDefinitions && asterism.alternateDefinitions.length > 0 && (
          <section className="mt-5">
            <h2 className="label-caps">Alternate definitions</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {asterism.alternateDefinitions.map((alt) => (
                <li key={alt.source} className="panel p-3">
                  <p className="text-xs font-semibold">{alt.source}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {alt.principalStars.join(" · ")}
                  </p>
                  {alt.note && <p className="mt-1 text-xs text-muted-foreground">{alt.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-5 text-[11px] text-muted-foreground">
          Asterisms are traditional patterns, not official IAU constellations.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to="/asterisms/practice">Practice asterisms</Link>
          </Button>
        </div>
      </aside>
    </main>
  );
}
