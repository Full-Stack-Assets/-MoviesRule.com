import { describe, it, expect } from 'vitest';
import { serialize, sanitizeBody } from '@/lib/orchestrator/serialize';
import type { GeneratedPost } from '@/lib/orchestrator/types';

function post(partial: Partial<GeneratedPost>): GeneratedPost {
  return {
    slug: 'a-slug',
    title: 'A Title',
    description: 'A description',
    tags: ['movies'],
    category: 'news',
    heroImage: { url: 'https://img', alt: 'alt', credit: 'c', creditUrl: 'https://c' },
    body: 'Body text.',
    sources: [{ title: 'Src', url: 'https://src' }],
    ...partial,
  };
}

describe('sanitizeBody', () => {
  it('replaces inner double quotes inside a <Question q="..."> attribute', () => {
    const out = sanitizeBody('<Question q="the "limited" plan">answer</Question>');
    expect(out).toBe("<Question q=\"the 'limited' plan\">answer</Question>");
  });

  it('leaves ordinary body text untouched', () => {
    const body = 'He said "hello" in the paragraph.';
    expect(sanitizeBody(body)).toBe(body);
  });
});

describe('serialize', () => {
  it('emits YAML frontmatter + body and does NOT add review fields for news posts', () => {
    const mdx = serialize(post({}));
    expect(mdx.startsWith('---\n')).toBe(true);
    expect(mdx).toContain('title: "A Title"');
    expect(mdx).toContain('category: "news"');
    expect(mdx).not.toContain('type: "review"');
    expect(mdx.trimEnd().endsWith('Body text.')).toBe(true);
  });

  it('includes review-only frontmatter for reviews', () => {
    const mdx = serialize(
      post({
        type: 'review',
        verdict: 'Great.',
        rating: { score: 88 },
        watchOn: ['Netflix'],
      })
    );
    expect(mdx).toContain('type: "review"');
    expect(mdx).toContain('verdict: "Great."');
    expect(mdx).toContain('score: 88');
    expect(mdx).toContain('watchOn:');
  });

  it('sanitizes the body during serialization', () => {
    const mdx = serialize(post({ body: '<Question q="a "b" c">x</Question>' }));
    expect(mdx).toContain("q=\"a 'b' c\"");
  });
});
