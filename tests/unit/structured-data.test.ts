import { describe, it, expect } from 'vitest';
import { extractFaq, movieJsonLd, faqListJsonLd, articleJsonLd } from '@/lib/structured-data';
import type { Post } from '@/lib/posts';
import type { FilmFacts } from '@/lib/reviews';

describe('extractFaq', () => {
  it('pulls question + plain-text answer out of <Question> blocks', () => {
    const body = `## FAQ
<FAQ>
<Question q="Is it good?">Yes, **very** good. See [here](https://x.com).</Question>
<Question q='Single quotes?'>Also handled.</Question>
</FAQ>`;
    const faqs = extractFaq(body);
    expect(faqs).toHaveLength(2);
    expect(faqs[0]).toEqual({ question: 'Is it good?', answer: 'Yes, very good. See here.' });
    expect(faqs[1].question).toBe('Single quotes?');
  });

  it('decodes HTML entities in the question', () => {
    const body = `<Question q="Tom &amp; Jerry?">Yes.</Question>`;
    expect(extractFaq(body)[0].question).toBe('Tom & Jerry?');
  });

  it('returns [] when there are no questions', () => {
    expect(extractFaq('no faq here')).toEqual([]);
  });
});

describe('movieJsonLd', () => {
  const film: FilmFacts = {
    tmdbId: 1,
    title: 'Sugar',
    year: 2026,
    director: 'Jane Doe',
    cast: ['A Actor', 'B Actor'],
    genres: ['Drama'],
    runtimeMin: 120,
    releaseDate: '2026-03-01',
    posterUrl: 'https://img/poster.jpg',
    backdropUrl: null,
    overview: 'A mystery.',
    watchProviders: ['Netflix'],
    tmdbUrl: 'https://tmdb/movie/1',
  };

  it('emits a schema.org Movie with director, actors, and description', () => {
    const ld = movieJsonLd(film, { url: 'https://site/where-to-watch/sugar' });
    expect(ld['@type']).toBe('Movie');
    expect(ld.name).toBe('Sugar');
    expect(ld.director).toMatchObject({ name: 'Jane Doe' });
    expect(Array.isArray(ld.actor)).toBe(true);
  });

  it('maps a 0-100 score to a 0-5 aggregateRating', () => {
    const ld = movieJsonLd(film, { url: 'https://x', score: 80 });
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4, bestRating: 5 });
  });

  it('omits aggregateRating when no score is given', () => {
    expect(movieJsonLd(film, { url: 'https://x' }).aggregateRating).toBeUndefined();
  });
});

describe('faqListJsonLd', () => {
  it('wraps Q/A pairs into a FAQPage', () => {
    const ld = faqListJsonLd([{ question: 'Q?', answer: 'A.' }]);
    expect(ld['@type']).toBe('FAQPage');
    expect((ld.mainEntity as unknown[]).length).toBe(1);
  });
});

describe('articleJsonLd', () => {
  it('emits a BlogPosting with the publication as author/publisher', () => {
    const post = {
      slug: 'hello',
      frontmatter: {
        title: 'Hello',
        description: 'd',
        date: '2026-01-01T00:00:00Z',
        category: 'news',
        tags: ['a'],
        hero: { url: 'https://img', alt: '', credit: '', creditUrl: '' },
        sources: [],
      },
      body: '',
      readingTimeMin: 1,
    } as Post;
    const ld = articleJsonLd(post);
    expect(ld['@type']).toBe('BlogPosting');
    expect(ld.headline).toBe('Hello');
    expect(ld.image).toEqual(['https://img']);
  });
});
