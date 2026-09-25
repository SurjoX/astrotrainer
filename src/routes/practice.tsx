import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { SkyViewer } from "@/components/sky/SkyViewer";
import { ConstellationFacts } from "@/components/app/ConstellationFacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useProgress } from "@/hooks/useProgress";
import { useStarProgress } from "@/hooks/useStarProgress";
import { angularSeparation, getConstellation } from "@/lib/astro/catalog";
import { generateQuestion } from "@/lib/astro/questions";
import {
  buildStarPracticeQuestion,
  getStarConstellation,
  getStarPracticeModeConfig,
  getStarPracticeName,
  shuffleStarPracticePool,
  matchesStarAnswer,
  STAR_LOCATION_TOLERANCE_DEG,
  type StarPracticeNameType,
  type StarPracticeQuestion,
} from "@/lib/astro/starPractice";
import { QuestionType, type Difficulty, type Question } from "@/lib/astro/types";
import type { ViewState } from "@/lib/astro/projection";
import {
  accuracy,
  recordAnswer,
  recordSession,
  scoreFor,
  weakConstellations,
} from "@/lib/progress";
import { recordStarAnswer, starAccuracy } from "@/lib/starProgress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/practice")({
  validateSearch: (search: Record<string, unknown>): { category?: "constellations" | "stars" } => {
    if (search["category"] === "constellations") return { category: "constellations" };
    if (search["category"] === "stars") return { category: "stars" };
    return {};
  },
  head: () => ({
    meta: [
      { title: "Practice — AstroTrainer" },
      {
        name: "description",
        content:
          "Train your recognition skills with constellations and asterisms at beginner, intermediate and advanced difficulty, with a full educational reveal after every answer.",
      },
      { property: "og:title", content: "Practice — AstroTrainer" },
      {
        property: "og:description",
        content: "Adaptive constellation and asterism recognition drills on real star fields.",
      },
    ],
  }),
  component: PracticePage,
});

const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "beginner", label: "Beginner", blurb: "Stick figure, IAU boundary and coordinate grid" },
  {
    id: "intermediate",
    label: "Intermediate",
    blurb: "Boundary and grid only, no figure, slight rotation",
  },
  {
    id: "advanced",
    label: "Advanced",
    blurb: "Type the constellation name, realistic star field with boundary",
  },
];

type PracticeMode = "constellation" | "iau-images";

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

interface StarAnswered {
  question: StarPracticeQuestion;
  input: string;
  selected: { ra: number; dec: number } | null;
  separation: number | null;
  correct: boolean;
  elapsedMs: number;
  points: number;
}

function PracticePage() {
  const { progress } = useProgress();
  const { progress: starProgress } = useStarProgress();
  const navigate = Route.useNavigate();
  const { category } = Route.useSearch();
  const constellationSelected = category === "constellations";
  const starSelected = category === "stars";
  const [mode, setMode] = useState<PracticeMode>("constellation");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [timed, setTimed] = useState(false);
  const [weakMode, setWeakMode] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [history, setHistory] = useState<Answered[]>([]);
  const [finished, setFinished] = useState(false);
  const [remaining, setRemaining] = useState(TIME_LIMIT_MS);
  const [textInput, setTextInput] = useState("");
  const startedAt = useRef(0);

  const [starPracticeType, setStarPracticeType] = useState<StarPracticeNameType>("common");
  const [starPracticeMethod, setStarPracticeMethod] = useState<"identify" | "locate">("identify");
  const [starDifficultyChoice, setStarDifficultyChoice] = useState<"easy" | "hard" | "advanced">(
    "easy",
  );
  const [starDifficulty, setStarDifficulty] = useState<Difficulty>("beginner");
  const [starQuestion, setStarQuestion] = useState<StarPracticeQuestion | null>(null);
  const [starAnswered, setStarAnswered] = useState<StarAnswered | null>(null);
  const [starInput, setStarInput] = useState("");
  const [starSelection, setStarSelection] = useState<{ ra: number; dec: number } | null>(null);
  const [starStartedAt, setStarStartedAt] = useState(0);
  const [starQueue, setStarQueue] = useState<string[]>([]);
  const [starQueueIndex, setStarQueueIndex] = useState(0);
  const [starAttempts, setStarAttempts] = useState(0);
  const [starHintPromptOpen, setStarHintPromptOpen] = useState(false);
  const [starLinesVisible, setStarLinesVisible] = useState(false);

  useEffect(() => {
    if (!starSelected) {
      setStarQuestion(null);
      setStarAnswered(null);
      setStarInput("");
      setStarSelection(null);
      setStarStartedAt(0);
      setStarQueue([]);
      setStarQueueIndex(0);
      setStarAttempts(0);
      setStarHintPromptOpen(false);
      setStarLinesVisible(false);
      return;
    }

    setStarQuestion(null);
    setStarAnswered(null);
    setStarInput("");
    setStarSelection(null);
    setStarStartedAt(0);
    setStarQueue([]);
    setStarQueueIndex(0);
    setStarAttempts(0);
    setStarHintPromptOpen(false);
    setStarLinesVisible(false);
  }, [starSelected]);

  const weak = useMemo(() => weakConstellations(progress, 8), [progress]);

  const pool = useMemo(() => {
    if (!weakMode) return undefined;
    const ids = weak.filter((w) => w.accuracy < 100).map((w) => w.id);
    return ids.length >= 4 ? ids : undefined;
  }, [weakMode, weak]);

  const nextQuestion = useCallback(() => {
    setAnswered(null);
    setTextInput("");
    setRemaining(TIME_LIMIT_MS);
    startedAt.current = Date.now();
    if (mode === "iau-images") {
      setQuestion(
        generateQuestion(QuestionType.IDENTIFY_CONSTELLATION_FROM_IMAGE, difficulty, pool),
      );
    } else {
      setQuestion(generateQuestion(QuestionType.IDENTIFY_CONSTELLATION, difficulty, pool));
    }
  }, [difficulty, pool, mode]);

  const submit = useCallback(
    (choiceId: string | null, userInput?: string) => {
      if (!question || answered) return;
      const elapsedMs = Date.now() - startedAt.current;

      let correct = false;
      let validatedChoiceId = choiceId;

      if (difficulty === "advanced" && userInput !== undefined) {
        const normalized = userInput.trim().toLowerCase();
        const constellationName =
          getConstellation(question.correctAnswer)?.name.toLowerCase() ?? "";
        correct = normalized === constellationName;
        validatedChoiceId = correct ? question.correctAnswer : null;
      } else {
        correct = choiceId === question.correctAnswer;
      }

      const points = scoreFor(correct, elapsedMs);
      recordAnswer({
        constellationId: question.correctAnswer,
        correct,
        elapsedMs,
        difficulty: question.difficulty,
      });
      const record: Answered = { question, chosen: validatedChoiceId, correct, elapsedMs, points };
      setAnswered(record);
      setHistory((h) => [...h, record]);
    },
    [answered, question, difficulty],
  );

  const selectStarDifficulty = useCallback((nextChoice: "easy" | "hard" | "advanced") => {
    setStarDifficultyChoice(nextChoice);
    setStarDifficulty(
      nextChoice === "easy" ? "beginner" : nextChoice === "hard" ? "intermediate" : "advanced",
    );
  }, []);

  const nextStarQuestion = useCallback(() => {
    setStarAttempts(0);
    setStarHintPromptOpen(false);
    setStarLinesVisible(false);

    const nextIndex = starQueueIndex + 1;
    let nextQueue = starQueue;
    let index = nextIndex;
    if (nextQueue.length === 0 || index >= nextQueue.length) {
      nextQueue = shuffleStarPracticePool(starPracticeType, starDifficulty).map((star) => star.id);
      index = 0;
      setStarQueue(nextQueue);
    }
    const next = buildStarPracticeQuestion(nextQueue[index], starDifficulty);
    setStarQuestion(next);
    setStarQueueIndex(index);
    setStarAnswered(null);
    setStarSelection(null);
    setStarInput("");
    setStarStartedAt(Date.now());
  }, [starDifficulty, starPracticeType, starQueue, starQueueIndex]);

  const startStarPractice = useCallback(() => {
    setStarAttempts(0);
    setStarHintPromptOpen(false);
    setStarLinesVisible(false);

    const queue = shuffleStarPracticePool(starPracticeType, starDifficulty).map((star) => star.id);
    setStarQueue(queue);
    setStarQueueIndex(0);
    const first = buildStarPracticeQuestion(queue[0], starDifficulty);
    setStarQuestion(first);
    setStarAnswered(null);
    setStarSelection(null);
    setStarInput("");
    setStarStartedAt(Date.now());
  }, [starDifficulty, starPracticeType]);

  const submitStar = useCallback(() => {
    if (!starQuestion || starAnswered) return;

    const isLocateQuestion = starPracticeMethod === "locate";
    const isThreeAttemptQuestion = starDifficulty !== "advanced";
    const elapsedMs = Date.now() - starStartedAt;
    const separation = starSelection
      ? angularSeparation(
          starSelection.ra,
          starSelection.dec,
          starQuestion.star.ra,
          starQuestion.star.dec,
        )
      : null;

    const attemptNumber = isThreeAttemptQuestion ? Math.min(starAttempts + 1, 3) : 1;
    const correct = isLocateQuestion
      ? separation !== null && separation <= STAR_LOCATION_TOLERANCE_DEG
      : matchesStarAnswer(starQuestion.star, starInput, starPracticeType);

    if (correct || (isThreeAttemptQuestion && attemptNumber >= 3)) {
      const points = Math.max(1, Math.round(100 - Math.min(95, (separation ?? 8.5) * 8)));
      recordStarAnswer({
        starId: starQuestion.star.id,
        correct,
        elapsedMs,
        difficulty: starDifficulty,
        angularErrorDeg: separation,
      });

      setStarAnswered({
        question: starQuestion,
        input: starInput,
        selected: starSelection,
        separation,
        correct,
        elapsedMs,
        points,
      });
      setStarAttempts(attemptNumber);
      setStarHintPromptOpen(false);
      setStarLinesVisible(true);
      return;
    }

    if (isThreeAttemptQuestion) {
      setStarAttempts(attemptNumber);
      if (attemptNumber === 2) {
        setStarHintPromptOpen(true);
      }
    }
  }, [
    starAnswered,
    starAttempts,
    starDifficulty,
    starInput,
    starPracticeMethod,
    starPracticeType,
    starQuestion,
    starSelection,
    starStartedAt,
  ]);

  // countdown for timed practice
  useEffect(() => {
    if (!timed || !question || answered) return;
    const t = window.setInterval(() => {
      const left = TIME_LIMIT_MS - (Date.now() - startedAt.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        if (difficulty === "advanced") {
          submit(null, "");
        } else {
          submit(null);
        }
      }
    }, 200);
    return () => window.clearInterval(t);
  }, [timed, question, answered, submit, difficulty]);

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
    void navigate({ to: "/practice", search: {} });
  };

  if (starSelected) {
    if (!starQuestion) {
      const difficultyOptions =
        starPracticeMethod === "identify"
          ? (["easy", "hard"] as const)
          : (["easy", "hard", "advanced"] as const);

      return (
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 mb-3 gap-1.5 text-muted-foreground"
          >
            <Link to="/practice">Back to practice hub</Link>
          </Button>
          <h1 className="font-display text-3xl font-bold">Star Practice</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Learn the bright stars by name, Bayer designation, and position on the real sky.
          </p>

          <section className="mt-8">
            <h2 className="label-caps">Practice by</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["common", "Common / Proper Name"],
                  ["bayer", "Bayer Designation"],
                ] as [StarPracticeNameType, string][]
              ).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setStarPracticeType(type)}
                  className={cn(
                    "panel p-4 text-left transition-colors",
                    starPracticeType === type
                      ? "border-primary/60 bg-primary/10"
                      : "hover:bg-secondary/50",
                  )}
                >
                  <span className="font-display text-base font-semibold">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {type === "common"
                      ? "Practice by the star's familiar name."
                      : "Practice by the alpha/beta Bayer designation."}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="label-caps">Choose Practice Type</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                ["identify", "Identify Stars"],
                ["locate", "Locate Star on Star Map"],
              ] as const).map(([method, label]) => (
                <button
                  key={method}
                  onClick={() => {
                    setStarPracticeMethod(method);
                    if (method === "identify") {
                      selectStarDifficulty(starDifficultyChoice === "advanced" ? "easy" : starDifficultyChoice);
                    }
                  }}
                  className={cn(
                    "panel p-4 text-left transition-colors",
                    starPracticeMethod === method
                      ? "border-primary/60 bg-primary/10"
                      : "hover:bg-secondary/50",
                  )}
                >
                  <span className="font-display text-base font-semibold">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {method === "identify"
                      ? "Type the star's name from the highlighted sky." 
                      : "Find the target star on the wide sky map."}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="label-caps">{starPracticeMethod === "identify" ? "Difficulty" : "Difficulty"}</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {difficultyOptions.map((choice) => (
                <button
                  key={choice}
                  onClick={() => selectStarDifficulty(choice)}
                  className={cn(
                    "panel p-4 text-left transition-colors",
                    starDifficultyChoice === choice
                      ? "border-primary/60 bg-primary/10"
                      : "hover:bg-secondary/50",
                  )}
                >
                  <span className="font-display text-base font-semibold">
                    {choice === "advanced" ? "Advanced" : choice.charAt(0).toUpperCase() + choice.slice(1)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {choice === "easy"
                      ? "Focus on the authoritative easy-star pool."
                      : choice === "hard"
                        ? "Use the remaining catalog stars in the session pool."
                        : "Pan and zoom to locate the hidden target with the full catalog."}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Attempts", String(starProgress.totalQuestions)],
              ["Accuracy", `${starAccuracy(starProgress.correct, starProgress.totalQuestions)}%`],
              ["Correct", String(starProgress.correct)],
              ["Streak", String(starProgress.currentStreak)],
            ].map(([label, value]) => (
              <div key={label} className="panel p-3">
                <dt className="label-caps">{label}</dt>
                <dd className="mt-1 font-display text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <Button size="lg" className="mt-6" onClick={startStarPractice}>
            Start practice
          </Button>
        </main>
      );
    }

    const reveal = !!starAnswered;
    const targetConstellation = getStarConstellation(starQuestion.star) ?? null;
    const modeConfig = getStarPracticeModeConfig(starDifficulty);
    const modePrompt = getStarPracticeName(starQuestion.star, starPracticeType);
    const isLocateMode = starPracticeMethod === "locate";
    const isAdvancedLocate = starDifficulty === "advanced";
    const markerList = isLocateMode
      ? [
          ...(starSelection && !reveal
            ? [
                {
                  ra: starSelection.ra,
                  dec: starSelection.dec,
                  color: "#f7c66a",
                  label: "Your selection",
                },
              ]
            : []),
          ...(reveal
            ? [
                {
                  ra: starQuestion.star.ra,
                  dec: starQuestion.star.dec,
                  color: "#7ac4ff",
                  label: modePrompt,
                },
              ]
            : []),
        ]
      : [
          {
            ra: starQuestion.star.ra,
            dec: starQuestion.star.dec,
            color: "#7ac4ff",
            ...(reveal ? { label: modePrompt } : {}),
          },
        ];

    return (
      <main className="mx-auto grid min-w-0 max-w-7xl gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="panel min-w-0 overflow-hidden">
          <div className="relative h-[52vh] min-h-[360px] lg:h-[calc(100vh-8rem)]">
            <SkyViewer
              key={starQuestion.id}
              constellation={targetConstellation}
              view={starQuestion.view}
              magnitudeLimit={starDifficulty === "beginner" ? 5.8 : 6.4}
              defaultLines={starLinesVisible || reveal}
              showAllConstellationLines={starLinesVisible || reveal}
              defaultLabels={false}
              defaultBoundary={false}
              defaultGrid={false}
              lockToggles={!reveal}
              {...((isLocateMode || isAdvancedLocate) && !reveal
                ? {
                    onSkyClick: (position: { ra: number; dec: number }) =>
                      setStarSelection(position),
                  }
                : {})}
              markers={markerList}
              className="h-full"
            />
            {!reveal && isLocateMode && starSelection && (
              <div className="absolute left-3 top-3 rounded-md border border-primary/50 bg-background/80 px-3 py-2 text-xs backdrop-blur">
                Selection ready — submit when you are confident.
              </div>
            )}
          </div>
        </div>

        <aside className="panel min-w-0 p-4">
          <p className="label-caps">
            {starDifficultyChoice === "advanced" ? "Advanced" : starDifficultyChoice.charAt(0).toUpperCase() + starDifficultyChoice.slice(1)}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold">
            {isLocateMode ? `Locate ${modePrompt}` : "Identify this star"}
          </h1>

          {!reveal ? (
            <>
              {isLocateMode ? (
                <div className="mt-5 flex flex-col gap-3">
                  <Button disabled={!starSelection} onClick={submitStar}>
                    Submit location
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Click the map to place a marker, then submit. The target is not revealed until
                    after your answer.
                  </p>
                </div>
              ) : (
                <form
                  className="mt-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitStar();
                  }}
                >
                  <label htmlFor="star-answer" className="label-caps">
                    Your answer
                  </label>
                  <Input
                    id="star-answer"
                    autoFocus
                    value={starInput}
                    onChange={(event) => setStarInput(event.target.value)}
                    placeholder={
                      starPracticeType === "bayer"
                        ? "Alpha Tauri, α Tau, or alf Tau"
                        : "Sirius, Vega, Polaris, or Aldebaran"
                    }
                    className="mt-2"
                  />
                  <Button type="submit" disabled={!starInput.trim()} className="mt-3">
                    Check answer
                  </Button>
                </form>
              )}
            </>
          ) : (
            <div
              className={cn(
                "mt-6 rounded-md border p-4",
                starAnswered.correct
                  ? "border-success/50 bg-success/10"
                  : "border-destructive/50 bg-destructive/10",
              )}
            >
              <p className="flex items-center gap-2 font-medium">
                {starAnswered.correct ? <Check className="size-4" /> : <X className="size-4" />}
                {starAnswered.correct ? "Correct" : "Not quite"}
              </p>
              <p className="mt-2 text-sm">
                {starQuestion.star.name} · {starQuestion.star.constellationName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {starQuestion.star.bayer
                  ? `${starQuestion.star.bayer} ${starQuestion.star.constellation}`
                  : "No Bayer designation"}
              </p>
              {starAnswered.separation !== null && (
                <p className="mt-2 text-xs font-mono text-muted-foreground">
                  Angular error: {starAnswered.separation.toFixed(2)}°
                </p>
              )}
              <Button className="mt-4" onClick={nextStarQuestion}>
                Next question
              </Button>
            </div>
          )}

          {reveal && (
            <section className="mt-6 rounded-md border border-border/70 bg-background/70 p-4">
              <p className="label-caps">Star profile</p>
              <div className="mt-2 space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Common / proper name:</span>{" "}
                  {starQuestion.star.name}
                </div>
                <div>
                  <span className="text-muted-foreground">Bayer designation:</span>{" "}
                  {starQuestion.star.bayer
                    ? `${starQuestion.star.bayer} ${starQuestion.star.constellationName}`
                    : "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Constellation:</span>{" "}
                  {starQuestion.star.constellationName}
                </div>
                <div>
                  <span className="text-muted-foreground">Magnitude:</span>{" "}
                  {starQuestion.star.magnitude}
                </div>
                <div>
                  <span className="text-muted-foreground">Alternative names:</span>{" "}
                  {starQuestion.star.aliases.join(", ")}
                </div>
                {starQuestion.star.traditionalName && (
                  <div>
                    <span className="text-muted-foreground">Traditional name:</span>{" "}
                    {starQuestion.star.traditionalName}
                  </div>
                )}
                {starQuestion.star.spectralType && (
                  <div>
                    <span className="text-muted-foreground">Spectral type:</span>{" "}
                    {starQuestion.star.spectralType}
                  </div>
                )}
                {starQuestion.star.distance && (
                  <div>
                    <span className="text-muted-foreground">Distance:</span>{" "}
                    {starQuestion.star.distance}
                  </div>
                )}
              </div>
            </section>
          )}

          {starHintPromptOpen && !reveal && !isAdvancedLocate && (
            <div className="mt-4 rounded-md border border-border bg-background/80 p-4">
              <p className="font-medium">Need constellation lines?</p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStarHintPromptOpen(false);
                    setStarLinesVisible(true);
                    setStarAttempts(3);
                  }}
                >
                  YES
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStarHintPromptOpen(false);
                    setStarLinesVisible(false);
                    setStarAttempts(3);
                  }}
                >
                  NO
                </Button>
              </div>
            </div>
          )}
        </aside>
      </main>
    );
  }

  if (finished) {
    return <Results history={history} onRestart={restart} />;
  }

  if (!question) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-bold">Practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Train your recognition skills with constellations and asterisms.
        </p>

        {!constellationSelected ? (
          <section className="mt-8 grid gap-2 sm:grid-cols-2">
            <Link
              to="/practice"
              search={{ category: "constellations" }}
              className="panel block p-4 text-left transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="font-display text-base font-semibold">Constellation Practice</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Practice identifying the 88 official IAU constellations.
              </span>
            </Link>
            <Link
              to="/asterisms/practice"
              className="panel block p-4 text-left transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="font-display text-base font-semibold">Asterism Practice</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Practice identifying recognizable star patterns and asterisms.
              </span>
            </Link>
            <Link
              to="/messier/practice"
              className="panel block p-4 text-left transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="font-display text-base font-semibold">Messier Practice</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Identify and locate galaxies, nebulae and clusters from M1 through M110.
              </span>
            </Link>
            <Link
              to="/practice"
              search={{ category: "stars" }}
              className="panel block p-4 text-left transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="font-display text-base font-semibold">Star Practice</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Identify bright stars by name, Bayer designation and sky position.
              </span>
            </Link>
          </section>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Ten questions per session. Difficulty changes the challenge before you answer — never
              the explanation afterwards.
            </p>

            <section className="mt-8">
              <h2 className="label-caps">Mode</h2>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => setMode("constellation")}
                  className={cn(
                    "panel p-4 text-left transition-colors",
                    mode === "constellation"
                      ? "border-primary/60 bg-primary/10"
                      : "hover:bg-secondary/50",
                  )}
                >
                  <span className="font-display text-base font-semibold">
                    Constellation Identification
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Recognise the constellation shown in the star field
                  </span>
                </button>
                <button
                  onClick={() => setMode("iau-images")}
                  className={cn(
                    "panel p-4 text-left transition-colors",
                    mode === "iau-images"
                      ? "border-primary/60 bg-primary/10"
                      : "hover:bg-secondary/50",
                  )}
                >
                  <span className="font-display text-base font-semibold">Official IAU Images</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Identify constellations from official IAU constellation artwork
                  </span>
                </button>
              </div>
            </section>

            <section className="mt-6">
              <h2 className="label-caps">Difficulty</h2>
              {mode === "iau-images" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  IAU Image mode uses multiple-choice with balanced difficulty.
                </p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className={cn(
                        "panel p-4 text-left transition-colors",
                        difficulty === d.id
                          ? "border-primary/60 bg-primary/10"
                          : "hover:bg-secondary/50",
                      )}
                    >
                      <span className="font-display text-base font-semibold">{d.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{d.blurb}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="panel mt-6 divide-y divide-border/70">
              {mode === "constellation" && (
                <>
                  <label className="flex items-center justify-between gap-4 p-4">
                    <span>
                      <span className="text-sm font-medium">Timed practice</span>
                      <span className="block text-xs text-muted-foreground">
                        30 seconds per question; running out counts as incorrect and reveals the
                        answer.
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
                              .map(
                                (w) => `${getConstellation(w.id)?.name ?? w.id} — ${w.accuracy}%`,
                              )
                              .join(" · ")
                          : "Not enough history yet — sessions stay random until you have practised more."}
                      </span>
                    </span>
                    <Switch
                      checked={weakMode}
                      onCheckedChange={setWeakMode}
                      disabled={weak.length < 4}
                    />
                  </label>
                </>
              )}
            </section>

            <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={nextQuestion}>
              Start session
            </Button>
          </>
        )}
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
        {mode === "iau-images" ? (
          // IAU Image display
          <div className="flex items-center justify-center h-[46vh] min-h-[300px] lg:h-[calc(100vh-8rem)] bg-gradient-to-br from-slate-900 to-slate-800 p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">Official IAU Constellation</p>
              {revealed ? (
                <img
                  src={`/iau-constellations/processed/${question.correctAnswer}_processed.jpg`}
                  alt={target.name}
                  className="max-w-full max-h-[60vh] mx-auto object-contain rounded"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = "none";
                    const fallback = img.nextElementSibling as HTMLDivElement;
                    if (fallback) fallback.style.display = "block";
                  }}
                />
              ) : (
                <img
                  src={`/iau-constellations/processed/${question.correctAnswer}_processed.jpg`}
                  alt="Constellation image"
                  className="max-w-full max-h-[60vh] mx-auto object-contain rounded"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = "none";
                    const fallback = img.nextElementSibling as HTMLDivElement;
                    if (fallback) fallback.style.display = "block";
                  }}
                />
              )}
              <div
                style={{ display: "none" }}
                className="text-muted-foreground text-sm p-8 bg-slate-800 rounded"
              >
                <p>IAU constellation image not found.</p>
                <p className="text-xs mt-2">
                  Expected: /iau-constellations/processed/{question.correctAnswer}_processed.jpg
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Sky map display for constellation identification
          <SkyViewer
            key={question.id}
            constellation={target}
            view={view}
            magnitudeLimit={question.skyState.magnitudeLimit}
            defaultLines={revealed ? true : question.skyState.showLines}
            defaultLabels={revealed}
            defaultBoundary={revealed ? true : question.skyState.showBoundary}
            defaultGrid={revealed ? true : question.skyState.showGrid}
            labelModeWhenOn="important"
            lockToggles={!revealed}
            emphasizeTarget={revealed}
            className="h-[46vh] min-h-[300px] lg:h-[calc(100vh-8rem)]"
          />
        )}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded bg-background/70 px-2 py-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground backdrop-blur">
            {mode === "iau-images" ? "iau" : question.difficulty} ·{" "}
            {history.length + (revealed ? 0 : 1)}/{QUESTIONS_PER_SESSION}
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
            <h1 className="font-display text-lg font-semibold">
              {mode === "iau-images"
                ? "Which constellation is shown?"
                : difficulty === "advanced"
                  ? "Enter constellation name"
                  : "Which constellation is shown?"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "iau-images"
                ? "Select the constellation depicted in this official IAU illustration."
                : difficulty === "advanced"
                  ? "Type the constellation name and press Check Answer."
                  : "Drag to pan, scroll or pinch to zoom. The field is centred on the target."}
            </p>
            {mode === "constellation" && difficulty === "advanced" ? (
              <div className="mt-4 flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      submit(null, textInput);
                    }
                  }}
                  placeholder="e.g., Orion"
                  className="flex-1"
                  autoFocus
                />
                <Button onClick={() => submit(null, textInput)}>Check Answer</Button>
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
                    {c.label}
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
                : difficulty === "advanced"
                  ? `Incorrect — you entered "${textInput}"`
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
