import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  justWatchSearchUrl,
  providerLink,
  amazonSearchUrl,
  watchContextFor,
  AFFILIATE_ENABLED,
} from '@/lib/affiliate';
import type { PostFrontmatter } from '@/lib/posts';

function fm(partial: Partial<PostFrontmatter>): PostFrontmatter {
  return {
    title: 'Some Post',
    description: 'd',
    date: '2026-01-01T00:00:00Z',
    category: 'news',
    tags: [],
    hero: { url: '', alt: '', credit: '', creditUrl: '' },
    sources: [],
    ...partial,
  } as PostFrontmatter;
}

describe('link builders (no affiliate env set)', () => {
  it('justWatchSearchUrl encodes the query and uses the region', () => {
    expect(justWatchSearchUrl('Dune Part Two')).toBe(
      'https://www.justwatch.com/us/search?q=Dune%20Part%20Two'
    );
  });

  it('providerLink maps a known provider to its own search', () => {
    expect(providerLink('Netflix', 'Sugar')).toContain('netflix.com/search?q=Sugar');
    expect(providerLink('Disney Plus', 'Sugar')).toContain('disneyplus.com');
  });

  it('providerLink falls back to JustWatch for an unknown provider', () => {
    expect(providerLink('Some Obscure Service', 'Sugar')).toContain('justwatch.com');
  });

  it('amazonSearchUrl returns null without an Associates tag', () => {
    expect(amazonSearchUrl('Dune')).toBeNull();
  });

  it('AFFILIATE_ENABLED is false when no earning env is set', () => {
    expect(AFFILIATE_ENABLED).toBe(false);
  });
});

describe('watchContextFor (which posts get a rail)', () => {
  it('returns null for news posts', () => {
    expect(watchContextFor(fm({ category: 'news' }))).toBeNull();
  });

  it('returns null for opinion posts', () => {
    expect(watchContextFor(fm({ category: 'opinion' }))).toBeNull();
  });

  it('returns a generic (title-less) rail for film-adjacent categories', () => {
    const ctx = watchContextFor(fm({ category: 'features', title: 'Best fight scenes ever' }));
    expect(ctx).not.toBeNull();
    expect(ctx!.title).toBeUndefined(); // never guess a title from a feature headline
    expect(ctx!.providers).toEqual([]);
  });

  it('uses the precise film title + providers for a structured review', () => {
    const ctx = watchContextFor(
      fm({
        category: 'reviews',
        type: 'review',
        watchOn: ['Netflix', 'Max'],
        // minimal film facts
        film: { title: 'Sugar', year: 2026 } as PostFrontmatter['film'],
      })
    );
    expect(ctx!.title).toBe('Sugar');
    expect(ctx!.providers).toEqual(['Netflix', 'Max']);
  });

  it('de-suffixes a review headline when no film facts are present', () => {
    const ctx = watchContextFor(fm({ category: 'reviews', type: 'review', title: 'Dune Part Two — Review' }));
    expect(ctx!.title).toBe('Dune Part Two');
  });
});

describe('amazonSearchUrl with an Associates tag (env-dependent)', () => {
  beforeEach(() => vi.resetModules());

  it('builds a tagged Prime Video search URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_AMAZON_ASSOC_TAG', 'moviesrule-20');
    const mod = await import('@/lib/affiliate');
    const url = mod.amazonSearchUrl('Dune');
    expect(url).toContain('amazon.com/s?k=Dune');
    expect(url).toContain('tag=moviesrule-20');
    expect(mod.AFFILIATE_ENABLED).toBe(true);
    vi.unstubAllEnvs();
  });
});
