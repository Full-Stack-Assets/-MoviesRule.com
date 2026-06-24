import { z } from 'zod';
import type { GeneratedPost } from './types';
import type { FilmFacts } from '../reviews';
import { siteConfig } from '@/site.config';
import { clampMeta, slugify, normalizeTags, callLlm } from './generate';

const LLM_KEY_ENV = siteConfig.llm.apiKeyEnv;
const MAX_GENERATION_ATTEMPTS = 3;

/** Critic coverage gathered for a film (scraped review articles). */
export interface FilmCritique {
  articles: Array<{ url: string; title: string; content: string }>;
}

// Same self-healing contract style as PostSchema: clamp what's safe (title,
// description, slug, verdict, out-of-range score), retry on what isn't (too-short
// body, too-few tags, malformed JSON). The film FACTS come from TMDB, never the
// model — so the schema deliberately does NOT accept any film metadata.
export const ReviewSchema = z.object({
  title: z.string().min(8).transform((s) => clampMeta(s, 120)),
  description: z.string().min(1).transform((s) => clampMeta(s, 160)),
  slug: z.string().transform(slugify).pipe(z.string().regex(/^[a-z0-9-]+$/)),
  tags: z
    .array(z.string())
    .transform(normalizeTags)
    .pipe(z.array(z.string()).min(2).max(6)),
  verdict: z.string().min(1).transform((s) => clampMeta(s, 140)),
  score: z.number().transform((n) => Math.max(0, Math.min(100, Math.round(n)))),
  body: z.string().min(600),
});

const SYSTEM_PROMPT = `You are a senior film critic writing a single spoiler-free review in MDX for ${siteConfig.audience}.

You did NOT watch the film yourself. You are synthesizing the CRITICAL CONSENSUS from the supplied critic coverage, plus the verified facts. Be transparent, fair, and specific.

Your output MUST be a valid JSON object with exactly these fields — nothing else, no prose, no code fences:
{
  "title": string,        // 40-70 chars, includes the film's title and the word "Review"
  "description": string,  // SEO meta description, 1-2 sentences, at most 150 chars
  "slug": string,         // kebab-case, <= 60 chars
  "tags": string[],       // 2-6 lowercase tags (include genre + key names where relevant)
  "verdict": string,      // ONE spoiler-free sentence, <= 140 chars — the bottom line
  "score": number,        // integer 0-100, derived from the AGGREGATE critic sentiment in the research
  "body": string          // MDX body (see structure below)
}

BODY STRUCTURE (mandatory, in this order):

1. Opening paragraph (3-5 sentences), spoiler-free: the film, the gist of the critical consensus, and the bottom line. No heading.

2. <Callout type="takeaway"> … </Callout> — the verdict in one sentence (may mirror the "verdict" field).

3. ## The premise
   Two or three short, SPOILER-FREE paragraphs of setup, grounded in the supplied overview and facts.

4. ## What the critics say
   Synthesize the critical consensus ACROSS the supplied reviews — points of agreement and disagreement. Refer to outlets/critics in general terms ("several critics", "reviewers at major outlets"). Do NOT fabricate quotes.

5. <ProsCons>
     <Pros><li>…</li><li>…</li><li>…</li></Pros>
     <Cons><li>…</li><li>…</li><li>…</li></Cons>
   </ProsCons>
   Strengths and weaknesses drawn from the consensus (3+ each).

6. ## Should you watch it?
   Who the film is for, and the recommendation. Practical, honest.

7. <Callout type="warning"> … </Callout> — ONLY for genuine content warnings or caveats (intense content, franchise prerequisites). Omit otherwise.

8. ## FAQ
   <FAQ>
     <Question q="…">Answer.</Question>
     <Question q="…">Answer.</Question>
     <Question q="…">Answer.</Question>
   </FAQ>
   Exactly 3 real questions a reader would ask (e.g. is it worth seeing in theaters, do I need to see the prior films, is it kid-friendly).

HARD RULES:
- Keep it SPOILER-FREE. Do not reveal twists or the ending.
- The score must reflect the AGGREGATE critic sentiment in the supplied research, not a personal opinion.
- Never contradict the verified facts (cast, director, runtime, release date, genres).
- Never invent quotes, names, numbers, or box-office figures not present in the research.
- Do not claim you watched the film. Frame as synthesized critical consensus.
- No emoji. American English. Do not wrap the JSON in markdown code fences.`;

export async function generateReview(
  film: FilmFacts,
  critique: FilmCritique
): Promise<GeneratedPost> {
  const key = process.env[LLM_KEY_ENV];
  if (!key) throw new Error(`${LLM_KEY_ENV} not set`);

  const baseUserPrompt = buildUserPrompt(film, critique);
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const userPrompt =
      attempt === 1
        ? baseUserPrompt
        : `${baseUserPrompt}\n\nYour previous response was rejected: ${lastError}\nReturn a corrected JSON object that satisfies every constraint exactly.`;

    let content: string;
    try {
      content = await callLlm(key, SYSTEM_PROMPT, userPrompt);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      lastError = 'response was not valid JSON';
      continue;
    }

    const result = ReviewSchema.safeParse(parsed);
    if (result.success) {
      return finalize(result.data, film, critique);
    }
    lastError = result.error.issues
      .map((i) => `${i.path.join('.') || 'root'} — ${i.message}`)
      .join('; ');
  }

  throw new Error(
    `Review generation failed validation after ${MAX_GENERATION_ATTEMPTS} attempts: ${lastError}`
  );
}

function finalize(
  validated: z.infer<typeof ReviewSchema>,
  film: FilmFacts,
  critique: FilmCritique
): GeneratedPost {
  const sources = [
    ...critique.articles.map((a) => ({ title: a.title, url: a.url })),
    { title: `${film.title} — TMDB`, url: film.tmdbUrl },
  ];

  const yearSuffix = film.year ? ` (${film.year})` : '';

  return {
    slug: validated.slug,
    title: validated.title,
    description: validated.description,
    tags: validated.tags,
    category: 'reviews',
    // Hero uses the TMDB backdrop (wide) when available, else the poster.
    heroImage: {
      url: film.backdropUrl ?? film.posterUrl ?? '',
      alt: `${film.title}${yearSuffix}`,
      credit: 'The Movie Database (TMDB)',
      creditUrl: film.tmdbUrl,
    },
    body: validated.body,
    sources,
    type: 'review',
    film,
    rating: { score: validated.score },
    verdict: validated.verdict,
    watchOn: film.watchProviders,
  };
}

function buildUserPrompt(film: FilmFacts, critique: FilmCritique): string {
  const facts = [
    `Title: ${film.title}`,
    film.year ? `Year: ${film.year}` : '',
    film.director ? `Director: ${film.director}` : '',
    film.cast.length ? `Cast: ${film.cast.join(', ')}` : '',
    film.genres.length ? `Genres: ${film.genres.join(', ')}` : '',
    film.runtimeMin ? `Runtime: ${film.runtimeMin} min` : '',
    film.releaseDate ? `Release date: ${film.releaseDate}` : '',
    film.watchProviders.length ? `Watch on: ${film.watchProviders.join(', ')}` : '',
    film.overview ? `Overview: ${film.overview}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const critiqueBlock = critique.articles.length
    ? critique.articles
        .map((a, i) => `### Review ${i + 1}: ${a.title}\nURL: ${a.url}\n${a.content.slice(0, 3500)}`)
        .join('\n\n')
    : '(No critic articles were scrapable. Base the consensus only on the verified facts and overview above, and keep the score appropriately tentative.)';

  return `# Film (verified facts — do NOT contradict)
${facts}

## Critic coverage (synthesize the consensus; do not quote verbatim or invent quotes)
${critiqueBlock}

Produce the JSON object now.`;
}
