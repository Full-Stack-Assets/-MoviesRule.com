// Affiliate / "where to watch" link helpers.
//
// Everything here is env-gated and degrades gracefully: with no affiliate IDs
// set, the provider/JustWatch links still render (genuinely useful, non-earning
// discovery links) and the Amazon / VPN money links are simply hidden. Outbound
// affiliate links MUST carry rel="sponsored nofollow" for policy + SEO hygiene;
// the WhereToWatch component does that.
//
// Why this layer instead of editing post MDX: posts are pipeline-owned content
// (see CLAUDE.md). We attach monetization at render time from frontmatter data,
// so every existing AND future post gets it automatically with nothing to
// hand-edit.

import { siteConfig } from '@/site.config';
import type { PostFrontmatter } from './posts';

export const AMAZON_ASSOC_TAG = process.env.NEXT_PUBLIC_AMAZON_ASSOC_TAG?.trim() || '';
export const VPN_AFFILIATE_URL = process.env.NEXT_PUBLIC_VPN_AFFILIATE_URL?.trim() || '';
export const VPN_AFFILIATE_NAME = process.env.NEXT_PUBLIC_VPN_AFFILIATE_NAME?.trim() || '';

/** True when at least one earning link can be rendered (drives the disclosure). */
export const AFFILIATE_ENABLED = Boolean(AMAZON_ASSOC_TAG || VPN_AFFILIATE_URL);

// ISO-3166-1 region for JustWatch locale, reusing the reviews/TMDB region.
const REGION = (siteConfig.tmdb?.region || 'US').toLowerCase();

// Categories where a "where to watch" rail is contextually honest. News and
// opinion are excluded: that bucket carries non-film items (sports, awards
// politics) where a streaming CTA would be noise. Reviews always qualify.
const WATCH_CATEGORIES = new Set(['reviews', 'streaming', 'trailers', 'boxoffice', 'features']);

/** JustWatch search for a title — one link that covers every provider + region. */
export function justWatchSearchUrl(query: string): string {
  return `https://www.justwatch.com/${REGION}/search?q=${encodeURIComponent(query)}`;
}

/** JustWatch home for the region — used when we don't have a specific title. */
export function justWatchHomeUrl(): string {
  return `https://www.justwatch.com/${REGION}`;
}

/** Amazon Prime Video search for a title, tagged for Associates. Null when no tag. */
export function amazonSearchUrl(title: string): string | null {
  if (!AMAZON_ASSOC_TAG) return null;
  return `https://www.amazon.com/s?k=${encodeURIComponent(title)}&i=instant-video&tag=${encodeURIComponent(AMAZON_ASSOC_TAG)}`;
}

/** Amazon physical-media (Blu-ray / 4K) search for a title, tagged. Null when no tag. */
export function amazonBluRayUrl(title: string): string | null {
  if (!AMAZON_ASSOC_TAG) return null;
  return `https://www.amazon.com/s?k=${encodeURIComponent(`${title} blu-ray`)}&i=movies-tv&tag=${encodeURIComponent(AMAZON_ASSOC_TAG)}`;
}

// Known provider display name (as TMDB returns it) → that platform's own search
// URL for a title. Deep links per title aren't reliably constructable, but a
// provider-scoped search is good UX. Matched by normalized substring so
// "Amazon Prime Video", "Peacock Premium", "Paramount Plus" etc. all resolve.
const PROVIDER_SEARCH: Array<{ match: string; url: (t: string) => string }> = [
  { match: 'netflix', url: (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}` },
  { match: 'disney', url: (t) => `https://www.disneyplus.com/search?q=${encodeURIComponent(t)}` },
  { match: 'hulu', url: (t) => `https://www.hulu.com/search?q=${encodeURIComponent(t)}` },
  { match: 'max', url: (t) => `https://www.max.com/search?q=${encodeURIComponent(t)}` },
  { match: 'apple', url: (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}` },
  { match: 'peacock', url: (t) => `https://www.peacocktv.com/search?q=${encodeURIComponent(t)}` },
  { match: 'paramount', url: (t) => `https://www.paramountplus.com/search/?query=${encodeURIComponent(t)}` },
  { match: 'prime video', url: (t) => `https://www.amazon.com/s?k=${encodeURIComponent(t)}&i=instant-video` },
  { match: 'amazon', url: (t) => `https://www.amazon.com/s?k=${encodeURIComponent(t)}&i=instant-video` },
  { match: 'starz', url: (t) => `https://www.starz.com/us/en/search?q=${encodeURIComponent(t)}` },
  { match: 'crunchyroll', url: (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}` },
];

/** A search link for a named provider + title, falling back to JustWatch. */
export function providerLink(provider: string, title: string): string {
  const norm = provider.toLowerCase();
  const hit = PROVIDER_SEARCH.find((p) => norm.includes(p.match));
  return hit ? hit.url(title) : justWatchSearchUrl(title);
}

export interface WatchContext {
  /** Specific film/show title to search for, when we can identify one precisely. */
  title?: string;
  /** Streaming/rental providers from TMDB (frontmatter.watchOn), if any. */
  providers: string[];
}

/**
 * Decide whether (and how) to show a "where to watch" rail for a post.
 *
 * - Film reviews with TMDB data → titled rail with the exact film + provider
 *   chips (the high-converting case).
 * - Other film-content posts (streaming/trailers/box office/features) → a
 *   generic discovery rail (no misleading title guessed from a headline).
 * - News / opinion → null (no rail).
 *
 * Returns null when no rail should render.
 */
export function watchContextFor(fm: PostFrontmatter): WatchContext | null {
  const isReview = fm.type === 'review';
  if (!isReview && !WATCH_CATEGORIES.has(fm.category)) return null;

  // Only trust a precise title when it's a structured review with film facts,
  // or a review whose headline we can de-suffix. Never guess one from a generic
  // news/feature headline — a wrong search is worse than an honest generic rail.
  const title =
    fm.film?.title ??
    (isReview ? fm.title.replace(/\s*[—–-]?\s*review\b.*$/i, '').trim() || undefined : undefined);

  return { title, providers: fm.watchOn ?? [] };
}
