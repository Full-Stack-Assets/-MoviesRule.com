import { fetchNowPlaying, fetchTrendingFilms, type FilmCandidate } from '../sources/tmdb';
import { enrichFilm } from './enrich-film';
import { braveWebSearch, scrapeArticle } from './research';
import { generateReview, type FilmCritique } from './generate-review';
import { serialize } from './serialize';
import { loadTopicLog, saveTopicLog, commitPost } from './github';
import type { PipelineOptions, PipelineResult } from './pipeline';
import type { TopicLog } from './types';

/** Topic-log signature for a reviewed film. Namespaced so a film review and a
 *  news post about the same film never collide in the dedup log. */
function reviewSignature(tmdbId: number): string {
  return `review:${tmdbId}`;
}

function dedupeByTmdbId(films: FilmCandidate[]): FilmCandidate[] {
  const seen = new Set<number>();
  const out: FilmCandidate[] = [];
  for (const f of films) {
    if (seen.has(f.tmdbId)) continue;
    seen.add(f.tmdbId);
    out.push(f);
  }
  return out;
}

/** Highest-popularity released film not already reviewed (per the topic log). */
function pickFilmToReview(candidates: FilmCandidate[], log: TopicLog): FilmCandidate | null {
  const seen = new Set(log.topics.map((t) => t.signature));
  const today = new Date().toISOString().slice(0, 10);
  return (
    candidates
      // Only films that have actually released — you can't review the unseen.
      .filter((c) => c.releaseDate && c.releaseDate <= today)
      .sort((a, b) => b.popularity - a.popularity)
      .find((c) => !seen.has(reviewSignature(c.tmdbId))) ?? null
  );
}

/** Scrape the top few critic reviews for a film (Brave web search → Cheerio). */
async function researchFilm(title: string, year: number | null): Promise<FilmCritique> {
  const q = `"${title}" ${year ?? ''} review`.trim();
  const results = await braveWebSearch(q);

  const seenHosts = new Set<string>();
  const toScrape = results
    .filter((r) => {
      try {
        const h = new URL(r.url).hostname;
        if (seenHosts.has(h)) return false;
        seenHosts.add(h);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 3);

  const articles = (
    await Promise.all(
      toScrape.map(async (r) => {
        const s = await scrapeArticle(r.url);
        return s ? { url: r.url, title: s.title || r.title, content: s.content } : null;
      })
    )
  ).filter((a): a is NonNullable<typeof a> => a !== null);

  return { articles };
}

/**
 * Review-mode pipeline: pick a film from TMDB that hasn't been reviewed,
 * enrich it with verified facts, scrape critic coverage, synthesize a
 * spoiler-free consensus review, and commit it. Mirrors runPipeline's shape
 * (timings, graceful skips, dryRun) so it slots into the same callers.
 */
export async function runReviewPipeline(
  opts: PipelineOptions = {}
): Promise<PipelineResult & { mdx?: string }> {
  const timings: Record<string, number> = {};
  const t = (label: string) => {
    const start = Date.now();
    return () => (timings[label] = Date.now() - start);
  };

  try {
    // ── 1. Gather candidate films ─────────────────────────────────
    const doneGather = t('gather');
    const [nowPlaying, trending] = await Promise.all([
      fetchNowPlaying().catch((e) => { console.warn('tmdb nowPlaying', e); return [] as FilmCandidate[]; }),
      fetchTrendingFilms().catch((e) => { console.warn('tmdb trending', e); return [] as FilmCandidate[]; }),
    ]);
    const candidates = dedupeByTmdbId([...nowPlaying, ...trending]);
    doneGather();

    if (candidates.length === 0) {
      return { ok: false, skipped: 'no film candidates (TMDB_API_KEY unset or empty)', timings };
    }

    // ── 2. Pick an un-reviewed film ───────────────────────────────
    const donePick = t('score');
    const topicLog = opts.topicLog ?? (opts.dryRun ? { topics: [] } : await loadTopicLog());
    const film = pickFilmToReview(candidates, topicLog);
    donePick();

    if (!film) {
      return { ok: false, skipped: 'all candidate films already reviewed', timings };
    }

    // ── 3. Enrich (verified facts) + research critic coverage ─────
    const doneResearch = t('research');
    const facts = await enrichFilm(film.tmdbId);
    if (!facts) {
      return { ok: false, skipped: `could not enrich film: ${film.title}`, timings };
    }
    const critique = await researchFilm(facts.title, facts.year);
    doneResearch();

    if (critique.articles.length === 0 && !facts.overview) {
      return {
        ok: false,
        skipped: `no critic coverage or overview for: ${facts.title}`,
        winner: { title: facts.title, url: facts.tmdbUrl, score: 0 },
        timings,
      };
    }

    // ── 4. Generate the review ────────────────────────────────────
    const doneGen = t('generate');
    const post = await generateReview(facts, critique);
    const mdx = serialize(post);
    doneGen();

    const signature = reviewSignature(facts.tmdbId);
    const winner = { title: facts.title, url: facts.tmdbUrl, score: post.rating?.score ?? 0 };

    if (opts.dryRun) {
      return { ok: true, slug: post.slug, winner, signature, mdx, timings };
    }

    // ── 5. Commit ─────────────────────────────────────────────────
    const doneCommit = t('commit');
    const path = await commitPost(post, mdx);
    await saveTopicLog({
      topics: [
        ...topicLog.topics,
        {
          slug: post.slug,
          title: facts.title,
          url: facts.tmdbUrl,
          publishedAt: new Date().toISOString(),
          signature,
        },
      ],
    });
    doneCommit();

    return { ok: true, slug: post.slug, path, winner, signature, timings };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), timings };
  }
}
