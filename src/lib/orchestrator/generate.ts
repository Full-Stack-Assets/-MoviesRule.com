import { z } from 'zod';
import type { ResearchBundle, GeneratedPost } from './types';
import { siteConfig } from '@/site.config';
import { mdxCompileError } from './mdx-validate';

type LlmProvider = { endpoint: string; model: string; apiKeyEnv: string; maxTokens?: number };

// Primary writer model plus an ordered chain of backup providers, walked
// front-to-back as providers error out. Configured as `llmFallbacks` in
// site.config.ts (the older single `llmFallback` shape still works); entries
// whose API key isn't set are skipped.
const PRIMARY_LLM: LlmProvider = siteConfig.llm;
const FALLBACK_LLMS: LlmProvider[] = (() => {
  const cfg = siteConfig as { llmFallbacks?: readonly LlmProvider[]; llmFallback?: LlmProvider };
  return [...(cfg.llmFallbacks ?? (cfg.llmFallback ? [cfg.llmFallback] : []))];
})();

/** A transient provider error worth failing over to the next LLM for.
 *  Includes 413 / "request too large": Groq admits a request against the
 *  per-minute token budget up front, so an over-budget request on the primary
 *  (8K TPM free tier) is rejected outright — but fits the fallbacks' 30K TPM. */
export function isAvailabilityError(msg: string): boolean {
  return (
    /API error (?:413|429|5\d\d)\b/.test(msg) ||
    /overloaded|unavailable|high demand|too large/i.test(msg)
  );
}

/** A non-transient client error that repeating the same request against the
 *  same model cannot fix — Groq's json_object validation rejecting the
 *  generation, or a model that no longer exists. Worth moving down the chain
 *  immediately instead of burning every remaining attempt on it. */
export function isHardProviderError(msg: string): boolean {
  return (
    /API error 40[04]\b/.test(msg) &&
    /json_validate_failed|failed to generate json|model_decommissioned|model_not_found|does not exist/i.test(
      msg
    )
  );
}

/** A daily-quota (tokens-per-day) rate limit. Groq's "try again in 1h18m"
 *  cannot succeed within this run, so once the whole chain has hit TPD there
 *  is nothing left to retry. Per-minute limits, by contrast, do recover
 *  between backoff sleeps and don't match here. */
export function isDailyQuotaError(msg: string): boolean {
  return /API error 429\b/.test(msg) && /\(TPD\)|per day/i.test(msg);
}

/** How many times to ask a model before giving up on a structurally valid
 *  post. Each hop down the failover chain also consumes an attempt, so this
 *  leaves several real tries even after walking a chain of three fallbacks. */
const MAX_GENERATION_ATTEMPTS = 7;

/** Pause helper for backing off between retries. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Collapse whitespace and truncate to at most `max` chars at a word boundary,
 * appending an ellipsis. Used as a schema transform so an over-long field is
 * healed in place instead of throwing — the LLM reliably overshoots length
 * caps, and one overshoot must never kill the run after research has succeeded.
 */
export function clampMeta(s: string, max = 200): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > 0 ? cut.slice(0, sp) : cut).trimEnd() + '…';
}

/** Coerce any string into a kebab-case slug matching /^[a-z0-9-]+$/. */
export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Lowercase, trim, drop blanks/duplicates, and cap at 6. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && !seen.has(t) && (seen.add(t), true))
    .slice(0, 6);
}

// Self-healing contract. Length/shape overshoots that can be safely coerced are
// repaired by transforms (so a too-long description or a messy slug never throws
// — note `.max()` would fire *before* a transform, so it's deliberately gone).
// Constraints that can't be met without inventing content (a too-short body, or
// fewer than two real tags) still fail and drive a retry rather than be faked.
export const PostSchema = z.object({
  title: z.string().min(20).transform((s) => clampMeta(s, 120)),
  description: z.string().min(1).transform((s) => clampMeta(s)),
  slug: z.string().transform(slugify).pipe(z.string().regex(/^[a-z0-9-]+$/)),
  category: z.string().transform((s) => s.trim().toLowerCase()),
  tags: z
    .array(z.string())
    .transform(normalizeTags)
    .pipe(z.array(z.string()).min(2).max(6)),
  body: z.string().min(800),
});

const SYSTEM_PROMPT = `You are a senior writer producing a single blog post in MDX format for ${siteConfig.audience}.

Your output MUST be a valid JSON object with exactly these fields — nothing else, no prose, no code fences:
{
  "title": string,                // 60-100 chars, specific and concrete, no clickbait
  "description": string,          // SEO meta description, 1-2 sentences, at most 150 chars
  "slug": string,                 // kebab-case, <= 60 chars
  "category": string,             // one of: ${siteConfig.categories.map((c) => `"${c}"`).join(', ')}
  "tags": string[],               // 2-6 lowercase tags
  "body": string                  // MDX body (see structural rules below)
}

BODY STRUCTURE (mandatory, in this order):

1. Opening paragraph (3-5 sentences) — hook + what happened + why it matters. No heading.

2. <Callout type="takeaway"> … </Callout> — a single sentence synthesizing the core point.

3. ## What happened
   Two or three tight paragraphs of factual reporting from the research.

4. ## Why it matters
   Analysis — stakes, implications, who's affected.

5. <ProsCons>
     <Pros>
       <li>…</li>
       <li>…</li>
       <li>…</li>
     </Pros>
     <Cons>
       <li>…</li>
       <li>…</li>
       <li>…</li>
     </Cons>
   </ProsCons>

6. ## How to think about it
   Practical guidance or a framework. Prose only.

7. <Callout type="warning"> … </Callout> — IF there are meaningful caveats, risks, or things the reader should NOT do. Omit this block if nothing warrants a warning.

8. ## FAQ
   <FAQ>
     <Question q="…">Answer paragraph.</Question>
     <Question q="…">Answer paragraph.</Question>
     <Question q="…">Answer paragraph.</Question>
   </FAQ>
   Exactly 3 questions, each a real question a reader would ask.

HARD RULES:
- The ONLY JSX components allowed in the body are <Callout>, <ProsCons>, <Pros>, <Cons>, <FAQ>, and <Question> (plus plain <li> items). Never invent other tags — e.g. FAQ answers are plain text inside <Question>, NOT wrapped in an <Answer> tag.
- Write the SEO meta description as 1-2 sentences, at most 150 characters. Do not exceed 150 characters.
- Never invent quotes or attribute statements to people.
- Never invent specific numbers. If you cite a number, it must appear in the research.
- Do not paraphrase any single source closely — synthesize across sources.
- No filler like "in today's fast-paced world" or "in conclusion".
- No emoji.
- American English.
- Do not wrap the JSON in markdown code fences.`;

export interface GenerateOptions {
  /** Guidance embedded in the prompt: the approximate word count to aim for
   *  (e.g. for a long-form/double-length feature). Omit for the standard body. */
  targetWords?: number;
  /** Runtime floor for the body's character count, overriding PostSchema's
   *  default min(800) for this call only — lets a long-form batch enforce a
   *  meaningfully longer body without changing the standard contract used by
   *  the hourly pipeline and the regular seed runner. */
  minBodyChars?: number;
}

export async function generate(
  bundle: ResearchBundle,
  opts: GenerateOptions = {}
): Promise<GeneratedPost> {
  const primaryKey = process.env[PRIMARY_LLM.apiKeyEnv];
  if (!primaryKey) throw new Error(`${PRIMARY_LLM.apiKeyEnv} not set`);

  // The failover chain: primary first, then every configured fallback whose
  // key is present. Provider errors advance `chainIdx`; it never moves back.
  const chain: Array<{ provider: LlmProvider; key: string }> = [
    { provider: PRIMARY_LLM, key: primaryKey },
    ...FALLBACK_LLMS.flatMap((p) => {
      const key = (process.env[p.apiKeyEnv] ?? '').trim();
      return key ? [{ provider: p, key }] : [];
    }),
  ];
  let chainIdx = 0;

  const baseUserPrompt = buildUserPrompt(bundle, opts.targetWords);
  const schema = opts.minBodyChars
    ? PostSchema.extend({ body: z.string().min(opts.minBodyChars) })
    : PostSchema;
  let lastError = '';

  // PostSchema heals the clampable overshoots on its own. Retry only covers the
  // genuinely unrepairable misses (too-short body, too-few tags, malformed JSON)
  // and transient LLM errors, feeding the exact reason back so the model can
  // correct itself. Only fail loudly after exhausting attempts.
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const userPrompt =
      attempt === 1
        ? baseUserPrompt
        : `${baseUserPrompt}\n\nYour previous response was rejected: ${lastError}\nReturn a corrected JSON object that satisfies every constraint exactly.`;

    const { provider, key: providerKey } = chain[chainIdx];

    let content: string;
    try {
      content = await callLlm(provider, providerKey, SYSTEM_PROMPT, userPrompt);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // Availability blips (rate limit / 5xx / over-budget) and hard client
      // errors (json_validate_failed, decommissioned model) both advance to
      // the next provider in the chain — the former because it's saturated,
      // the latter because replaying the same request at it cannot succeed.
      if (chainIdx < chain.length - 1 && (isAvailabilityError(lastError) || isHardProviderError(lastError))) {
        chainIdx += 1;
        console.warn(
          `generate: ${provider.model} errored (${lastError.slice(0, 120)}) — failing over to ${chain[chainIdx].provider.model}`
        );
        continue;
      }
      // End of the chain on a daily-quota limit: no amount of in-run retrying
      // gets tokens back before tomorrow, so fail fast instead of sleeping
      // through the remaining attempts.
      if (chainIdx === chain.length - 1 && isDailyQuotaError(lastError)) {
        break;
      }
      if (attempt < MAX_GENERATION_ATTEMPTS) {
        await sleep(Math.min(30_000, 1000 * 2 ** attempt));
      }
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      lastError = 'response was not valid JSON';
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) {
      // Structurally valid — but a malformed component tag (e.g. `<P rosCons>`)
      // can still pass the schema and then break the production build the moment
      // Next prerenders the page. Compile the body through the site's own MDX
      // pipeline; on failure, retry with the compiler error fed back so a body
      // that won't render never reaches commit.
      const compileErr = await mdxCompileError(result.data.body);
      if (!compileErr) {
        return finalize(result.data, bundle);
      }
      lastError = `body is not valid MDX and will not render: ${compileErr}`;
      continue;
    }
    lastError = result.error.issues
      .map((i) => `${i.path.join('.') || 'root'} — ${i.message}`)
      .join('; ');
  }

  throw new Error(
    `LLM output failed validation after ${MAX_GENERATION_ATTEMPTS} attempts: ${lastError}`
  );
}

export async function callLlm(
  provider: LlmProvider,
  key: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.5,
      // Groq counts input + requested output against the free-tier TPM budget
      // at admission (8K/min on the primary model). The 3584 default keeps
      // prompt + output inside a single-minute budget; a bigger ask gets the
      // whole request rejected as 413 "request too large" before the model
      // ever runs. Providers with more TPM headroom raise it via `maxTokens`
      // so long completions aren't truncated mid-JSON.
      max_tokens: provider.maxTokens ?? 3584,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API error ${res.status}: ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return json.choices[0]?.message?.content ?? '';
}

function finalize(validated: z.infer<typeof PostSchema>, bundle: ResearchBundle): GeneratedPost {
  const sources = [
    { title: bundle.winner.title, url: bundle.winner.url },
    ...bundle.articles.map((a) => ({ title: a.title, url: a.url })),
    ...bundle.transcripts.map((t) => ({
      title: `${t.title} (video)`,
      url: `https://www.youtube.com/watch?v=${t.videoId}`,
    })),
  ];

  return {
    ...validated,
    heroImage: { url: '', alt: '', credit: '', creditUrl: '' }, // populated by image stage
    sources,
  };
}

function buildUserPrompt(bundle: ResearchBundle, targetWords?: number): string {
  const { winner, articles, transcripts, related } = bundle;

  const lengthBlock = targetWords
    ? `\n\n## Length requirement\nThis is a long-form, in-depth feature — write a substantially longer and more detailed body than usual. Target approximately ${targetWords} words total (roughly double the normal length): go deeper in "What happened" and "Why it matters", broaden the pros/cons with more items, and make "How to think about it" more thorough with concrete detail. Do not pad with repetition, filler, or invented content — every added sentence must be substantive and grounded in the research provided.`
    : '';

  const articleBlock = articles
    .map(
      (a, i) => `### Source ${i + 1}: ${a.title}
URL: ${a.url}
${a.content.slice(0, 2400)}`
    )
    .join('\n\n');

  const transcriptBlock = transcripts.length
    ? '\n\n## Video transcripts\n' +
      transcripts
        .map((t) => `### ${t.title}\n${t.text.slice(0, 1600)}`)
        .join('\n\n')
    : '';

  const relatedBlock = related.length
    ? '\n\n## Related headlines (for context only, do not quote)\n' +
      related.map((r) => `- ${r.title} (${r.source})`).join('\n')
    : '';

  return `# Topic
**Winner headline**: ${winner.title}
**Source**: ${winner.source}
**URL**: ${winner.url}
**Published**: ${winner.publishedAt}

## Primary research
${articleBlock}
${transcriptBlock}
${relatedBlock}
${lengthBlock}

Produce the JSON object now.`;
}
