import type { Difficulty } from "./astro/types";

const KEY = "astrotrainer:messier-progress:v1";

export interface MessierObjectStat {
  attempts: number;
  correct: number;
  incorrect: number;
  totalTimeMs: number;
}

export interface MessierDifficultyStat {
  attempts: number;
  correct: number;
}

export interface MessierProgressState {
  totalQuestions: number;
  correct: number;
  incorrect: number;
  totalTimeMs: number;
  currentStreak: number;
  bestStreak: number;
  byObject: Record<string, MessierObjectStat>;
  byDifficulty: Record<Difficulty, MessierDifficultyStat>;
  lastPlayed: number | null;
}

const emptyDifficulty = (): Record<Difficulty, MessierDifficultyStat> => ({
  beginner: { attempts: 0, correct: 0 },
  intermediate: { attempts: 0, correct: 0 },
  advanced: { attempts: 0, correct: 0 },
});

export const emptyMessierProgress: MessierProgressState = {
  totalQuestions: 0,
  correct: 0,
  incorrect: 0,
  totalTimeMs: 0,
  currentStreak: 0,
  bestStreak: 0,
  byObject: {},
  byDifficulty: emptyDifficulty(),
  lastPlayed: null,
};

export function loadMessierProgress(): MessierProgressState {
  if (typeof window === "undefined") return emptyMessierProgress;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(KEY) ?? "null",
    ) as Partial<MessierProgressState> | null;
    return {
      ...emptyMessierProgress,
      ...parsed,
      byObject: parsed?.byObject ?? {},
      byDifficulty: { ...emptyDifficulty(), ...parsed?.byDifficulty },
    };
  } catch {
    return emptyMessierProgress;
  }
}

function saveMessierProgress(state: MessierProgressState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("astrotrainer:messier-progress"));
}

export function recordMessierAnswer(input: {
  objectId: string;
  correct: boolean;
  elapsedMs: number;
  difficulty: Difficulty;
}): MessierProgressState {
  const state = loadMessierProgress();
  const previous = state.byObject[input.objectId] ?? {
    attempts: 0,
    correct: 0,
    incorrect: 0,
    totalTimeMs: 0,
  };
  const difficulty = state.byDifficulty[input.difficulty];
  const currentStreak = input.correct ? state.currentStreak + 1 : 0;
  const next: MessierProgressState = {
    ...state,
    totalQuestions: state.totalQuestions + 1,
    correct: state.correct + (input.correct ? 1 : 0),
    incorrect: state.incorrect + (input.correct ? 0 : 1),
    totalTimeMs: state.totalTimeMs + input.elapsedMs,
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
    lastPlayed: Date.now(),
    byObject: {
      ...state.byObject,
      [input.objectId]: {
        attempts: previous.attempts + 1,
        correct: previous.correct + (input.correct ? 1 : 0),
        incorrect: previous.incorrect + (input.correct ? 0 : 1),
        totalTimeMs: previous.totalTimeMs + input.elapsedMs,
      },
    },
    byDifficulty: {
      ...state.byDifficulty,
      [input.difficulty]: {
        attempts: difficulty.attempts + 1,
        correct: difficulty.correct + (input.correct ? 1 : 0),
      },
    },
  };
  saveMessierProgress(next);
  return next;
}

export function resetMessierProgress() {
  saveMessierProgress(emptyMessierProgress);
}

export function messierAccuracy(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

export function weakestMessier(progress: MessierProgressState, limit = 5) {
  return Object.entries(progress.byObject)
    .map(([id, stat]) => ({ id, stat, accuracy: messierAccuracy(stat.correct, stat.attempts) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.stat.attempts - a.stat.attempts)
    .slice(0, limit);
}
