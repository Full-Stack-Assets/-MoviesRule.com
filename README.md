# Movies Rule

A self-hosted, zero-cost movie & streaming blog. A scheduled job runs every
hour, picks the highest-signal story from seven sources, researches it, writes a
structured MDX post, and commits it to GitHub. The Next.js site auto-deploys.

**Live:** [moviesrule.com](https://moviesrule.com) — film news, reviews, and
what's worth streaming.

**Stack:** Next.js 15 · TinaCMS · Groq (free tier) · Brave Search ·
Pexels · GitHub Contents API · Vercel.

**Monthly cost at steady state:** $0.

> Movies Rule runs on a generic auto-blog engine. Everything that makes it a
> *movies* site lives in [`src/site.config.ts`](src/site.config.ts) — point the
> same engine at a different niche by editing that one file (see
> [`CREATE-A-SITE.md`](CREATE-A-SITE.md)).

---

## How it works

```
 ┌─ Reddit ──┐
 │ HN        │
 │ DEV.to    │──▶ score ──▶ dedup ──▶ winner ──▶ research ──▶ LLM ──▶ MDX ──▶ git commit ──▶ deploy
 │ RSS       │   (pop + engagement + recency)    (Brave + scrape   (strict JSON
 │ YouTube   │                                    + YT transcripts) contract)
 │ Brave     │
 └─ Trends ──┘
```

Each stage is its own module in `src/lib/orchestrator/` and can be tested
independently. The `pipeline.ts` runner wires them together with per-stage
timings and graceful fallbacks — a flaky source doesn't kill the run.

The niche is set in `src/site.config.ts`: which `subreddits`, `rssFeeds`,
`braveQueries`, and `trendsKeywords` the pipeline pulls from. For Movies Rule
that's the movie subreddits (r/movies, r/boxoffice, r/television…), trade RSS
feeds (Variety, THR, Collider, IndieWire, /Film), and movie/streaming search
queries.

---

## Setup

### 1. Prereqs

- Node 20+
- npm (this repo ships a `package-lock.json`; CI uses `npm ci`)
- A GitHub repo to commit posts into (can be this same repo)

### 2. Install

```bash
npm install
cp .env.example .env.local
```

### 3. Get the free API keys

| Key | Where | Free tier |
|---|---|---|
| `GROQ_API_KEY` | https://console.groq.com/keys | generous free tier on `llama-3.3-70b-versatile` |
| `BRAVE_API_KEY` | https://api.search.brave.com/app/keys | 2,000 queries/month on the free plan |
| `PEXELS_API_KEY` | https://www.pexels.com/api/new/ | Unlimited for dev use |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | reddit.com → prefs → apps (create a "script" app) | Free |
| `GITHUB_TOKEN` | github.com → Settings → Developer settings → Fine-grained PAT | Scope: **Contents: Read/Write** on the blog repo only |
| `CRON_SECRET` | `openssl rand -hex 32` | — |

The writer LLM defaults to **Groq** (`llama-3.3-70b-versatile`, with an
automatic `llama-3.1-8b-instant` fallback on the same key). To switch to
OpenRouter, change the `llm` block in `src/site.config.ts` and set the matching
key (`OPENROUTER_API_KEY`). Brave, Pexels, and Reddit are optional
— any unset source is skipped (`imageProvider: 'openverse'` needs no image key).

Fill the keys into `.env.local` along with `GITHUB_OWNER` / `GITHUB_REPO` /
`GITHUB_BRANCH`.

### 4. Test locally

```bash
# Dry run — prints the generated post, doesn't write anything
npm run generate -- --dry

# Real run — writes MDX to content/posts/ and updates content/.topic-log.json
npm run generate

# Start the dev server (Next + TinaCMS)
npm run dev
```

Open http://localhost:3000. The seed post is visible out of the box; new posts
show up as soon as `npm run generate` writes them.

---

## Monetization

Every revenue surface is config/env-gated and renders nothing until you supply
the corresponding id — the site works ad- and affiliate-free out of the box.

- **AdSense** — set the publisher id (`adsenseClient` in `src/site.config.ts`,
  overridable via `NEXT_PUBLIC_ADSENSE_CLIENT`). That loads the script, serves
  `/ads.txt`, and enables Auto Ads. For manual placements, create ad units in
  AdSense and set the `NEXT_PUBLIC_ADSENSE_SLOT_*` ids (see `.env.example`):
  two in-article units at the post's section seams, one after the body, one on
  the homepage listing, one in the footer. Units are lazy-initialized (they
  don't request an ad until scrolled near the viewport).
- **Affiliate** — set `NEXT_PUBLIC_AMAZON_ASSOC_TAG` (Amazon Associates) to
  enable tagged "Rent or buy on Amazon" and "Own it on Blu-ray / 4K" links in
  the "Where to watch" rail on film posts, and optionally
  `NEXT_PUBLIC_VPN_AFFILIATE_URL`/`_NAME` for a region-unlock CTA. Earning
  links carry `rel="sponsored nofollow"` and a disclosure appears automatically
  whenever one is shown. Never commit real ids — these are env vars.
- **Newsletter** — set `BUTTONDOWN_API_KEY` to activate the subscribe endpoint;
  capture forms render in the footer site-wide and inline at the end of every
  article.

---

## Deploy

### Scheduling — GitHub Actions (the hourly tick)

The hourly schedule lives in **`.github/workflows/generate.yml`**, which runs at
the top of every hour (`cron: '0 * * * *'`), executes the pipeline with
`npx tsx scripts/run-local.ts`, and commits any new post straight to the repo.
No serverless CPU limits, free logs, and the push triggers your host to
redeploy. This is the scheduler — your host below just serves the site.

Add the pipeline secrets (`GROQ_API_KEY`, `BRAVE_API_KEY`, `PEXELS_API_KEY`,
`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`) under **Settings → Secrets and
variables → Actions**. The workflow has `contents: write` and a `concurrency`
group so a slow run never overlaps the next tick. Use the **Run workflow** button
(`workflow_dispatch`) to trigger a one-off run.

> **Why not a Vercel cron?** Vercel's Hobby (free) plan caps cron jobs at **once
> per day**, so an hourly tick there would be throttled. To stay at $0,
> scheduling lives in GitHub Actions. On Vercel **Pro** you can add an hourly
> entry to `vercel.json` (`{ "path": "/api/cron/generate", "schedule": "0 * * * *" }`)
> — the route already handles `Authorization: Bearer $CRON_SECRET`. Don't run
> both at once or you'll generate twice an hour.

### Hosting — Vercel (recommended)

1. Push this repo to GitHub.
2. Import the repo into Vercel (it auto-detects Next.js; `vercel.json` sets the
   build command).
3. Add every env var from `.env.local` to the Vercel project, plus
   `NEXT_PUBLIC_SITE_URL=https://moviesrule.com`.

Vercel auto-deploys on every push, so each hourly commit from the Action
redeploys the site. Optionally set a `VERCEL_DEPLOY_HOOK_URL` Action secret to
force an immediate production redeploy after each post.

### Self-host

`npm run build && npm start` and point a reverse proxy at port 3000. The GitHub
Action still drives generation; to trigger a run by hand, hit the route with
`curl`:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/generate
```

---

## TinaCMS editor (optional)

The schema in `tina/config.ts` matches the frontmatter the pipeline emits (its
category dropdown is derived from `siteConfig.categories`, so the two never
drift). Start the editor with:

```bash
npm run dev   # Tina runs alongside Next via the `tinacms dev` wrapper
```

Then visit http://localhost:3000/admin/index.html to fix typos, tweak tags, or
hand-write posts that follow the same structure.

**Self-hosted mode (default):** TinaCMS works in local filesystem mode without
any cloud credentials. `scripts/build.sh` skips the Tina cloud build when
credentials aren't set. For hosted editing, add `NEXT_PUBLIC_TINA_CLIENT_ID` +
`TINA_TOKEN` (free tier at tina.io).

---

## The MDX contract

Every generated post follows this exact shape — the system prompt in
`src/lib/orchestrator/generate.ts` enforces it, and the Zod schema validates the
JSON before writing:

1. **Lead paragraph** (no heading, 3–5 sentences)
2. `<Callout type="takeaway">` — one-sentence synthesis
3. `## What happened`
4. `## Why it matters`
5. `<ProsCons>` block with 3+ items per side
6. `## How to think about it`
7. `<Callout type="warning">` — *optional*, only if warranted
8. `## FAQ` with exactly 3 `<Question>` entries

All components are implemented in `src/components/mdx/index.tsx` and styled via
`globals.css`'s `.prose-editorial` rules. The schema is **self-healing**:
over-long fields are clamped rather than rejected; only genuinely unrepairable
output (too-short body, too-few tags, malformed JSON) triggers a retry.

---

## Scoring

From `src/lib/orchestrator/score.ts`:

```
score = 0.5·popularity + 0.2·engagement + 0.3·recency
```

- **popularity** — log-scaled upvotes, normalized per-source, then weighted by
  source (HN=1.0, Brave=0.9, Reddit=0.85, Google Trends=0.8, DEV=0.75, RSS=0.7,
  YT=0.6). Google Trends maps each trending search's approximate traffic to the
  "upvotes" axis and is filtered to the keywords in `siteConfig.sources.trendsKeywords`
  (movie/streaming terms) so the blog stays on-niche.
- **engagement** — comments-to-upvotes ratio (capped at 1.0)
- **recency** — exponential decay with a **24h half-life**

Dedup uses a sorted-token fingerprint of the title, so "Dune Part Three release
date" and "Release date set for Dune Part Three" collapse to the same signature.
The topic log (`content/.topic-log.json`) is checked on every run and capped at
500 entries.

---

## Troubleshooting

**"no items from any source"** — all seven sources failed. Usually a network
blip; check logs. Try `npm run generate -- --dry` after a minute.

**"all top candidates already covered"** — the scorer found winners, but every
one has a signature already in the topic log. Either wait for new stories or
delete recent entries from `content/.topic-log.json`.

**"no research content scrapable"** — the winner's URL and all Brave results
failed to scrape (timeouts, 403s, JS-only pages). The pipeline skips gracefully;
try again next tick.

**Groq rate limit** — the free tier is generous. One post per hour stays well
under it; if you're iterating locally, just wait a moment (the pipeline also
fails over to `llama-3.1-8b-instant` on the same key).

---

## Extending

- **Add a source:** drop a new file in `src/lib/sources/`, export a function
  returning `RawItem[]`, and add it to the `Promise.all` in `pipeline.ts`.
- **Tune the niche:** edit `subreddits`, `rssFeeds`, `braveQueries`, and
  `trendsKeywords` in `src/site.config.ts`.
- **Tune the tone:** edit `SYSTEM_PROMPT` in `generate.ts`. The Zod schema
  catches anything structurally broken.
- **Change the cadence:** edit the `cron` in `.github/workflows/generate.yml`
  (e.g. `0 */2 * * *` for every two hours, `0 12 * * *` for daily).

See [`CLAUDE.md`](CLAUDE.md) for a deeper map of the codebase and conventions.

---

## License

MIT — do whatever you want with it.
