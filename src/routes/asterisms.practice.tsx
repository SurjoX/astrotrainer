import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { SkyViewer } from "@/components/sky/SkyViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  asterismAsFigure,
  asterismLabelStars,
  asterisms,
  type Asterism,
  type AsterismDifficulty,
} from "@/lib/astro/asterisms";
import { fitConstellation } from "@/lib/astro/fov";
import type { ViewState } from "@/lib/astro/projection";
import {
  asterismAccuracy,
  asterismScoreFor,
  recordAsterismAnswer,
  recordAsterismSession,
} from "@/lib/asterismProgress";
import { useAsterismProgress } from "@/hooks/useAsterismProgress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/asterisms/practice")({
  head: () => ({
    meta: [
      { title: "Practice — Asterism Identification | AstroTrainer" },
      {
        name: "description",
        content:
          "Identify the Big Dipper, Summer Triangle, Winter Hexagon and more on real star fields at beginner, intermediate and advanced difficulty.",
      },
      { property: "og:title", content: "Practice — Asterism Identification | AstroTrainer" },
      {
        property: "og:description",
        content: "Asterism recognition drills on dynamically rendered J2000 star maps.",
      },
    ],
  }),
  component: AsterismPractice,
});

const DIFFICULTIES: { id: AsterismDifficulty; label: string; blurb: string }[] = [
  { id: "beginner", label: "Beginner", blurb: "Pattern lines, star labels and boundaries, four choices" },
  { id: "intermediate", label: "Intermediate", blurb: "Parent constellation boundary only, no lines or labels" },
  { id: "advanced", label: "Advanced", blurb: "Type the asterism name on a bare, rotated star field" },
];

const QUESTIONS_PER_SESSION = 10;

interface AsterismQuestion {
  id: string;
  target: Asterism;
  difficulty: AsterismDifficulty;
  choices: Asterism[];
  view: ViewState;
  magnitudeLimit: number;
}

interface Answered {
  question: AsterismQuestion;
  chosen: string | null;
  typed: string;
  correct: boolean;
  elapsedMs: number;
  points: number;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildQuestion(difficulty: AsterismDifficulty): AsterismQuestion {
  const target = pick(asterisms);
  const figure = asterismAsFigure(target);
  const base = fitConstellation(figure);

  // distractors: same category first, then anything else
  const sameCategory = asterisms.filter(
    (a) => a.id !== target.id && a.categories.some((c) => target.categories.includes(c)),
  );
  const rest = asterisms.filter((a) => a.id !== target.id && !sameCategory.includes(a));
  const pool = [...shuffle(sameCategory), ...shuffle(rest)];
  const choices = shuffle([target, ...pool.slice(0, 3)]);

  const rotation = difficulty === "beginner" ? 0 : (Math.random() - 0.5) * (difficulty === "advanced" ? 90 : 40);

  return {
    id: `${target.id}-${Date.now()}`,
    target,
    difficulty,
    choices,
    view: { ...base, rotation, fov: base.fov * (difficulty === "advanced" ? 1.25 : 1) },
    magnitudeLimit: difficulty === "beginner" ? 5.3 : difficulty === "intermediate" ? 6 : 6.5,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function AsterismPractice() {
  const { progress } = useAsterismProgress();
  const [difficulty, setDifficulty] = useState<AsterismDifficulty>("beginner");
  const [question, setQuestion] = useState<AsterismQuestion | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [history, setHistory] = useState<Answered[]>([]);
  const [finished, setFinished] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [startedAt, setStartedAt] = useState(0);

  const nextQuestion = useCallback(() => {
    setAnswered(null);
    setTextInput("");
    setStartedAt(Date.now());
    setQuestion(buildQuestion(difficulty));
  }, [difficulty]);

  const submit = useCallback(
    (choiceId: string | null, typed?: string) => {
      if (!question || answered) return;
      const elapsedMs = Date.now() - startedAt;
      let correct: boolean;
      if (typed !== undefined) {
        const t = normalize(typed);
        correct =
          t.length > 0 &&
          (t === normalize(question.target.name) ||
            question.target.aliases.some((al) => normalize(al) === t));
      } else {
        correct = choiceId === question.target.id;
      }
      const points = asterismScoreFor(correct, elapsedMs);
      recordAsterismAnswer({
        asterismId: question.target.id,
        correct,
        elapsedMs,
        difficulty: question.difficulty,
      });
      const record: Answered = {
        question,
        chosen: choiceId,
        typed: typed ?? "",
        correct,
        elapsedMs,
        points,
      };
      setAnswered(record);
      setHistory((h) => [...h, record]);
    },
    [answered, question, startedAt],
  );

  const advance = () => {
    if (history.length >= QUESTIONS_PER_SESSION) {
      recordAsterismSession(history.reduce((s, h) => s + h.points, 0));
      setFinished(true);
      setQuestion(null);
      return;
    }
    nextQuestion();
  };

  const sessionStats = useMemo(
    () => ({
      correct: history.filter((h) => h.correct).length,
      score: history.reduce((s, h) => s + h.points, 0),
      avg: history.length
        ? history.reduce((s, h) => s + h.elapsedMs, 0) / history.length / 1000
        : 0,
    }),
    [history],
  );

  if (finished) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Session complete</h1>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["Score", String(sessionStats.score)],
            ["Accuracy", `${asterismAccuracy(sessionStats.correct, history.length)}%`],
            ["Correct", String(sessionStats.correct)],
            ["Incorrect", String(history.length - sessionStats.correct)],
            ["Avg response", `${sessionStats.avg.toFixed(1)}s`],
            ["Questions", String(history.length)],
          ].map(([label, value]) => (
            <div key={label} className="panel p-4">
              <dt className="label-caps">{label}</dt>
              <dd className="mt-1 font-display text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setHistory([]);
              setFinished(false);
              setAnswered(null);
              setQuestion(null);
            }}
          >
            Practice again
          </Button>
          <Button asChild variant="secondary">
            <Link to="/progress">View progress</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 gap-1.5 text-muted-foreground">
          <Link to="/asterisms">
            <ArrowLeft className="size-4" /> Asterisms
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-bold">Asterism practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ten patterns per session, drawn from the {asterisms.length}-asterism catalog. Progress is
          tracked separately from constellation practice.
        </p>

        <section className="mt-8">
          <h2 className="label-caps">Difficulty</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={cn(
                  "panel p-4 text-left transition-colors",
                  difficulty === d.id ? "border-primary/60 bg-primary/10" : "hover:bg-secondary/50",
                )}
              >
                <span className="font-display text-base font-semibold">{d.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{d.blurb}</span>
              </button>
            ))}
          </div>
        </section>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Attempts", String(progress.totalQuestions)],
            ["Accuracy", `${asterismAccuracy(progress.correct, progress.totalQuestions)}%`],
            ["Streak", String(progress.currentStreak)],
            ["Best streak", String(progress.bestStreak)],
          ].map(([label, value]) => (
            <div key={label} className="panel p-3">
              <dt className="label-caps">{label}</dt>
              <dd className="mt-1 font-display text-xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={nextQuestion}>
          Start session
        </Button>
      </main>
    );
  }

  const target = question.target;
  const figure = asterismAsFigure(target);
  const revealed = !!answered;
  const isAdvanced = question.difficulty === "advanced";

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1.55fr_1fr]">
      <div className="panel relative overflow-hidden">
        <SkyViewer
          key={question.id + (revealed ? "-r" : "")}
          constellation={figure}
          view={question.view}
          magnitudeLimit={question.magnitudeLimit}
          defaultLines={revealed ? true : question.difficulty === "beginner"}
          defaultLabels={revealed}
          defaultBoundary={revealed ? true : question.difficulty !== "advanced"}
          defaultGrid={revealed || question.difficulty === "beginner"}
          boundaryIds={
            revealed || question.difficulty !== "advanced" ? target.constellations : undefined
          }
          labelStars={revealed ? asterismLabelStars(target) : undefined}
          lockToggles={!revealed}
          emphasizeTarget={revealed}
          className="h-[46vh] min-h-[300px] lg:h-[calc(100vh-8rem)]"
        />
        <div className="pointer-events-none absolute left-3 top-3">
          <span className="rounded bg-background/70 px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground backdrop-blur">
            {question.difficulty} · {history.length + (revealed ? 0 : 1)}/{QUESTIONS_PER_SESSION}
          </span>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        {!revealed ? (
          <div className="panel p-4">
            <h1 className="font-display text-lg font-semibold">
              {isAdvanced ? "Name this asterism" : "Which asterism is shown?"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAdvanced
                ? "Type the asterism name and press Check Answer. Capitalisation and spacing are ignored."
                : "Drag to pan, scroll or pinch to zoom. The field is centred on the pattern."}
            </p>
            {isAdvanced ? (
              <div className="mt-4 flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit(null, textInput);
                  }}
                  placeholder="e.g., Big Dipper"
                  className="flex-1"
                  autoFocus
                />
                <Button onClick={() => submit(null, textInput)}>Check</Button>
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {question.choices.map((c) => (
                  <Button
                    key={c.id}
                    variant="secondary"
                    size="lg"
                    className="justify-start"
                    onClick={() => submit(c.id)}
                  >
                    {c.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="panel p-4">
            <div
              className={cn(
                "flex items-center gap-2 text-sm font-semibold",
                answered.correct ? "text-success" : "text-destructive",
              )}
            >
              {answered.correct ? <Check className="size-4" /> : <X className="size-4" />}
              {answered.correct
                ? `Correct · +${answered.points} pts`
                : isAdvanced
                  ? `Incorrect — you entered "${answered.typed}"`
                  : `Incorrect — you chose ${
                      question.choices.find((c) => c.id === answered.chosen)?.name ?? "nothing"
                    }`}
            </div>
            {!answered.correct && (
              <p className="mt-1 text-xs text-muted-foreground">Correct answer: {target.name}</p>
            )}
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {(answered.elapsedMs / 1000).toFixed(1)}s
            </p>

            <div className="mt-4 border-t border-border/70 pt-4">
              <h2 className="font-display text-xl font-semibold">{target.name}</h2>
              {target.aliases.length > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">{target.aliases.join(" · ")}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{target.description}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Type", target.type],
                  ["Category", target.categories.join(", ")],
                  ["Constellations", target.constellationNames.join(", ")],
                  ["Recognition", target.recognition],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="label-caps">{label}</dt>
                    <dd className="mt-0.5">{value}</dd>
                  </div>
                ))}
              </dl>
              {target.observationNotes && (
                <p className="mt-3 text-xs text-muted-foreground">{target.observationNotes}</p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link to="/asterisms/$id" params={{ id: target.id }}>
                  Study asterism
                </Link>
              </Button>
              <Button onClick={advance}>
                {history.length >= QUESTIONS_PER_SESSION ? "See results" : "Next question"}
              </Button>
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
