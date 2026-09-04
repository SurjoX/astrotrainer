import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { SkyViewer } from "@/components/sky/SkyViewer";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/hooks/useProgress";
import { constellations, getConstellation } from "@/lib/astro/catalog";
import { accuracy, weakConstellations } from "@/lib/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AstroTrainer — Astronomy Observation Training" },
      {
        name: "description",
        content:
          "Learn the night sky on dynamically generated star maps: constellation identification drills, an atlas of all 88 IAU constellations and performance tracking.",
      },
      { property: "og:title", content: "AstroTrainer — Astronomy Observation Training" },
      {
        property: "og:description",
        content:
          "Constellation recognition drills on real star maps, an 88-constellation atlas and adaptive practice.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { progress, ready } = useProgress();
  const hero = useMemo(() => getConstellation("ori") ?? constellations[0]!, []);
  const practiced = Object.keys(progress.byConstellation).length;
  const weakest = weakConstellations(progress, 1)[0];
  const hasHistory = progress.totalQuestions > 0;

  const stats = [
    { label: "Questions", value: hasHistory ? String(progress.totalQuestions) : "—" },
    {
      label: "Accuracy",
      value: hasHistory ? `${accuracy(progress.correct, progress.totalQuestions)}%` : "—",
    },
    { label: "Constellations practiced", value: hasHistory ? `${practiced} / 88` : "—" },
    {
      label: "Weakest",
      value: weakest ? (getConstellation(weakest.id)?.name ?? "—") : "—",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="label-caps">Astronomy Observation Training</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            ASTROTRAINER
          </h1>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every field is rendered live from the Bright Star Catalogue with real J2000
            coordinates and magnitudes, and every stick figure comes from the modern
            Stellarium sky culture. Recognise patterns, not screenshots.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/practice">Start Practice</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/progress">View Progress</Link>
            </Button>
          </div>

        </div>
        <div className="panel overflow-hidden">
          <SkyViewer
            constellation={hero}
            magnitudeLimit={5.4}
            className="h-[300px] sm:h-[420px]"
            emphasizeTarget
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="label-caps">Asterisms</h2>
        <div className="panel mt-3 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg">Patterns beyond the 88</p>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Asterisms are recognisable star patterns that are not official IAU
              constellations — some sit inside one constellation, like the Big Dipper, and
              others span several, like the Summer Triangle. Train them separately from
              constellation identification.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Button asChild variant="secondary">
              <Link to="/asterisms">Browse Asterisms</Link>
            </Button>
            <Button asChild>
              <Link to="/asterisms/practice">Practice Asterisms</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-10">

        <h2 className="label-caps">Your dashboard</h2>
        {ready && !hasHistory ? (
          <div className="panel mt-3 p-6">
            <p className="font-display text-lg">No observations logged yet</p>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Start with Beginner mode — the conventional stick figure is drawn over the
              stars while you learn. Progress is stored locally in this browser; no account
              needed.
            </p>
            <Button asChild className="mt-4" variant="secondary">
              <Link to="/practice">Begin your first session</Link>
            </Button>
          </div>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="panel p-4">
                <dt className="label-caps">{s.label}</dt>
                <dd className="mt-1 font-display text-2xl font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </main>
  );
}
