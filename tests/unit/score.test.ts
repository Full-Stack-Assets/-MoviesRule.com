import { describe, it, expect, vi, afterEach } from 'vitest';
import { score, signature, dedupe, pickWinner } from '@/lib/orchestrator/score';
import type { RawItem, ScoredItem, TopicLog } from '@/lib/orchestrator/types';

function raw(partial: Partial<RawItem> & { title: string }): RawItem {
  return {
    id: partial.id ?? partial.title,
    source: 'reddit',
    url: `https://example.com/${encodeURIComponent(partial.title)}`,
    publishedAt: new Date().toISOString(),
    upvotes: 0,
    comments: 0,
    ...partial,
  } as RawItem;
}

function logEntry(signature: string): TopicLog['topics'][number] {
  return { slug: 'x', title: 'x', url: 'https://x', publishedAt: '', signature };
}

describe('signature', () => {
  it('collapses reworded headlines with the same significant tokens', () => {
    expect(signature('Marvel Announces New Spider-Man Movie')).toBe(
      signature('new spider-man movie: marvel announces!')
    );
  });

  it('ignores short/stopword-ish tokens and punctuation', () => {
    expect(signature('The cat sat on a Netflix show')).toBe(signature('Netflix show cat'));
  });

  it('produces different fingerprints for genuinely different titles', () => {
    expect(signature('Dune Part Three confirmed')).not.toBe(signature('Avatar sequel delayed'));
  });

  it('returns a 16-char hex fingerprint', () => {
    expect(signature('anything at all here')).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('score', () => {
  afterEach(() => vi.useRealTimers());

  it('ranks a fresh, popular, discussed item above a stale, quiet one', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    const [hot, cold] = score([
      raw({ title: 'hot story', source: 'hackernews', upvotes: 500, comments: 300, publishedAt: '2026-01-02T00:00:00Z' }),
      raw({ title: 'cold story', source: 'hackernews', upvotes: 1, comments: 0, publishedAt: '2025-12-01T00:00:00Z' }),
    ]);
    expect(hot.score).toBeGreaterThan(cold.score);
    expect(hot.breakdown.recency).toBeGreaterThan(cold.breakdown.recency);
  });

  it('applies a 24h half-life to recency', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    const [now, dayOld] = score([
      raw({ title: 'now', publishedAt: '2026-01-02T00:00:00Z' }),
      raw({ title: 'day old', publishedAt: '2026-01-01T00:00:00Z' }),
    ]);
    expect(now.breakdown.recency).toBeCloseTo(1, 2);
    expect(dayOld.breakdown.recency).toBeCloseTo(0.5, 2);
  });

  it('weights sources: HN outranks RSS at equal raw signal', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    const at = '2026-01-02T00:00:00Z';
    // Each source normalizes upvotes against its own max, so give each a peer to
    // normalize against and compare the source weighting directly.
    const scored = score([
      raw({ title: 'hn top', source: 'hackernews', upvotes: 100, publishedAt: at }),
      raw({ title: 'hn low', source: 'hackernews', upvotes: 1, publishedAt: at }),
      raw({ title: 'rss top', source: 'rss', upvotes: 100, publishedAt: at }),
      raw({ title: 'rss low', source: 'rss', upvotes: 1, publishedAt: at }),
    ]);
    const hn = scored.find((s) => s.title === 'hn top')!;
    const rss = scored.find((s) => s.title === 'rss top')!;
    expect(hn.breakdown.popularity).toBeGreaterThan(rss.breakdown.popularity);
  });

  it('never throws on missing upvotes/comments and keeps score in [0,1]-ish range', () => {
    const [s] = score([raw({ title: 'bare item', upvotes: undefined, comments: undefined })]);
    expect(Number.isFinite(s.score)).toBe(true);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(1);
  });
});

describe('dedupe', () => {
  it('keeps the highest-scoring item among near-duplicates', () => {
    const items: ScoredItem[] = [
      { ...raw({ title: 'Spider-Man movie announced' }), score: 0.4, breakdown: { popularity: 0, engagement: 0, recency: 0 } },
      { ...raw({ title: 'Announced: Spider-Man Movie!' }), score: 0.9, breakdown: { popularity: 0, engagement: 0, recency: 0 } },
      { ...raw({ title: 'Totally different Batman news' }), score: 0.5, breakdown: { popularity: 0, engagement: 0, recency: 0 } },
    ];
    const out = dedupe(items);
    expect(out).toHaveLength(2);
    expect(out.find((o) => o.title.includes('Spider-Man'))!.score).toBe(0.9);
  });
});

describe('pickWinner', () => {
  const scored = (title: string, s: number): ScoredItem => ({
    ...raw({ title }),
    score: s,
    breakdown: { popularity: 0, engagement: 0, recency: 0 },
  });

  it('returns the top item whose signature is not in the topic log', () => {
    const items = [scored('already covered story', 0.9), scored('brand new fresh story', 0.8)];
    const log: TopicLog = { topics: [logEntry(signature('already covered story'))] };
    expect(pickWinner(items, log)!.title).toBe('brand new fresh story');
  });

  it('returns null when every candidate is already in the log', () => {
    const items = [scored('seen one', 0.9)];
    const log: TopicLog = { topics: [logEntry(signature('seen one'))] };
    expect(pickWinner(items, log)).toBeNull();
  });
});
