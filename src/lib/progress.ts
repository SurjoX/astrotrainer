import type { Difficulty } from "./astro/types";

const KEY = "astrotrainer:progress:v1";

export interface ConstellationStat {
  attempts: number;
  correct: number;
  incorrect: number;
  totalTimeMs: number;
  bestScore: number;
}

export interface ProgressState {
  totalQuestions: number;
  correct: number;
  incorrect: number;
  totalTimeMs: number;
  bestSessionScore: number;
  score: number;
  byConstellation: Record<string, ConstellationStat>;
  lastPlayed: number | null;
}

export const emptyProgress: ProgressState = {
  totalQuestions: 0,
  correct: 0,
  incorrect: 0,
  totalTimeMs: 0,
  bestSessionScore: 0,
  score: 0,
  byConstellation: {},
  lastPlayed: null,
};

export function loadProgress(): ProgressState {
  if (typeof window === "undefined") return emptyProgress;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyProgress;
    return { ...emptyProgress, ...(JSON.parse(raw) as ProgressState) };
  } catch {
    return emptyProgress;
  }
}

function save(state: ProgressState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — progress stays in memory for this session */
  }
  window.dispatchEvent(new CustomEvent("astrotrainer:progress"));
}

export const POINTS_CORRECT = 100;

/** Simple transparent scoring: 100 for a correct answer, up to 50 speed bonus. */
export function scoreFor(correct: boolean, elapsedMs: number): number {
  if (!correct) return 0;
  const seconds = elapsedMs / 1000;
  const bonus = Math.round(Math.max(0, 50 - seconds * 3));
  return POINTS_CORRECT + bonus;
}

export function recordAnswer(input: {
  constellationId: string;
  correct: boolean;
  elapsedMs: number;
  difficulty: Difficulty;
}): ProgressState {
  const state = loadProgress();
  const points = scoreFor(input.correct, input.elapsedMs);
  const prev = state.byConstellation[input.constellationId] ?? {
    attempts: 0,
    correct: 0,
    incorrect: 0,
    totalTimeMs: 0,
    bestScore: 0,
  };
  const next: ProgressState = {
    ...state,
    totalQuestions: state.totalQuestions + 1,
    correct: state.correct + (input.correct ? 1 : 0),
    incorrect: state.incorrect + (input.correct ? 0 : 1),
    totalTimeMs: state.totalTimeMs + input.elapsedMs,
    score: state.score + points,
    lastPlayed: Date.now(),
    byConstellation: {
      ...state.byConstellation,
      [input.constellationId]: {
        attempts: prev.attempts + 1,
        correct: prev.correct + (input.correct ? 1 : 0),
        incorrect: prev.incorrect + (input.correct ? 0 : 1),
        totalTimeMs: prev.totalTimeMs + input.elapsedMs,
        bestScore: Math.max(prev.bestScore, points),
      },
    },
  };
  save(next);
  return next;
}

export function recordSession(score: number) {
  const state = loadProgress();
  if (score > state.bestSessionScore) save({ ...state, bestSessionScore: score });
}

export function resetProgress() {
  save(emptyProgress);
}

export function accuracy(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/**
 * Mastery requires repeated success: accuracy weighted by attempts, so a single
 * correct answer never reads as mastered.
 */
export const MASTERY_ATTEMPTS = 5;
export function masteryOf(stat: ConstellationStat): number {
  if (!stat.attempts) return 0;
  const acc = stat.correct / stat.attempts;
  const confidence = Math.min(1, stat.attempts / MASTERY_ATTEMPTS);
  return Math.round(acc * confidence * 100);
}

export interface RankedConstellation {
  id: string;
  stat: ConstellationStat;
  accuracy: number;
  mastery: number;
}

export function ranked(state: ProgressState): RankedConstellation[] {
  return Object.entries(state.byConstellation)
    .map(([id, stat]) => ({
      id,
      stat,
      accuracy: accuracy(stat.correct, stat.attempts),
      mastery: masteryOf(stat),
    }))
    .sort((a, b) => b.mastery - a.mastery);
}

export function weakConstellations(state: ProgressState, limit = 8): RankedConstellation[] {
  return ranked(state)
    .filter((r) => r.stat.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.stat.attempts - a.stat.attempts)
    .slice(0, limit);
}
