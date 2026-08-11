import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { SkyViewer } from "@/components/sky/SkyViewer";
import { ConstellationFacts } from "@/components/app/ConstellationFacts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useProgress } from "@/hooks/useProgress";
import { getConstellation } from "@/lib/astro/catalog";
import { generateQuestion } from "@/lib/astro/questions";
import { QuestionType, type Difficulty, type Question } from "@/lib/astro/types";
import type { ViewState } from "@/lib/astro/projection";
import { accuracy, recordAnswer, recordSession, scoreFor, weakConstellations } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice — Constellation Identification | AstroTrainer" },
      {
        name: "description",
        content:
          "Identify constellations on dynamically generated star maps at beginner, intermediate and advanced difficulty, with a full educational reveal after every answer.",
      },
      { property: "og:title", content: "Practice — Constellation Identification | AstroTrainer" },
      {
        property: "og:description",
        content: "Adaptive constellation recognition drills on real star fields.",
      },
    ],
  }),
  component: PracticePage,
});

const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "beginner", label: "Beginner", blurb: "Stick figure drawn, bright stars only" },
  { id: "intermediate", label: "Intermediate", blurb: "No figure, moderate star field, slight rotation" },
  { id: "advanced", label: "Advanced", blurb: "Faint stars, realistic clutter, strong rotation" },
];

const FUTURE_MODES = [
  "Identify Star",
  "Find Star on Map",
  "Identify Messier Object",
  "Find Messier Object",
  "Coordinate Exercises",
  "Observation Simulation",
];

const QUESTIONS_PER_SESSION = 10;
const TIME_LIMIT_MS = 30000;

interface Answered {
  question: Question;
  chosen: string | null;
  correct: boolean;
  elapsedMs: number;
  points: number;
}

function PracticePage() {
  const { progress } = useProgress();
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [timed, setTimed] = useState(false);
  const [weakMode, setWeakMode] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [history, setHistory] = useState<Answered[]>([]);
  const [finished, setFinished] = useState(false);
  const [remaining, setRemaining] = useState(TIME_LIMIT_MS);
  const startedAt = useRef(0);

  const weak = useMemo(() => weakConstellations(progress, 8), [progress]);

  const pool = useMemo(() => {
    if (!weakMode) return undefined;
    const ids = weak.filter((w) => w.accuracy < 100).map((w) => w.id);
    return ids.length >= 4 ? ids : undefined;
  }, [weakMode, weak]);

  const nextQuestion = useCallback(() => {
    setAnswered(null);
    setRemaining(TIME_LIMIT_MS);
    startedAt.current = Date.now();
    setQuestion(generateQuestion(QuestionType.IDENTIFY_CONSTELLATION, difficulty, pool));
  }, [difficulty, pool]);

  const submit = useCallback(
    (choiceId: string | null) => {
      if (!question || answered) return;
      const elapsedMs = Date.now() - startedAt.current;
      const correct = choiceId === question.correctAnswer;
      const points = scoreFor(correct, elapsedMs);
      recordAnswer({
        constellationId: question.correctAnswer,
        correct,
        elapsedMs,
        difficulty: question.difficulty,
      });
      const record: Answered = { question, chosen: choiceId, correct, elapsedMs, points };
      setAnswered(record);
      setHistory((h) => [...h, record]);
    },
    [answered, question],
  );

  // countdown for timed practice
  useEffect(() => {
    if (!timed || !question || answered) return;
    const t = window.setInterval(() => {
      const left = TIME_LIMIT_MS - (Date.now() - startedAt.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) submit(null);
    }, 200);
    return () => window.clearInterval(t);
  }, [timed, question, answered, submit]);

  const advance = () => {
    if (history.length >= QUESTIONS_PER_SESSION) {
      const total = history.reduce((s, h) => s + h.points, 0);
      recordSession(total);
      setFinished(true);
      setQuestion(null);
      return;
    }
    nextQuestion();
  };

  const restart = () => {
    setHistory([]);
    setFinished(false);
    setAnswered(null);
    setQuestion(null);
  };

  if (finished) {
    return <Results history={history} onRestart={restart} />;
  }

  if (!question) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-bold">Practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ten questions per session. Difficulty changes the challenge before you answer — never
          the explanation afterwards.
        </p>

        <section className="mt-8">
          <h2 className="label-caps">Mode</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button className="panel border-primary/60 bg-primary/10 p-4 text-left">
              <span className="font-display text-base font-semibold">Constellation Identification</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Recognise the constellation shown in the field
              </span>
            </button>
            <div className="panel p-4 opacity-55">
              <span className="label-caps">Coming soon</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {FUTURE_MODES.join(" · ")}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6">
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

        <section className="panel mt-6 divide-y divide-border/70">
          <label className="flex items-center justify-between gap-4 p-4">
            <span>
              <span className="text-sm font-medium">Timed practice</span>
              <span className="block text-xs text-muted-foreground">
                30 seconds per question; running out counts as incorrect and reveals the answer.
              </span>
            </span>
            <Switch checked={timed} onCheckedChange={setTimed} />
          </label>
          <label className="flex items-center justify-between gap-4 p-4">
            <span>
              <span className="text-sm font-medium">Practice weak constellations</span>
              <span className="block text-xs text-muted-foreground">
                {weak.length >= 4
                  ? weak
                      .slice(0, 3)
                      .map((w) => `${getConstellation(w.id)?.name ?? w.id} — ${w.accuracy}%`)
                      .join(" · ")
                  : "Not enough history yet — sessions stay random until you have practised more."}
              </span>
            </span>
            <Switch checked={weakMode} onCheckedChange={setWeakMode} disabled={weak.length < 4} />
          </label>
        </section>

        <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={nextQuestion}>
          Start session
        </Button>
      </main>
    );
  }

  const target = getConstellation(question.correctAnswer)!;
  const view: ViewState = {
    ra: question.skyState.centerRa,
    dec: question.skyState.centerDec,
    fov: question.skyState.fovDeg,
    rotation: question.skyState.rotation,
  };
  const revealed = !!answered;

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1.55fr_1fr]">
      <div className="panel relative overflow-hidden">
        <SkyViewer
          key={question.id}
          constellation={target}
          view={view}
          magnitudeLimit={question.skyState.magnitudeLimit}
          defaultLines={revealed ? true : question.skyState.showLines}
          defaultLabels={revealed}
          labelModeWhenOn="important"
          lockToggles={!revealed}
          emphasizeTarget={revealed}
          className="h-[46vh] min-h-[300px] lg:h-[calc(100vh-8rem)]"
        />
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded bg-background/70 px-2 py-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground backdrop-blur">
            {question.difficulty} · {history.length + (revealed ? 0 : 1)}/{QUESTIONS_PER_SESSION}
          </span>
          {timed && !revealed && (
            <span
              className={cn(
                "flex items-center gap-1 rounded bg-background/70 px-2 py-1 font-mono text-[11px] backdrop-blur",
                remaining < 8000 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <Clock className="size-3" />
              {(remaining / 1000).toFixed(0)}s
            </span>
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        {!revealed ? (
          <div className="panel p-4">
            <h1 className="font-display text-lg font-semibold">Which constellation is shown?</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag to pan, scroll or pinch to zoom. The field is centred on the target.
            </p>
            <div className="mt-4 grid gap-2">
              {question.choices.map((c) => (
                <Button
                  key={c.id}
                  variant="secondary"
                  size="lg"
                  className="justify-start"
                  onClick={() => submit(c.id)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
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
                : answered.chosen
                  ? `Incorrect — you chose ${
                      question.choices.find((c) => c.id === answered.chosen)?.label
                    }`
                  : "Time expired"}
            </div>
            {!answered.correct && (
              <p className="mt-1 text-xs text-muted-foreground">Correct answer: {target.name}</p>
            )}
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {(answered.elapsedMs / 1000).toFixed(1)}s
            </p>

            <div className="mt-4 border-t border-border/70 pt-4">
              <ConstellationFacts constellation={target} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link to="/constellations/$id" params={{ id: target.id }}>
                  Study Constellation
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

function Results({ history, onRestart }: { history: Answered[]; onRestart: () => void }) {
  const correct = history.filter((h) => h.correct).length;
  const score = history.reduce((s, h) => s + h.points, 0);
  const avg = history.reduce((s, h) => s + h.elapsedMs, 0) / Math.max(1, history.length) / 1000;

  const perConstellation = new Map<string, { c: number; n: number }>();
  for (const h of history) {
    const rec = perConstellation.get(h.question.correctAnswer) ?? { c: 0, n: 0 };
    rec.n += 1;
    rec.c += h.correct ? 1 : 0;
    perConstellation.set(h.question.correctAnswer, rec);
  }
  const rankedList = [...perConstellation.entries()].sort(
    (a, b) => b[1].c / b[1].n - a[1].c / a[1].n,
  );
  const strongest = rankedList[0];
  const weakest = rankedList[rankedList.length - 1];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Session complete</h1>
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Score", String(score)],
          ["Accuracy", `${accuracy(correct, history.length)}%`],
          ["Correct", String(correct)],
          ["Incorrect", String(history.length - correct)],
          ["Avg response", `${avg.toFixed(1)}s`],
          ["Questions", String(history.length)],
        ].map(([label, value]) => (
          <div key={label} className="panel p-4">
            <dt className="label-caps">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {strongest && weakest && strongest[0] !== weakest[0] && (
        <div className="panel mt-4 grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <p className="label-caps">Strongest</p>
            <p className="mt-1 text-sm">{getConstellation(strongest[0])?.name}</p>
          </div>
          <div>
            <p className="label-caps">Weakest</p>
            <p className="mt-1 text-sm">{getConstellation(weakest[0])?.name}</p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={onRestart}>Practice again</Button>
        <Button asChild variant="secondary">
          <Link to="/progress">View progress</Link>
        </Button>
      </div>
    </main>
  );
}