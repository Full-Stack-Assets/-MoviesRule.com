#!/usr/bin/env tsx
/**
 * Backfill the catalog with evergreen film / cinema / media posts.
 *
 * The live pipeline writes trend-driven posts; this script seeds durable,
 * on-niche film content so the site isn't dependent on what happens to be
 * trending. It drives the SAME generate → image → serialize path as the
 * pipeline, but synthesizes a research-free bundle from a curated topic, so it
 * needs only the LLM key (GEMINI_API_KEY, with the Groq fallback) — no Brave.
 *
 * Topics are evergreen and general on purpose (history/craft/genres of film and
 * media), which keeps the LLM on safe, factual ground without external sources.
 *
 * Usage:
 *   npx tsx scripts/seed-film.ts            # generate every topic not already present
 *   npx tsx scripts/seed-film.ts --limit=10 # cap how many to generate this run
 *   npx tsx scripts/seed-film.ts --dry      # print, write nothing
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generate } from '../src/lib/orchestrator/generate';
import { pickImage } from '../src/lib/orchestrator/image';
import { serialize } from '../src/lib/orchestrator/serialize';
import type { ResearchBundle, ScoredItem } from '../src/lib/orchestrator/types';

const TOPICS: string[] = [
  'A Beginner’s Guide to Film Noir and Its Lasting Influence',
  'How the French New Wave Rewrote the Rules of Cinema',
  'The Evolution of Practical Effects in Science-Fiction Film',
  'Understanding Three-Act Structure in Screenwriting',
  'The Rise and Fall of the Hollywood Studio System',
  'What Makes a Great Movie Villain',
  'The Art of the Long Take in Cinema',
  'How Film Scores Shape the Way We Feel',
  'The History of Animation: From Hand-Drawn Cels to CGI',
  'Method Acting, Explained',
  'Anatomy of the Heist Film',
  'How Streaming Changed the Way We Watch Movies',
  'What a Film Editor Actually Does',
  'Cinematography 101: How Light Tells a Story',
  'The Enduring Appeal of the Western',
  'What the Hays Code Did to Hollywood',
  'The Director’s Cut: When Filmmakers Reclaim Their Vision',
  'How A24 Redefined Independent Film',
  'The Blockbuster Era: How Jaws and Star Wars Changed Everything',
  'Understanding Aspect Ratios and Why They Matter',
  'The Documentary and Its Quest for Truth',
  'Practical Effects vs. CGI: An Ongoing Debate',
  'Why Production Design Makes or Breaks a Film',
  'How Foreign-Language Films Break Through to Global Audiences',
  'The Anti-Hero in Modern Cinema',
  'Color Theory in Film, and How Directors Use It',
  'The Craft of the Movie Trailer',
  'Box-Office Economics: How Films Actually Make Money',
  'The Modern Renaissance of Horror Cinema',
  'Sound Design: The Unsung Hero of Film',
  'The Coming-of-Age Genre, Explained',
  'How Film Festivals Launch Careers and Films',
  'The Legacy of Silent Cinema',
  'Adapting Books to Film: What Gets Lost and What Is Gained',
  'Cinematographer vs. Director: Who Shapes the Look of a Film',
  'Why Practical Stunts Still Matter in the CGI Age',
];

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const DRY = process.argv.includes('--dry');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await fs.mkdir(POSTS_DIR, { recursive: true });
  const existing = new Set(await fs.readdir(POSTS_DIR));

  let made = 0,
    skipped = 0,
    failed = 0;
  const now = Date.now();

  for (let i = 0; i < TOPICS.length; i++) {
    if (made >= LIMIT) break;
    const topic = TOPICS[i];

    const winner: ScoredItem = {
      id: `film-seed:${i}`,
      source: 'bravenews',
      title: topic,
      url: '',
      publishedAt: new Date(now).toISOString(),
      score: 1,
      breakdown: { popularity: 0, engagement: 0, recency: 1 },
    };
    // Research-free bundle: the LLM writes from the evergreen topic alone.
    const bundle: ResearchBundle = { winner, articles: [], transcripts: [], related: [] };

    try {
      const post = await generate(bundle);
      // The only "source" would be the synthetic winner with an empty URL — drop
      // it so an evergreen post simply has no external sources block.
      post.sources = post.sources.filter((s) => s.url);
      post.heroImage = await pickImage(post);

      const file = `${post.slug}.mdx`;
      if (existing.has(file)) {
        skipped++;
        console.log(`[seed-film] skip existing: ${post.slug}`);
        continue;
      }

      // Spread dates across the recent past so the catalog looks natural and
      // every seeded post is immediately published (no future dates).
      const date = new Date(now - (i + 1) * 36 * 3_600_000); // ~1.5 days apart
      const mdx = serialize(post, date);

      if (!DRY) await fs.writeFile(path.join(POSTS_DIR, file), mdx, 'utf8');
      existing.add(file);
      made++;
      console.log(`[seed-film] ${post.slug} :: ${post.title}`);
    } catch (e) {
      failed++;
      console.warn(`[seed-film] failed for "${topic}": ${e instanceof Error ? e.message : e}`);
    }
    await sleep(500);
  }

  console.log(`\n[seed-film] done — made:${made} skipped:${skipped} failed:${failed} (dry=${DRY})`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
