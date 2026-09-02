import { createFileRoute, Link } from "@tanstack/react-router";
import { useProgress } from "@/hooks/useProgress";
import { useAsterismProgress } from "@/hooks/useAsterismProgress";
import { Button } from "@/components/ui/button";
import { getConstellation } from "@/lib/astro/catalog";
import { getAsterism } from "@/lib/astro/asterisms";
import { accuracy, ranked, resetProgress, weakConstellations } from "@/lib/progress";
import { asterismAccuracy, rankedAsterisms } from "@/lib/asterismProgress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress & Mastery — AstroTrainer" },
      {
        name: "description",
        content:
          "Track accuracy, response time and per-constellation mastery, and drill the constellations you keep missing.",
      },
      { property: "og:title", content: "Progress & Mastery — AstroTrainer" },
      {
        property: "og:description",
        content: "Per-constellation mastery bars, accuracy and weak-area practice.",
      },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { progress, ready } = useProgress();
  const rows = ranked(progress);
  const weak = weakConstellations(progress, 5);
  const hasHistory = progress.totalQuestions > 0;

  if (ready && !hasHistory) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-3xl font-bold">No progress yet</h1>
        <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
          Answer a few questions and this page will fill with accuracy, response times and a
          mastery bar for every constellation you have seen.
        </p>
        <Button asChild className="mt-6">
          <Link to="/practice">Start practising</Link>
        </Button>
        <div className="mt-10 text-left">
          <AsterismProgressSection />
        </div>
      </main>
    );
  }

  const avg = progress.totalQuestions
    ? progress.totalTimeMs / progress.totalQuestions / 1000
    : 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Progress</h1>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Questions", String(progress.totalQuestions)],
          ["Accuracy", `${accuracy(progress.correct, progress.totalQuestions)}%`],
          ["Correct", String(progress.correct)],
          ["Incorrect", String(progress.incorrect)],
          ["Avg time", `${avg.toFixed(1)}s`],
          ["Best session", String(progress.bestSessionScore)],
        ].map(([label, value]) => (
          <div key={label} className="panel p-3">
            <dt className="label-caps">{label}</dt>
            <dd className="mt-1 font-display text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {weak.length > 0 && (
        <section className="panel mt-6 p-4">
          <h2 className="label-caps">Your weakest constellations</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {weak.map((w) => (
              <li key={w.id} className="flex justify-between gap-3">
                <span>{getConstellation(w.id)?.name ?? w.id}</span>
                <span className="font-mono text-muted-foreground">{w.accuracy}%</span>
              </li>
            ))}
          </ul>
          <Button asChild size="sm" className="mt-4">
            <Link to="/practice">Practice These</Link>
          </Button>
        </section>
      )}

      <section className="mt-6">
        <h2 className="label-caps">Mastery</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Mastery combines accuracy with repetition — at least five correct attempts are needed
          to reach 100%.
        </p>
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="panel flex items-center gap-3 p-3">
              <Link
                to="/constellations/$id"
                params={{ id: r.id }}
                className="w-40 shrink-0 truncate text-sm hover:text-primary"
              >
                {getConstellation(r.id)?.name ?? r.id}
              </Link>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    r.mastery >= 80 ? "bg-success" : r.mastery >= 50 ? "bg-primary" : "bg-accent",
                  )}
                  style={{ width: `${r.mastery}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right font-mono text-xs text-muted-foreground">
                {r.mastery}% · {r.stat.attempts}×
              </span>
            </li>
          ))}
        </ul>
      </section>

      <AsterismProgressSection />

      <Button
        variant="ghost"
        size="sm"
        className="mt-8 text-muted-foreground"
        onClick={() => {
          if (window.confirm("Reset all locally stored progress?")) resetProgress();
        }}
      >
        Reset progress
      </Button>
    </main>
  );
}
/** Asterism statistics, stored and displayed separately from constellations. */
function AsterismProgressSection() {
  const { progress, ready } = useAsterismProgress();
  const rows = rankedAsterisms(progress).slice(0, 10);
  const has = progress.totalQuestions > 0;

  return (
    <section className="mt-10">
      <h2 className="label-caps">Asterisms</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Star patterns that are not official IAU constellations. Tracked separately from
        constellation mastery.
      </p>

      {ready && !has ? (
        <div className="panel mt-3 p-4">
          <p className="text-sm text-muted-foreground">
            No asterism attempts yet — try the Big Dipper or the Summer Triangle.
          </p>
          <Button asChild size="sm" className="mt-3" variant="secondary">
            <Link to="/asterisms/practice">Practice asterisms</Link>
          </Button>
        </div>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Attempts", String(progress.totalQuestions)],
              ["Correct", String(progress.correct)],
              ["Accuracy", `${asterismAccuracy(progress.correct, progress.totalQuestions)}%`],
              ["Streak", String(progress.currentStreak)],
              ["Best streak", String(progress.bestStreak)],
              ["Best session", String(progress.bestSessionScore)],
            ].map(([label, value]) => (
              <div key={label} className="panel p-3">
                <dt className="label-caps">{label}</dt>
                <dd className="mt-1 font-display text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(["beginner", "intermediate", "advanced"] as const).map((d) => {
              const s = progress.byDifficulty[d];
              return (
                <div key={d} className="panel p-3">
                  <p className="label-caps capitalize">{d}</p>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {s.correct}/{s.attempts} · {asterismAccuracy(s.correct, s.attempts)}%
                  </p>
                </div>
              );
            })}
          </div>

          {rows.length > 0 && (
            <ul className="mt-4 space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="panel flex items-center gap-3 p-3">
                  <Link
                    to="/asterisms/$id"
                    params={{ id: r.id }}
                    className="w-40 shrink-0 truncate text-sm hover:text-primary"
                  >
                    {getAsterism(r.id)?.name ?? r.id}
                  </Link>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        r.mastery >= 80
                          ? "bg-success"
                          : r.mastery >= 50
                            ? "bg-primary"
                            : "bg-accent",
                      )}
                      style={{ width: `${r.mastery}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right font-mono text-xs text-muted-foreground">
                    {r.mastery}% · {r.stat.attempts}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
