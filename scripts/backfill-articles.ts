#!/usr/bin/env tsx
/**
 * One-time backfill: 18 long-form (roughly double-length) evergreen articles,
 * each dated to a specific historical day that had zero posts — filling the
 * ~66-day silent stretch in the published history (only 2026-04-17 and
 * 2026-06-15 carried a post between the seed post and the 2026-06-24 seed
 * burst; every other day in that window had zero) computed from
 * content/posts/*.mdx frontmatter on 2026-07-04.
 *
 * Each entry uses the same generateForTopic() path added to
 * src/lib/orchestrator/pipeline.ts (real Brave-search research + a real LLM
 * author), just with `targetWords` / `minBodyChars` set so the body comes out
 * roughly double the site's usual ~4,400-char / ~635-word median instead of
 * the standard length. Topics are movies/streaming evergreen features distinct
 * from scripts/seed-film.ts's curated list.
 *
 * NEVER commits via Octokit: posts are written to content/posts/ and the local
 * content/.topic-log.json is updated, exactly like the hourly local runner.
 * The companion workflow (.github/workflows/backfill-articles.yml) commits the
 * result. Idempotent — an item whose signature is already in the log is
 * skipped, so a partial/interrupted run can simply be re-dispatched.
 *
 * Requires the writer LLM key (`llm.apiKeyEnv` in site.config.ts) and
 * BRAVE_API_KEY (these topics have no source URL, so research relies on web
 * search). PEXELS_API_KEY is optional (hero images).
 *
 * Usage:
 *   npx tsx scripts/backfill-articles.ts         # run the whole batch
 *   npx tsx scripts/backfill-articles.ts --dry   # research+write the first item, write nothing
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateForTopic } from '../src/lib/orchestrator/pipeline';
import { signature } from '../src/lib/orchestrator/score';
import type { TopicLog } from '../src/lib/orchestrator/types';
import { siteConfig } from '../src/site.config';

const LOG_PATH = path.join(process.cwd(), 'content', '.topic-log.json');
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

// Long-form target: this site's body currently runs ~4,400 chars / ~635 words
// at the median (computed from content/posts/*.mdx on 2026-07-04). Aim the
// prompt at roughly double that, and enforce a floor well above standard (but
// below the exact target, since LLM word counts vary) so a short response is
// rejected and retried rather than shipped.
const TARGET_WORDS = 1300;
const MIN_BODY_CHARS = 7000;

const DELAY_MS = 2000;

interface BackfillItem {
  topic: string;
  date: string; // ISO
}

// Chronological. Each date is a day that had zero posts in the published
// history (computed from content/posts/*.mdx frontmatter on 2026-07-04) —
// spread across the 2026-04-18 .. 2026-06-23 gap between the original seed
// post and the first hourly-pipeline burst.
const BACKFILL_ITEMS: BackfillItem[] = [
  { topic: 'How Streaming Algorithms Decide What You Watch Next', date: '2026-04-19T12:00:00.000Z' },
  { topic: "The Difference Between a Director's Cut and a Theatrical Cut", date: '2026-04-24T12:00:00.000Z' },
  { topic: 'How Movie Ratings Like PG-13 and R Actually Get Assigned', date: '2026-04-29T12:00:00.000Z' },
  { topic: 'Why Some Movies Get Day-and-Date Streaming Releases', date: '2026-05-04T12:00:00.000Z' },
  { topic: 'The Economics of Movie Ticket Pricing and Premium Formats', date: '2026-05-09T12:00:00.000Z' },
  { topic: 'How Post-Credit Scenes Became a Blockbuster Staple', date: '2026-05-13T12:00:00.000Z' },
  { topic: "What Makes a Movie a Cult Classic Years After Release", date: '2026-05-17T12:00:00.000Z' },
  { topic: "The Role of Test Screenings in Shaping a Film's Final Cut", date: '2026-05-21T12:00:00.000Z' },
  { topic: 'How Streaming Services Decide Which Shows Get Renewed or Cancelled', date: '2026-05-25T12:00:00.000Z' },
  { topic: 'The History of the Movie Trailer as an Event Unto Itself', date: '2026-05-29T12:00:00.000Z' },
  { topic: 'How Visual Effects Studios Bid On and Budget a Film', date: '2026-06-02T12:00:00.000Z' },
  { topic: "What a Film's Opening Weekend Really Tells a Studio", date: '2026-06-06T12:00:00.000Z' },
  { topic: 'The Difference Between a Reboot, a Remake, and a Requel', date: '2026-06-10T12:00:00.000Z' },
  { topic: 'How Award-Season Campaigning Actually Works', date: '2026-06-14T12:00:00.000Z' },
  { topic: 'Why Some Films Skip Theaters Entirely for Streaming', date: '2026-06-16T12:00:00.000Z' },
  { topic: 'The Business of Movie Novelizations and Tie-In Merchandise', date: '2026-06-18T12:00:00.000Z' },
  { topic: 'How International Box Office Numbers Shape Hollywood Decisions', date: '2026-06-20T12:00:00.000Z' },
  { topic: 'What Makes a Movie Rewatchable, According to Film Theory', date: '2026-06-22T12:00:00.000Z' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadLocalLog(): Promise<TopicLog> {
  try {
    return JSON.parse(await fs.readFile(LOG_PATH, 'utf8')) as TopicLog;
  } catch {
    return { topics: [] };
  }
}

async function saveLocalLog(log: TopicLog): Promise<void> {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
}

async function main() {
  const dryRun = process.argv.includes('--dry');

  const llmKeyEnv = siteConfig.llm.apiKeyEnv;
  if (!process.env[llmKeyEnv]?.trim()) {
    console.error(`✗ ${llmKeyEnv} is not set — it's required to write posts. See .env.example.`);
    process.exit(1);
  }
  if (!process.env.BRAVE_API_KEY?.trim()) {
    console.error(
      '✗ BRAVE_API_KEY is not set. These topics have no source URL of their own, ' +
        'so without web search there is nothing to research — every item would be skipped.'
    );
    process.exit(1);
  }

  let log = await loadLocalLog();
  const covered = new Set(log.topics.map((t) => t.signature));
  const queue = BACKFILL_ITEMS.filter((item) => !covered.has(signature(item.topic)));

  console.log(
    `→ ${BACKFILL_ITEMS.length} items in batch, ${queue.length} not yet covered.\n` +
      `→ Long-form target: ~${TARGET_WORDS} words, ${MIN_BODY_CHARS}+ body chars.\n` +
      `→ ${dryRun ? 'DRY RUN (1 item, nothing written)' : `generating ${queue.length}`}…\n`
  );

  if (dryRun) {
    const item = queue[0] ?? BACKFILL_ITEMS[0];
    console.log(`Topic: ${item.topic}\nDate: ${item.date}\n`);
    const res = await generateForTopic(item.topic, {
      dryRun: true,
      date: new Date(item.date),
      targetWords: TARGET_WORDS,
      minBodyChars: MIN_BODY_CHARS,
    });
    console.log(JSON.stringify({ ...res, mdx: res.mdx ? `[${res.mdx.length} bytes]` : undefined }, null, 2));
    if (res.mdx) {
      console.log('\n─── MDX preview (first 2000 chars) ───');
      console.log(res.mdx.slice(0, 2000));
    }
    return;
  }

  await fs.mkdir(POSTS_DIR, { recursive: true });
  let written = 0;
  let skipped = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    process.stdout.write(`[${i + 1}/${queue.length}] ${item.date.slice(0, 10)} — ${item.topic} … `);

    const res = await generateForTopic(item.topic, {
      dryRun: true,
      date: new Date(item.date),
      targetWords: TARGET_WORDS,
      minBodyChars: MIN_BODY_CHARS,
    });

    if (!res.ok || !res.slug || !res.mdx) {
      console.log(`skip (${res.skipped ?? res.error ?? 'unknown'})`);
      skipped++;
      if (DELAY_MS > 0) await sleep(DELAY_MS);
      continue;
    }

    await fs.writeFile(path.join(POSTS_DIR, `${res.slug}.mdx`), res.mdx, 'utf8');
    log = {
      topics: [
        ...log.topics,
        {
          slug: res.slug,
          title: item.topic,
          url: '',
          publishedAt: item.date,
          signature: signature(item.topic),
        },
      ],
    };
    await saveLocalLog(log); // save after each so an interrupted run is resumable
    written++;
    console.log(`✓ ${res.slug} (${res.mdx.length} bytes)`);

    if (DELAY_MS > 0 && i < queue.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n✓ Done. Wrote ${written} post(s), skipped ${skipped}.`);
}

main()
  // Force-exit on success like run-local.ts/seed-film.ts: the orchestrator can
  // leave open handles (keep-alive sockets, youtubei.js) that would otherwise
  // keep the process alive until the workflow times out.
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
