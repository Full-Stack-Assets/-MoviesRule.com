// Shared types + helpers for the cinema **reviews** layer. Framework-free on
// purpose so both the generation pipeline (src/lib/orchestrator/*) and the
// rendering side (src/lib/posts.ts, components) import the same definitions.

/** A post is either a generic news/editorial 'post' (default) or a film 'review'. */
export type PostType = 'post' | 'review';

/**
 * Factual film metadata sourced from TMDB — the anti-hallucination anchor for a
 * review. The writer may interpret these facts but must never contradict them.
 */
export interface FilmFacts {
  tmdbId: number;
  title: string;
  year: number | null;
  director: string | null;
  cast: string[];
  genres: string[];
  runtimeMin: number | null;
  releaseDate: string | null; // ISO (YYYY-MM-DD)
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  watchProviders: string[]; // streaming/rental platforms for the configured region
  tmdbUrl: string;
}

/** Canonical review score is 0–100; the UI renders it as N stars (see scoreToStars). */
export interface Rating {
  score: number; // 0–100
}

/** Optional AI audio narration of a review (e.g. ElevenLabs); wired in a later phase. */
export interface ReviewAudio {
  url: string;
  voice?: string;
}

export const SCORE_MAX = 100;
export const STAR_MAX = 5;

/** Map a 0–100 score to a 0–STAR_MAX star value, rounded to the nearest half-star. */
export function scoreToStars(score: number, starMax = STAR_MAX, scoreMax = SCORE_MAX): number {
  const clamped = Math.max(0, Math.min(scoreMax, score));
  return Math.round((clamped / scoreMax) * starMax * 2) / 2;
}

/** A short verdict label for a score band, for badges and skimming. */
export function verdictLabel(score: number): string {
  if (score >= 85) return 'Essential';
  if (score >= 70) return 'Recommended';
  if (score >= 50) return 'Mixed';
  if (score >= 30) return 'Skip';
  return 'Avoid';
}
