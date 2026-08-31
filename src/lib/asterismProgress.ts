import type { AsterismDifficulty } from "./astro/asterisms";

/**
 * Asterism practice statistics. Deliberately stored under its own localStorage
 * key so it can never overwrite or corrupt constellation progress.
 */
const KEY = "astrotrainer:asterism-progress:v1";
export const ASTERISM_PROGRESS_EVENT = "astrotrainer:asterism-progress";

export interface AsterismStat {
  attempts: number;
  correct: number;
  incorrect: number;
  totalTimeMs: number;
  bestScore: number;
}

export interface DifficultyStat {
  attempts: number;
  correct: number;
}

export interface AsterismProgressState {
  totalQuestions: number;
  correct: number;
  incorrect: number;
  totalTimeMs: number;
  score: number;
  bestSessionScore: number;
  currentStreak: number;
  bestStreak: number;
  byAsterism: Record<string, AsterismStat>;
  byDifficulty: Record<AsterismDifficulty, DifficultyStat>;
  /** Most recently practised asterism ids, newest first */
  recent: string[];
  lastPlayed: number | null;
}

export const emptyAsterismProgress: AsterismProgressState = {
  totalQuestions: 0,
  correct: 0,
  incorrect: 0,
  totalTimeMs: 0,
  score: 0,
  bestSessionScore: 0,
  currentStreak: 0,
  bestStreak: 0,
  byAsterism: {},
  byDifficulty: {
    beginner: { attempts: 0, correct: 0 },
    intermediate: { attempts: 0, correct: 0 },
    advanced: { attempts: 0, correct: 0 },
  },
  recent: [],
  lastPlayed: null,
};

export function loadAsterismProgress(): AsterismProgressState {
  if (typeof window === "undefined") return emptyAsterismProgress;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyAsterismProgress;
    const parsed = JSON.parse(raw) as Partial<AsterismProgressState>;
    return {
      ...emptyAsterismProgress,
      ...parsed,
      byDifficulty: { ...emptyAsterismProgress.byDifficulty, ...(parsed.byDifficulty ?? {}) },
      byAsterism: parsed.byAsterism ?? {},
      recent: parsed.recent ?? [],
    };
  } catch {
    return emptyAsterismProgress;
  }
}

function save(state: AsterismProgressState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — progress stays in memory for this session */
  }
  window.dispatchEvent(new CustomEvent(ASTERISM_PROGRESS_EVENT));
}

/** Same transparent scoring philosophy as constellation practice. */
export function asterismScoreFor(correct: boolean, elapsedMs: number): number {
  if (!correct) return 0;
  const bonus = Math.round(Math.max(0, 50 - (elapsedMs / 1000) * 3));
  return 100 + bonus;
}

export function recordAsterismAnswer(input: {
  asterismId: string;
  correct: boolean;
  elapsedMs: number;
  difficulty: AsterismDifficulty;
}): AsterismProgressState {
  const state = loadAsterismProgress();
  const points = asterismScoreFor(input.correct, input.elapsedMs);
  const prev = state.byAsterism[input.asterismId] ?? {
    attempts: 0,
    correct: 0,
    incorrect: 0,
    totalTimeMs: 0,
    bestScore: 0,
  };
  const diff = state.byDifficulty[input.difficulty];
  const streak = input.correct ? state.currentStreak + 1 : 0;

  const next: AsterismProgressState = {
    ...state,
    totalQuestions: state.totalQuestions + 1,
    correct: state.correct + (input.correct ? 1 : 0),
    incorrect: state.incorrect + (input.correct ? 0 : 1),
    totalTimeMs: state.totalTimeMs + input.elapsedMs,
    score: state.score + points,
    currentStreak: streak,
    bestStreak: Math.max(state.bestStreak, streak),
    lastPlayed: Date.now(),
    byAsterism: {
      ...state.byAsterism,
      [input.asterismId]: {
        attempts: prev.attempts + 1,
        correct: prev.correct + (input.correct ? 1 : 0),
        incorrect: prev.incorrect + (input.correct ? 0 : 1),
        totalTimeMs: prev.totalTimeMs + input.elapsedMs,
        bestScore: Math.max(prev.bestScore, points),
      },
    },
    byDifficulty: {
      ...state.byDifficulty,
      [input.difficulty]: {
        attempts: diff.attempts + 1,
        correct: diff.correct + (input.correct ? 1 : 0),
      },
    },
    recent: [input.asterismId, ...state.recent.filter((id) => id !== input.asterismId)].slice(0, 8),
  };
  save(next);
  return next;
}

export function recordAsterismSession(score: number) {
  const state = loadAsterismProgress();
  if (score > state.bestSessionScore) save({ ...state, bestSessionScore: score });
}

export function resetAsterismProgress() {
  save(emptyAsterismProgress);
}

export function asterismAccuracy(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

export const ASTERISM_MASTERY_ATTEMPTS = 5;

export function asterismMasteryOf(stat: AsterismStat): number {
  if (!stat.attempts) return 0;
  const acc = stat.correct / stat.attempts;
  const confidence = Math.min(1, stat.attempts / ASTERISM_MASTERY_ATTEMPTS);
  return Math.round(acc * confidence * 100);
}

export interface RankedAsterism {
  id: string;
  stat: AsterismStat;
  accuracy: number;
  mastery: number;
}

export function rankedAsterisms(state: AsterismProgressState): RankedAsterism[] {
  return Object.entries(state.byAsterism)
    .map(([id, stat]) => ({
      id,
      stat,
      accuracy: asterismAccuracy(stat.correct, stat.attempts),
      mastery: asterismMasteryOf(stat),
    }))
    .sort((a, b) => b.mastery - a.mastery);
}

/** Number of distinct asterisms with at least one mastered-level attempt record. */
export function masteredAsterismCount(state: AsterismProgressState): number {
  return rankedAsterisms(state).filter((r) => r.mastery >= 80).length;
}
