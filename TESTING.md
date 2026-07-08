# Testing & CI

This repo has a fast unit suite (Vitest) and a CI quality gate (GitHub Actions).
Together they catch the classes of failure that have reached production before —
a broken merge, a malformed MDX post, a type error — *before* they hit a deploy.

## Commands

```bash
npm test               # run the unit suite once (vitest run)
npm run test:watch     # watch mode while developing
npm run test:coverage  # suite + V8 coverage report (./coverage)
npm run typecheck      # tsc --noEmit over the app (tsconfig.json)
npm run typecheck:test # tsc over the tests (tsconfig.test.json)
npm run lint           # next lint (ESLint, next/core-web-vitals)
```

## Layout

- Tests live in **`tests/unit/`** as `*.test.ts`. They're excluded from the Next
  production build (`tsconfig.json` `exclude`) so test tooling can never break a
  deploy; they're type-checked separately via `tsconfig.test.json`.
- **`vitest.config.ts`** mirrors the `@/` and `@/content/` path aliases from
  `tsconfig.json`, so tests import modules exactly as app code does.
- The suite is **`node` environment** and covers **pure logic only** — no React
  rendering — which keeps it fast (<3s) and dependency-light.

## What's covered

The suite targets the pipeline's load-bearing contracts (the invariants that,
when broken, silently corrupt output or break the build):

| Area | File | Guards |
|---|---|---|
| Scoring / dedupe | `score.test.ts` | composite score axes, 24h recency half-life, source weighting, title-signature collision, `pickWinner` vs topic log |
| Schema self-healing | `generate-schema.test.ts` | `clampMeta`/`slugify`/`normalizeTags`; `PostSchema` heals over-long fields but *retries* on unrepairable misses |
| MDX build guard | `mdx-validate.test.ts` | the `<P rosCons>`/unclosed-tag corruptions that caused two prod outages are rejected; valid bodies compile |
| Affiliate rails | `affiliate.test.ts` | which posts get a rail (`watchContextFor`), provider/JustWatch/Amazon link building, env-gated earning links |
| Structured data | `structured-data.test.ts` | FAQ extraction, `Movie`/`FAQPage`/`BlogPosting` JSON-LD, score→rating mapping |
| Serialization | `serialize.test.ts` | YAML frontmatter, review vs news back-compat, `<Question>` quote sanitization |
| Reviews | `reviews.test.ts` | score→stars rounding, verdict-band labels |
| Syndication | `syndicate.test.ts` | microblog composition + truncation within the char ceiling |
| Posts | `posts.test.ts` | `relatedPosts` ranking (shared tags → category → recency), `isReview` |

## Adding tests

Co-locate a new `tests/unit/<module>.test.ts`, import from `@/...`, and prefer
testing **pure exported functions** — the pipeline is deliberately built as
independently-testable stages that return data rather than throw. When adding a
pipeline stage or a schema/contract change, add a test that pins the invariant.

## CI

`.github/workflows/ci.yml` runs on every PR and every push to `main`
(content-, docs-, and markdown-only pushes are skipped): **typecheck (app) →
typecheck (tests) → lint → unit tests → production build**. The build step is the
final gate — it's the same `next build` that runs the MDX-compile and prerender
checks. Content commits from the hourly pipeline skip CI because they carry no
code and the generation pipeline already runs the MDX-compile guard pre-commit.
