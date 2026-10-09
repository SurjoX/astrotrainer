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

  const featureCards = [
    {
      title: "Constellations",
      blurb:
        "Identify the official IAU shapes and compare your recognition against a real J2000 star field.",
      primary: "/constellations",
      primaryLabel: "Browse atlas",
      secondary: "/practice?category=constellations",
      secondaryLabel: "Practice now",
    },
    {
      title: "Asterisms",
      blurb:
        "Train navigational patterns and seasonal groupings that sit outside the formal constellation list.",
      primary: "/asterisms",
      primaryLabel: "Explore patterns",
      secondary: "/asterisms/practice",
      secondaryLabel: "Practice asterisms",
    },
    {
      title: "Messier",
      blurb:
        "Move from star recognition to deep-sky ID with real object metadata and focused practice sessions.",
      primary: "/messier",
      primaryLabel: "Browse catalog",
      secondary: "/messier/practice",
      secondaryLabel: "Practice Messier",
    },
    {
      title: "Sky Map",
      blurb:
        "Pan across the full sky, toggle overlays, and inspect the coordinate system without disrupting the map.",
      primary: "/sky-map",
      primaryLabel: "Open atlas",
      secondary: "/practice",
      secondaryLabel: "Start training",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="label-caps">Astronomy observation training</p>
          <h1 className="mt-4 max-w-xl font-display text-4xl font-bold text-foreground sm:text-5xl lg:text-[4rem] lg:leading-[0.95]">
            Train the night sky with precision.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            AstroTrainer uses live star-field generation, official IAU boundaries, and real J2000
            coordinates to help you learn the sky by pattern and context rather than screenshots.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/practice">Start practice</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/progress">View progress</Link>
            </Button>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="panel p-3">
                <dt className="label-caps">{stat.label}</dt>
                <dd className="mt-2 font-display text-xl font-semibold text-foreground">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="panel overflow-hidden p-2">
          <SkyViewer
            constellation={hero}
            magnitudeLimit={5.4}
            className="h-[320px] sm:h-[420px]"
            emphasizeTarget
          />
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps">Practice</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Choose your learning mode
            </h2>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link to="/practice">Open practice hub</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((item) => (
            <article key={item.title} className="panel flex h-full flex-col p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-secondary/90 text-sm font-semibold text-primary">
                  {item.title.charAt(0)}
                </span>
                <span className="label-caps">Mode</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.blurb}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <Button asChild size="sm" variant="secondary">
                  <Link to={item.primary}>{item.primaryLabel}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={item.secondary}>{item.secondaryLabel}</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="label-caps">Overview</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">Your dashboard</h2>
          </div>
        </div>

        {ready && !hasHistory ? (
          <div className="panel p-6">
            <p className="font-display text-xl font-semibold text-foreground">
              No observations logged yet
            </p>
            <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
              Start with the beginner session and build from the standard constellation figure to
              more advanced star and deep-sky identification.
            </p>
            <Button asChild className="mt-5" variant="secondary">
              <Link to="/practice">Begin your first session</Link>
            </Button>
          </div>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="panel p-4">
                <dt className="label-caps">{s.label}</dt>
                <dd className="mt-2 font-display text-2xl font-semibold text-foreground">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </main>
  );
}
