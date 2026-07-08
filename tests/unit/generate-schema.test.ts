import { describe, it, expect } from 'vitest';
import { clampMeta, slugify, normalizeTags, PostSchema } from '@/lib/orchestrator/generate';

describe('clampMeta', () => {
  it('collapses whitespace and leaves short strings intact', () => {
    expect(clampMeta('  hello   world  ')).toBe('hello world');
  });

  it('truncates at a word boundary with an ellipsis when over the cap', () => {
    const out = clampMeta('one two three four five', 12);
    expect(out.length).toBeLessThanOrEqual(12);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('  ');
  });
});

describe('slugify', () => {
  it('produces a kebab-case slug matching /^[a-z0-9-]+$/', () => {
    expect(slugify('  Marvel’s NEW Spider-Man!! (2026)  ')).toMatch(/^[a-z0-9-]+$/);
  });

  it('strips leading/trailing separators and caps length', () => {
    expect(slugify('---Hello---')).toBe('hello');
    expect(slugify('a'.repeat(100)).length).toBeLessThanOrEqual(60);
  });
});

describe('normalizeTags', () => {
  it('lowercases, trims, dedupes, drops blanks, caps at 6', () => {
    expect(normalizeTags([' Marvel', 'marvel', '', '  ', 'DC', 'a', 'b', 'c', 'd', 'e'])).toEqual([
      'marvel', 'dc', 'a', 'b', 'c', 'd',
    ]);
  });
});

describe('PostSchema (self-healing contract)', () => {
  const valid = {
    title: 'A perfectly reasonable and sufficiently long headline',
    description: 'A concise SEO description.',
    slug: 'a-reasonable-headline',
    category: 'News',
    tags: ['movies', 'marvel'],
    body: 'x'.repeat(900),
  };

  it('accepts a valid payload and normalizes category to lowercase', () => {
    const r = PostSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.category).toBe('news');
  });

  it('HEALS over-long title/description and a messy slug rather than failing', () => {
    const r = PostSchema.safeParse({
      ...valid,
      title: 'T'.repeat(300),
      description: 'D'.repeat(400),
      slug: 'This Is Not A Slug!!',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.title.length).toBeLessThanOrEqual(120);
      expect(r.data.description.length).toBeLessThanOrEqual(200);
      expect(r.data.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('RETRIES (fails) on an unrepairable too-short body', () => {
    expect(PostSchema.safeParse({ ...valid, body: 'too short' }).success).toBe(false);
  });

  it('RETRIES (fails) on fewer than two real tags', () => {
    expect(PostSchema.safeParse({ ...valid, tags: ['only-one'] }).success).toBe(false);
  });

  it('RETRIES (fails) on a too-short title (below the min before transform)', () => {
    expect(PostSchema.safeParse({ ...valid, title: 'short' }).success).toBe(false);
  });
});
