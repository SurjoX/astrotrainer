import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { LocalImageGallery } from "@/components/app/LocalImageGallery";
import { SkyViewer } from "@/components/sky/SkyViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getConstellation } from "@/lib/astro/catalog";
import { angularSeparation } from "@/lib/astro/catalog";
import {
  getMessier,
  matchesMessierAnswer,
  messierObjects,
  randomMessier,
  type MessierObject,
} from "@/lib/astro/messier";
import { messierAccuracy, recordMessierAnswer } from "@/lib/messierProgress";
import { useMessierProgress } from "@/hooks/useMessierProgress";
import type { Difficulty } from "@/lib/astro/types";
import type { ViewState } from "@/lib/astro/projection";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messier/practice")({
  validateSearch: (search: Record<string, unknown>): { target?: string } => {
    const target = search["target"];
    return typeof target === "string" ? { target } : {};
  },
  head: () => ({ meta: [{ title: "Messier Practice — AstroTrainer" }] }),
  component: MessierPractice,
});

const locationToleranceDeg = 5;
const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "beginner", label: "Beginner", blurb: "Identify the object from an image" },
  { id: "intermediate", label: "Intermediate", blurb: "Type its designation, name or alias" },
  { id: "advanced", label: "Advanced", blurb: "Locate the object on a real sky map" },
];

interface Question {
  target: MessierObject;
  choices: MessierObject[];
  view: ViewState;
}

interface Answered {
  correct: boolean;
  elapsedMs: number;
  selected: { ra: number; dec: number } | null;
  separation: number | null;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [result[index], result[next]] = [result[next]!, result[index]!];
  }
  return result;
}

function offsetSkyPosition(ra: number, dec: number, distanceDeg: number, bearingDeg: number) {
  const distance = (distanceDeg * Math.PI) / 180;
  const bearing = (bearingDeg * Math.PI) / 180;
  const latitude = (dec * Math.PI) / 180;
  const longitude = (ra * Math.PI) / 180;
  const nextLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(distance) +
      Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing),
  );
  const nextLongitude =
    longitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude),
      Math.cos(distance) - Math.sin(latitude) * Math.sin(nextLatitude),
    );

  return {
    ra: ((((nextLongitude * 180) / Math.PI) % 360) + 360) % 360,
    dec: (nextLatitude * 180) / Math.PI,
  };
}

function buildQuestion(previousId?: string, forcedId?: string): Question {
  const target = (forcedId ? getMessier(forcedId) : undefined) ?? randomMessier(previousId);
  const distractors = shuffle(messierObjects.filter((object) => object.id !== target.id)).slice(
    0,
    3,
  );
  // Offset the view center on the celestial sphere while keeping the real target
  // comfortably inside the 32-degree field and away from the exact center.
  const viewCenter = offsetSkyPosition(
    target.ra,
    target.dec,
    6 + Math.random() * 2,
    Math.random() * 360,
  );
  return {
    target,
    choices: shuffle([target, ...distractors]),
    view: { ...viewCenter, fov: 32, rotation: (Math.random() - 0.5) * 50 },
  };
}

function MessierPractice() {
  const { progress } = useMessierProgress();
  const { target: requestedTarget } = Route.useSearch();
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [question, setQuestion] = useState<Question | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [skySelection, setSkySelection] = useState<{ ra: number; dec: number } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [lastId, setLastId] = useState<string | undefined>();

  const nextQuestion = useCallback(
    (forcedId?: string) => {
      const next = buildQuestion(lastId, forcedId);
      setQuestion(next);
      setLastId(next.target.id);
      setAnswered(null);
      setSelected(null);
      setSkySelection(null);
      setInput("");
      setStartedAt(Date.now());
    },
    [lastId],
  );

  const submit = useCallback(
    (choice?: string) => {
      if (!question || answered) return;
      const elapsedMs = Date.now() - startedAt;
      const selectedObject = choice ? getMessier(choice) : undefined;
      const separation = skySelection
        ? angularSeparation(
            skySelection.ra,
            skySelection.dec,
            question.target.ra,
            question.target.dec,
          )
        : null;
      const correct =
        difficulty === "beginner"
          ? selectedObject?.id === question.target.id
          : difficulty === "intermediate"
            ? matchesMessierAnswer(question.target, input)
            : separation !== null && separation <= locationToleranceDeg;
      recordMessierAnswer({ objectId: question.target.id, correct, elapsedMs, difficulty });
      setAnswered({ correct, elapsedMs, selected: skySelection, separation });
      setSessionCount((count) => count + 1);
    },
    [answered, difficulty, input, question, skySelection, startedAt],
  );

  const targetConstellation = question
    ? (getConstellation(question.target.constellationId) ?? null)
    : null;
  const visibleMarkers =
    difficulty === "advanced"
      ? [
          ...(skySelection ? [{ ...skySelection, color: "#f7c66a", label: "Your selection" }] : []),
          ...(answered && question
            ? [
                {
                  ra: question.target.ra,
                  dec: question.target.dec,
                  color: "#7ac4ff",
                  label: question.target.designation,
                },
              ]
            : []),
        ]
      : [];
  const sessionAccuracy = useMemo(
    () =>
      progress.totalQuestions ? messierAccuracy(progress.correct, progress.totalQuestions) : 0,
    [progress],
  );

  if (!question) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-3 gap-1.5 text-muted-foreground"
        >
          <Link to="/messier">
            <ArrowLeft className="size-4" /> Messier catalog
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-bold">Messier practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Train M1–M110 recognition with a separate local progress record.
        </p>
        <section className="mt-8">
          <h2 className="label-caps">Difficulty</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {DIFFICULTIES.map((item) => (
              <button
                key={item.id}
                onClick={() => setDifficulty(item.id)}
                className={cn(
                  "panel p-4 text-left transition-colors",
                  difficulty === item.id
                    ? "border-primary/60 bg-primary/10"
                    : "hover:bg-secondary/50",
                )}
              >
                <span className="font-display text-base font-semibold">{item.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{item.blurb}</span>
              </button>
            ))}
          </div>
        </section>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Attempts", String(progress.totalQuestions)],
            ["Accuracy", `${sessionAccuracy}%`],
            ["Streak", String(progress.currentStreak)],
            ["Best streak", String(progress.bestStreak)],
          ].map(([label, value]) => (
            <div key={label} className="panel p-3">
              <dt className="label-caps">{label}</dt>
              <dd className="mt-1 font-display text-xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <Button size="lg" className="mt-6" onClick={() => nextQuestion(requestedTarget)}>
          Start practice
        </Button>
      </main>
    );
  }

  const submitLabel = difficulty === "advanced" ? "Submit location" : "Check answer";
  return (
    <main className="mx-auto grid min-w-0 max-w-7xl gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="panel min-w-0 overflow-hidden">
        {difficulty === "advanced" ? (
          <div className="relative h-[52vh] min-h-[360px] lg:h-[calc(100vh-8rem)]">
            <SkyViewer
              view={question.view}
              constellation={targetConstellation}
              defaultLines={false}
              defaultLabels={false}
              defaultBoundary={false}
              defaultGrid
              className="h-full"
              onSkyClick={(position) => {
                if (!answered) setSkySelection(position);
              }}
              markers={visibleMarkers}
            />
            {!answered && skySelection && (
              <div className="absolute left-3 top-3 rounded-md border border-primary/50 bg-background/85 px-3 py-2 text-xs backdrop-blur">
                Location selected. Submit when ready.
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <LocalImageGallery objectId={question.target.id} alt="Messier object" />
          </div>
        )}
      </div>
      <aside className="panel min-w-0 p-4">
        <p className="label-caps">{DIFFICULTIES.find((item) => item.id === difficulty)?.label}</p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          {difficulty === "advanced"
            ? `Locate ${question.target.designation} on the sky`
            : "Identify this Messier object"}
        </h1>
        {difficulty === "beginner" && (
          <div className="mt-5 grid gap-2">
            {question.choices.map((choice) => (
              <button
                key={choice.id}
                disabled={!!answered}
                onClick={() => {
                  setSelected(choice.id);
                  submit(choice.id);
                }}
                className={cn(
                  "rounded-md border p-3 text-left text-sm transition-colors",
                  selected === choice.id &&
                    (answered?.correct
                      ? "border-success bg-success/10"
                      : "border-destructive bg-destructive/10"),
                  !answered && "hover:border-primary/60 hover:bg-secondary/50",
                )}
              >
                {choice.designation}
                {choice.name ? ` · ${choice.name}` : ""}
              </button>
            ))}
          </div>
        )}
        {difficulty === "intermediate" && (
          <form
            className="mt-5"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <label htmlFor="messier-answer" className="label-caps">
              Your answer
            </label>
            <Input
              id="messier-answer"
              autoFocus
              value={input}
              disabled={!!answered}
              onChange={(event) => setInput(event.target.value)}
              placeholder="M42 or Orion Nebula"
              className="mt-2"
            />
            <Button type="submit" disabled={!input.trim() || !!answered} className="mt-3">
              {submitLabel}
            </Button>
          </form>
        )}
        {difficulty === "advanced" && (
          <Button className="mt-5" disabled={!skySelection || !!answered} onClick={() => submit()}>
            {submitLabel}
          </Button>
        )}
        {answered && (
          <section
            className={cn(
              "mt-6 rounded-md border p-4",
              answered.correct
                ? "border-success/50 bg-success/10"
                : "border-destructive/50 bg-destructive/10",
            )}
          >
            <p className="flex items-center gap-2 font-medium">
              {answered.correct ? <Check className="size-4" /> : <X className="size-4" />}
              {answered.correct ? "Correct" : "Not quite"}
            </p>
            <p className="mt-2 text-sm">
              {question.target.designation}
              {question.target.name ? ` · ${question.target.name}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {question.target.constellationName} · mag {question.target.magnitude} ·{" "}
              {question.target.description}
            </p>
            {answered.separation !== null && (
              <p className="mt-2 text-xs font-mono">
                Angular separation: {answered.separation.toFixed(2)}° (tolerance{" "}
                {locationToleranceDeg}°)
              </p>
            )}
            <Button className="mt-4" onClick={() => nextQuestion()}>
              Next question
            </Button>
          </section>
        )}
        {!answered && difficulty === "advanced" && (
          <p className="mt-4 text-xs text-muted-foreground">
            The target remains hidden until you submit. Click the map to choose a sky position.
          </p>
        )}
        <p className="mt-6 text-xs text-muted-foreground">Answered this session: {sessionCount}</p>
      </aside>
    </main>
  );
}
