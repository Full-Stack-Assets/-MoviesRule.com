import type { Post } from './posts';
import type { FilmFacts } from './reviews';
import { siteConfig } from '@/site.config';

// Fall back to the configured URL when the env var is unset OR an empty string.
// `??` alone is unsafe here: an unset GitHub Actions secret is passed through as
// "" (not undefined), which would blank out SITE_URL and break every link in the
// digest emails and syndicated posts.
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
export const SITE_URL =
  configuredSiteUrl && configuredSiteUrl.length > 0 ? configuredSiteUrl : siteConfig.url;
export const SITE_NAME = siteConfig.name;
export const SITE_DESCRIPTION = siteConfig.description;

/**
 * JSON-LD for a single post. BlogPosting (an Article subtype) keeps every post
 * — news, engineering, opinion — eligible for article rich results, and gives
 * search/answer engines a clean, machine-readable summary of the page.
 */
export function articleJsonLd(post: Post): Record<string, unknown> {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const published = new Date(post.frontmatter.date).toISOString();

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.frontmatter.title,
    description: post.frontmatter.description,
    datePublished: published,
    dateModified: published,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    // The pipeline writes these posts, so the byline is the publication itself.
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };

  if (post.frontmatter.hero?.url) schema.image = [post.frontmatter.hero.url];
  if (post.frontmatter.category) schema.articleSection = post.frontmatter.category;
  if (post.frontmatter.tags?.length) schema.keywords = post.frontmatter.tags.join(', ');

  return schema;
}

/**
 * FAQPage JSON-LD built from the post's `<Question>` blocks. Returns null when a
 * post has no FAQ so we never emit an empty schema.
 */
export function faqJsonLd(post: Post): Record<string, unknown> | null {
  const faqs = extractFaq(post.body);
  if (faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/**
 * Site-level JSON-LD (WebSite + the Organization that publishes it). Rendered
 * once site-wide so search/answer engines can resolve the publication as an
 * entity rather than re-deriving it per page.
 */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };
}

/**
 * Movie JSON-LD for a "where to watch" page. Models the film as a schema.org
 * Movie so search/answer engines can resolve the entity and (with the provider
 * list) surface watch options. Score, when present, becomes an aggregateRating.
 */
export function movieJsonLd(
  film: FilmFacts,
  opts: { url: string; score?: number }
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: film.title,
    url: opts.url,
  };
  if (film.year) schema.datePublished = String(film.year);
  if (film.releaseDate) schema.datePublished = film.releaseDate;
  if (film.director) schema.director = { '@type': 'Person', name: film.director };
  if (film.cast?.length) schema.actor = film.cast.map((name) => ({ '@type': 'Person', name }));
  if (film.genres?.length) schema.genre = film.genres;
  if (film.overview) schema.description = film.overview;
  if (film.posterUrl) schema.image = film.posterUrl;
  if (typeof opts.score === 'number') {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(opts.score) / 20, // 0–100 → 0–5
      bestRating: 5,
      worstRating: 0,
      ratingCount: 1,
    };
  }
  return schema;
}

/** Generic FAQPage JSON-LD from an explicit Q/A list (used by where-to-watch pages). */
export function faqListJsonLd(faqs: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/** Breadcrumb trail (Home › Category › Post) for a post, for breadcrumb rich results. */
export function breadcrumbJsonLd(post: Post): Record<string, unknown> {
  const { category, title } = post.frontmatter;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: category, item: `${SITE_URL}/categories/${category}` },
      { '@type': 'ListItem', position: 3, name: title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };
}

const QUESTION_RE =
  /<Question\s+[^>]*?q=(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/Question>/gi;

/** Pull the `q` + answer text out of each `<Question>` block in the MDX body. */
export function extractFaq(body: string): Array<{ question: string; answer: string }> {
  const out: Array<{ question: string; answer: string }> = [];
  for (const m of body.matchAll(QUESTION_RE)) {
    const question = decodeEntities((m[1] ?? m[2] ?? '').trim());
    const answer = toPlainText(m[3] ?? '');
    if (question && answer) out.push({ question, answer });
  }
  return out;
}

/** Reduce MDX/markdown to clean plain text suitable for an Answer field. */
function toPlainText(s: string): string {
  const stripped = s
    .replace(/<[^>]+>/g, ' ') // drop any nested MDX/HTML tags
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // markdown links -> their text
    .replace(/[*_`#>]/g, '') // emphasis / code / heading / quote markers
    .replace(/\s+/g, ' ')
    .trim();
  return decodeEntities(stripped);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
