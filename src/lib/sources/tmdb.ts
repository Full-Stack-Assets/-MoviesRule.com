import { siteConfig } from '@/site.config';
import type { FilmFacts } from '../reviews';

// TMDB (The Movie Database) v3 client — factual film metadata, posters, cast,
// release dates, and "now playing / trending / upcoming". Free API key in
// TMDB_API_KEY. Every function degrades gracefully (null / []) when the key is
// unset or a request fails, matching the pipeline's "sources never throw" rule.

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

/** Lightweight candidate from a list endpoint (now-playing / trending / upcoming). */
export interface FilmCandidate {
  tmdbId: number;
  title: string;
  releaseDate: string | null;
  posterUrl: string | null;
  popularity: number;
  overview: string;
}

function apiKey(): string | null {
  return process.env.TMDB_API_KEY || null;
}
const region = () => siteConfig.tmdb.region;
const language = () => siteConfig.tmdb.language;

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const key = apiKey();
  if (!key) return null;
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('language', language());
  for (const [p, v] of Object.entries(params)) url.searchParams.set(p, v);
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) {
      console.warn(`[tmdb] ${path} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[tmdb] ${path} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function img(pathname: string | null | undefined, size = 'w500'): string | null {
  return pathname ? `${IMG_BASE}/${size}${pathname}` : null;
}

interface TmdbListResult {
  results?: Array<{
    id: number;
    title?: string;
    name?: string;
    release_date?: string;
    poster_path?: string | null;
    popularity?: number;
    overview?: string;
  }>;
}

function toCandidates(data: TmdbListResult | null): FilmCandidate[] {
  if (!data?.results) return [];
  return data.results
    .filter((r) => r.id && (r.title || r.name))
    .map((r) => ({
      tmdbId: r.id,
      title: (r.title ?? r.name) as string,
      releaseDate: r.release_date || null,
      posterUrl: img(r.poster_path),
      popularity: r.popularity ?? 0,
      overview: r.overview ?? '',
    }));
}

export async function fetchNowPlaying(): Promise<FilmCandidate[]> {
  return toCandidates(await tmdb<TmdbListResult>('/movie/now_playing', { region: region(), page: '1' }));
}

export async function fetchTrendingFilms(): Promise<FilmCandidate[]> {
  return toCandidates(await tmdb<TmdbListResult>('/trending/movie/week'));
}

export async function fetchUpcoming(): Promise<FilmCandidate[]> {
  return toCandidates(await tmdb<TmdbListResult>('/movie/upcoming', { region: region(), page: '1' }));
}

export async function searchFilm(title: string, year?: number): Promise<FilmCandidate | null> {
  const params: Record<string, string> = { query: title };
  if (year) params.year = String(year);
  const [first] = toCandidates(await tmdb<TmdbListResult>('/search/movie', params));
  return first ?? null;
}

interface TmdbDetail {
  id: number;
  title?: string;
  release_date?: string;
  runtime?: number | null;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: Array<{ name: string }>;
  credits?: {
    cast?: Array<{ name: string }>;
    crew?: Array<{ job: string; name: string }>;
  };
  'watch/providers'?: {
    results?: Record<string, { flatrate?: Array<{ provider_name: string }> }>;
  };
}

/** Full factual record for a single film — the anti-hallucination anchor for reviews. */
export async function getFilm(tmdbId: number): Promise<FilmFacts | null> {
  const d = await tmdb<TmdbDetail>(`/movie/${tmdbId}`, {
    append_to_response: 'credits,watch/providers',
  });
  if (!d?.id) return null;

  const director = d.credits?.crew?.find((c) => c.job === 'Director')?.name ?? null;
  const cast = (d.credits?.cast ?? []).slice(0, 6).map((c) => c.name);
  const providers =
    d['watch/providers']?.results?.[region()]?.flatrate?.map((p) => p.provider_name) ?? [];
  const year = d.release_date ? Number(d.release_date.slice(0, 4)) || null : null;

  return {
    tmdbId: d.id,
    title: d.title ?? '',
    year,
    director,
    cast,
    genres: (d.genres ?? []).map((g) => g.name),
    runtimeMin: d.runtime ?? null,
    releaseDate: d.release_date || null,
    posterUrl: img(d.poster_path),
    backdropUrl: img(d.backdrop_path, 'w1280'),
    overview: d.overview ?? '',
    watchProviders: providers,
    tmdbUrl: `https://www.themoviedb.org/movie/${d.id}`,
  };
}
