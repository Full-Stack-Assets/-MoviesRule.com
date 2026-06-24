import type { FilmFacts } from '../reviews';
import { getFilm, searchFilm } from '../sources/tmdb';

/**
 * Resolve a film to its factual TMDB record — by TMDB id, or by title (with an
 * optional disambiguating year). Returns null when TMDB is unconfigured or the
 * film can't be found; callers must degrade gracefully (no facts → skip the
 * review rather than invent them).
 */
export async function enrichFilm(
  ref: number | { title: string; year?: number }
): Promise<FilmFacts | null> {
  if (typeof ref === 'number') return getFilm(ref);
  const candidate = await searchFilm(ref.title, ref.year);
  if (!candidate) return null;
  return getFilm(candidate.tmdbId);
}
