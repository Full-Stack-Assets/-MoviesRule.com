import { describe, it, expect } from 'vitest';
import { relatedPosts, isReview } from '@/lib/posts';
import type { Post } from '@/lib/posts';

function post(slug: string, partial: Partial<Post['frontmatter']> = {}): Post {
  return {
    slug,
    frontmatter: {
      title: slug,
      description: 'd',
      date: '2026-01-01T00:00:00Z',
      category: 'news',
      tags: [],
      hero: { url: '', alt: '', credit: '', creditUrl: '' },
      sources: [],
      ...partial,
    },
    body: '',
    readingTimeMin: 1,
  } as Post;
}

describe('relatedPosts', () => {
  const current = post('current', { tags: ['marvel', 'trailer'], category: 'trailers' });

  it('ranks shared tags above same-category above recency', () => {
    const all = [
      current,
      post('shared-tags', { tags: ['marvel'], category: 'news', date: '2020-01-01T00:00:00Z' }),
      post('same-cat', { tags: ['unrelated'], category: 'trailers', date: '2026-06-01T00:00:00Z' }),
      post('recent-unrelated', { tags: ['unrelated'], category: 'news', date: '2026-07-01T00:00:00Z' }),
    ];
    const out = relatedPosts(current, all, 3).map((p) => p.slug);
    expect(out[0]).toBe('shared-tags'); // shared tag wins despite being oldest
    expect(out[1]).toBe('same-cat'); // same category beats recency
  });

  it('never includes the current post and respects the limit', () => {
    const all = [current, post('a'), post('b'), post('c'), post('d')];
    const out = relatedPosts(current, all, 2);
    expect(out).toHaveLength(2);
    expect(out.map((p) => p.slug)).not.toContain('current');
  });

  it('falls back to recent posts when nothing shares tags/category', () => {
    const all = [current, post('x', { date: '2026-05-01T00:00:00Z' })];
    expect(relatedPosts(current, all, 3).map((p) => p.slug)).toEqual(['x']);
  });
});

describe('isReview', () => {
  it('is true only when frontmatter.type is "review"', () => {
    expect(isReview(post('a', { type: 'review' }))).toBe(true);
    expect(isReview(post('b'))).toBe(false);
  });
});
