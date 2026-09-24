import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ConstellationFacts } from "@/components/app/ConstellationFacts";
import { SkyViewer } from "@/components/sky/SkyViewer";
import { Button } from "@/components/ui/button";
import { getConstellation } from "@/lib/astro/catalog";

export const Route = createFileRoute("/constellations/$id")({
  loader: ({ params }) => {
    const constellation = getConstellation(params.id);
    if (!constellation) throw notFound();
    return { constellation };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Constellation not found — AstroTrainer" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const c = loaderData.constellation;
    const title = `${c.name} (${c.abbreviation}) — ${c.figure} | AstroTrainer`;
    const description = `${c.description} Best observed on ${c.bestSeason.toLowerCase()} evenings.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ConstellationDetail,
});

function ConstellationDetail() {
  const { constellation } = Route.useLoaderData();

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1.55fr_1fr]">
      <div className="panel overflow-hidden">
        <SkyViewer
          constellation={constellation}
          magnitudeLimit={6}
          defaultLines
          defaultLabels
          defaultBoundary
          defaultGrid
          emphasizeTarget
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
          <Link to="/constellations">
            <ArrowLeft className="size-4" /> Atlas
          </Link>
        </Button>
        <ConstellationFacts constellation={constellation} />
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to="/practice">Practice identification</Link>
          </Button>
        </div>
      </aside>
    </main>
  );
}
