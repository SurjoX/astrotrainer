import type { Difficulty } from "./astro/types";

const KEY = "astrotrainer:star-progress:v1";

export interface StarProgressStat {
  attempts: number;
  correct: number;
  incorrect: number;
  totalTimeMs: number;
  bestAngularErrorDeg: number | null;
}

export interface StarDifficultyStat {
  attempts: number;
  correct: number;
  incorrect: number;
}

export interface StarProgressState {
  totalQuestions: number;
  correct: number;
  incorrect: number;
  totalTimeMs: number;
  currentStreak: number;
  bestStreak: number;
  byStar: Record<string, StarProgressStat>;
  byDifficulty: Record<Difficulty, StarDifficultyStat>;
  lastPlayed: number | null;
}

const emptyDifficulty = (): Record<Difficulty, StarDifficultyStat> => ({
  beginner: { attempts: 0, correct: 0, incorrect: 0 },
  intermediate: { attempts: 0, correct: 0, incorrect: 0 },
  advanced: { attempts: 0, correct: 0, incorrect: 0 },
});

export const emptyStarProgress: StarProgressState = {
  totalQuestions: 0,
  correct: 0,
  incorrect: 0,
  totalTimeMs: 0,
  currentStreak: 0,
  bestStreak: 0,
  byStar: {},
  byDifficulty: emptyDifficulty(),
  lastPlayed: null,
};

export function loadStarProgress(): StarProgressState {
  if (typeof window === "undefined") return emptyStarProgress;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(KEY) ?? "null",
    ) as Partial<StarProgressState> | null;
    return {
      ...emptyStarProgress,
      ...parsed,
      byStar: parsed?.byStar ?? {},
      byDifficulty: { ...emptyDifficulty(), ...parsed?.byDifficulty },
    };
  } catch {
    return emptyStarProgress;
  }
}

function saveStarProgress(state: StarProgressState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("astrotrainer:star-progress"));
}

export function recordStarAnswer(input: {
  starId: string;
  correct: boolean;
  elapsedMs: number;
  difficulty: Difficulty;
  angularErrorDeg?: number | null;
}): StarProgressState {
  const state = loadStarProgress();
  const previous = state.byStar[input.starId] ?? {
    attempts: 0,
    correct: 0,
    incorrect: 0,
    totalTimeMs: 0,
    bestAngularErrorDeg: null,
  };
  const difficulty = state.byDifficulty[input.difficulty];
  const currentStreak = input.correct ? state.currentStreak + 1 : 0;

  const next: StarProgressState = {
    ...state,
    totalQuestions: state.totalQuestions + 1,
    correct: state.correct + (input.correct ? 1 : 0),
    incorrect: state.incorrect + (input.correct ? 0 : 1),
    totalTimeMs: state.totalTimeMs + input.elapsedMs,
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
    lastPlayed: Date.now(),
    byStar: {
      ...state.byStar,
      [input.starId]: {
        attempts: previous.attempts + 1,
        correct: previous.correct + (input.correct ? 1 : 0),
        incorrect: previous.incorrect + (input.correct ? 0 : 1),
        totalTimeMs: previous.totalTimeMs + input.elapsedMs,
        bestAngularErrorDeg:
          input.angularErrorDeg == null
            ? previous.bestAngularErrorDeg
            : previous.bestAngularErrorDeg == null
              ? input.angularErrorDeg
              : Math.min(previous.bestAngularErrorDeg, input.angularErrorDeg),
      },
    },
    byDifficulty: {
      ...state.byDifficulty,
      [input.difficulty]: {
        attempts: difficulty.attempts + 1,
        correct: difficulty.correct + (input.correct ? 1 : 0),
        incorrect: difficulty.incorrect + (input.correct ? 0 : 1),
      },
    },
  };

  saveStarProgress(next);
  return next;
}

export function resetStarProgress() {
  saveStarProgress(emptyStarProgress);
}

export function starAccuracy(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

export function weakestStars(progress: StarProgressState, limit = 5) {
  return Object.entries(progress.byStar)
    .map(([id, stat]) => ({ id, stat, accuracy: starAccuracy(stat.correct, stat.attempts) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.stat.attempts - a.stat.attempts)
    .slice(0, limit);
}
