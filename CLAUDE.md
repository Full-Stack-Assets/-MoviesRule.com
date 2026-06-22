# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

A **self-hosted, zero-cost auto-blog engine**. A scheduled job runs every hour,
pulls candidate stories from seven sources, scores them, researches the winner,
asks an LLM to write a structured MDX post under a strict contract, and commits
it to GitHub. A Next.js site renders the committed posts and auto-deploys.

This particular deployment is **Movies Rule** (`moviesrule.com`) — a movies /
streaming niche site. The engine itself is generic: everything niche-specific
lives in **`src/site.config.ts`**. A few internal identifiers still carry the
upstream template name `trendblog` — see [Template defaults](#template-defaults).

**Cost at steady state: $0** — runs entirely on free tiers (Gemini, Brave,
Pexels, GitHub Actions, Vercel/Cloudflare).

## Tech stack

- **Next.js 15** (App Router, React 19, RSC) — the site
- **TypeScript** throughout, **Tailwind CSS** for styling
- **TinaCMS** — optional in-browser editor (`/admin`)
- **next-mdx-remote** — renders MDX post bodies with custom components
- **Gemini** (default LLM, OpenAI-compatible endpoint) — the writer
- **Octokit** (`@octokit/rest`) — commits posts via the GitHub Contents API
- **Zod** — validates the LLM's JSON output against a self-healing schema
- **tsx** — runs the pipeline scripts directly from TypeScript

> Note: the project ships a `package-lock.json` and CI uses `npm ci`. **Use
> `npm`** here, not pnpm/yarn.

## Commands

```bash
npm install              # install deps
npm run dev              # TinaCMS + Next dev server at http://localhost:3000
npm run build            # scripts/build.sh — conditional Tina build, then next build
npm start                # serve the production build
npm run lint             # next lint (eslint)

npm run generate         # run the pipeline, write MDX to content/posts/ (no commit)
npm run generate -- --dry # dry run: print the generated MDX, write nothing
npm run digest           # send the newsletter digest (scripts/newsletter-digest.ts)
```

There is currently **no test runner**. `scripts/smoke-test.ts` exists but has no
npm script wired to it; run it with `npx tsx scripts/smoke-test.ts` if needed.

The local runner (`scripts/run-local.ts`) always invokes the pipeline in
`dryRun: true` mode and writes to disk itself — it never commits via GitHub. The
GitHub Action (not the script) commits and pushes.

## Architecture

### The generation pipeline (`src/lib/orchestrator/`)

The pipeline is a sequence of independently-testable stages wired together by
`pipeline.ts → runPipeline()`. Each stage has per-stage timing and graceful
fallbacks — a flaky source or scrape never kills the run.

```
sources/*  →  score  →  dedupe  →  pickWinner  →  research  →  generate  →  pickImage  →  serialize  →  commit
(7 sources)   (score.ts)          (vs topic-log)  (research.ts) (generate.ts) (image.ts)   (serialize.ts) (github.ts)
```

| Stage | File | Responsibility |
|---|---|---|
| Gather | `src/lib/sources/*.ts` | Each exports a `fetch*()` returning `RawItem[]`. All run in parallel via `Promise.all`; each `.catch()`es to `[]`. |
| Score | `score.ts` | `score = 0.5·popularity + 0.2·engagement + 0.3·recency`. Popularity is log-scaled upvotes, source-weighted; recency is exponential decay (24h half-life). |
| Dedupe | `score.ts` | `signature()` = sorted-token hash of the title, so reworded headlines collapse together. |
| Pick winner | `score.ts → pickWinner` | Highest scorer whose signature isn't already in the topic log. |
| Research | `research.ts` | Scrapes the winner URL + Brave results (Cheerio) and YouTube transcripts. |
| Generate | `generate.ts` | Calls the LLM with the strict system prompt; validates with `PostSchema`; retries up to 3×. |
| Image | `image.ts` | Picks a hero image (Pexels / Openverse / none per `site.config`). |
| Serialize | `serialize.ts` | Renders `GeneratedPost` → MDX file with YAML frontmatter; sanitizes quotes. |
| Commit | `github.ts` | `commitPost` writes the MDX, `saveTopicLog` appends to `content/.topic-log.json` (capped 500). |

Core types live in `src/lib/orchestrator/types.ts`: `RawItem`, `ScoredItem`,
`ResearchBundle`, `GeneratedPost`, `TopicLog`.

### The site (`src/app/`, Next App Router)

- `page.tsx` — homepage (latest posts) · `blog/[slug]/page.tsx` — post page
- `categories/[category]`, `tags/[tag]` — taxonomy listings
- `about`, `stats`, `vaporloop` — static-ish pages
- `api/cron/generate/route.ts` — auth'd (`Bearer $CRON_SECRET`) HTTP trigger for
  the pipeline; `nodejs` runtime, `maxDuration` 300s
- `api/subscribe/route.ts` — newsletter signup
- `feed.xml`, `sitemap.ts`, `robots.ts`, `ads.txt` — generated endpoints
- `globals.css` — holds the `.prose-editorial` typography that styles post bodies

`src/lib/posts.ts` reads MDX from `content/posts/` with `gray-matter`. Key
behaviors to preserve:
- **Scheduled publishing**: a post whose `date` is in the future is hidden from
  every listing AND returns 404 on direct URL until its time arrives.
- `relatedPosts()` ranks by shared tags → same category → recency.

### MDX components (`src/components/mdx/index.tsx`)

Post bodies may only use these components (also declared in the Tina schema):
`Callout` (type `takeaway|warning|note`), `ProsCons`, `Pros`, `Cons`, `FAQ`,
`Question` (`q="..."` prop). If you add a component, register it in **both**
`mdxComponents` and `tina/config.ts`.

## The MDX contract

Every generated post follows this exact structure, enforced by `SYSTEM_PROMPT`
in `generate.ts` and validated by `PostSchema` (Zod):

1. Lead paragraph (3–5 sentences, no heading)
2. `<Callout type="takeaway">` — one-sentence synthesis
3. `## What happened`
4. `## Why it matters`
5. `<ProsCons>` with `<Pros>`/`<Cons>`, 3+ `<li>` each
6. `## How to think about it`
7. `<Callout type="warning">` — *optional*, only when warranted
8. `## FAQ` with exactly 3 `<Question>` entries

`PostSchema` is deliberately **self-healing**: over-long fields (title,
description, slug) are repaired by Zod `.transform()`s (`clampMeta`, `slugify`,
`normalizeTags`) rather than thrown — there is no `.max()` before a transform.
Only genuinely unrepairable misses (body < 800 chars, < 2 tags, malformed JSON)
trigger a retry with the exact error fed back to the model. Keep this pattern if
you touch the schema: heal what's safe, retry on what isn't, never fake content.

## Frontmatter shape

Defined by `PostFrontmatter` in `src/lib/posts.ts` and emitted by `serialize.ts`:

```yaml
title, description, date (ISO), category, tags[]
hero: { url, alt, credit, creditUrl }
sources: [{ title, url }]
```

## Configuration

### `src/site.config.ts` — the one file to change per niche

Branding (`name`, `tagline`, `description`, `url`, `footerNote`), `audience`
(goes into the writer's prompt), `categories` + `navCategories`, niche `sources`
(`subreddits`, `rssFeeds`, `braveQueries`, `trendsKeywords`), `adsenseClient`,
the `llm` block (endpoint/model/`apiKeyEnv` — defaults to Gemini), and
`imageProvider`. See `CREATE-A-SITE.md` for the full spin-up walkthrough.

Things wired to read from this config (don't hard-code these): `reddit.ts`,
`rss.ts`, `bravenews.ts`, and `googletrends.ts` (niche keyword filter) read their
`sources`; `tina/config.ts` derives its category dropdown from `categories`; the
site chrome, feed, sitemap, robots, and structured-data read `name`/`url`/
`description` via `SITE_NAME`/`SITE_URL`/`SITE_DESCRIPTION` in
`src/lib/structured-data.ts`.

### Environment variables

See `.env.example` for the full annotated list. Highlights:
- **LLM key** — name must match `llm.apiKeyEnv` in `site.config.ts`
  (`GEMINI_API_KEY` by default).
- `BRAVE_API_KEY`, `PEXELS_API_KEY`, `REDDIT_CLIENT_ID/SECRET` — optional;
  any unset source/provider is skipped.
- `GITHUB_TOKEN` / `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` — for the
  Action's commit path.
- `CRON_SECRET` — guards `/api/cron/generate`.
- Optional: syndication (`BLUESKY_*`, `MASTODON_*`, `DEVTO_API_KEY`), newsletter
  (`BUTTONDOWN_API_KEY`), AdSense (`NEXT_PUBLIC_ADSENSE_*`).

**Never commit real secrets.** `.env.local` is gitignored; `.env.example` holds
placeholders only. See `SECURITY_REMEDIATION.md` for history/context.

## Scheduling & deploy

- **`.github/workflows/generate.yml`** is the scheduler — `cron: '0 * * * *'`
  (hourly) plus a manual `workflow_dispatch` button. It runs
  `npx tsx scripts/run-local.ts`, then commits/pushes any new post under
  `content/`. It rebases-and-retries on push (up to 5×) and uses a `union` merge
  driver for `content/.topic-log.json` (registered via `.gitattributes` +
  `scripts/merge-topic-log.mjs`) so concurrent runs don't conflict.
- **`.github/workflows/newsletter.yml`** — periodic digest send.
- **Hosting**: Vercel (auto-deploys on each push) or Cloudflare Pages as a static
  host. Do **not** run the pipeline inside a Cloudflare Pages Function (~30s CPU
  limit; the pipeline takes 30–90s). Let the Action generate.
- The Vercel cron route exists but Vercel Hobby caps crons at once/day, which is
  why scheduling lives in GitHub Actions for the $0 path.

## Template defaults

This is an instance of a generic auto-blog template, customized for Movies Rule.
**Source of truth for branding/niche is `src/site.config.ts`** — read from
`siteConfig` (or `SITE_NAME`/`SITE_URL` in `structured-data.ts`) rather than
hard-coding strings. The old "Wire and Logic" brand and tech-niche copy have been
cleaned out of the site, sources, and docs.

A few **internal** identifiers still use the upstream engine name `trendblog` and
are intentionally left (they're not user-facing): the `trendblog-bot` git commit
identity in `.github/workflows/generate.yml`, the Reddit/scraper user-agent
strings in `src/lib/sources/reddit.ts` and `src/lib/orchestrator/research.ts`,
and the `TrendBlogBot` UA in `googletrends.ts`. `SECURITY_REMEDIATION.md` is a
historical incident record and references the original stack on purpose.

## Conventions

- Stages return data, never throw past their boundary — wrap fallible work and
  degrade gracefully (the pipeline must survive a dead source/scrape).
- Use the `@/` path alias (`@/lib/...`, `@/site.config`) — configured in
  `tsconfig.json`.
- Match the surrounding code's style; comments explain *why*, not *what*.
- Posts are content, not code — the pipeline owns `content/posts/*.mdx`. Hand-edit
  only for corrections; the seed post is the one deliberately human-written file.

## Working in this repo (agents)

- Active feature branch: **`claude/claude-md-docs-kmo0tc`**. Develop, commit, and
  push there. Do not push to `main` without explicit permission, and do not open
  a PR unless asked.
- GitHub operations go through the `mcp__github__*` tools (no `gh` CLI here);
  scope is limited to `full-stack-assets/-moviesrule.com`.
- Before extending the pipeline: add a source by dropping a `fetch*()` in
  `src/lib/sources/` and wiring it into `Promise.all` in `pipeline.ts`; tune tone
  via `SYSTEM_PROMPT` in `generate.ts`; change cadence via the cron in
  `generate.yml`.
