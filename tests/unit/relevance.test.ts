import { describe, expect, it } from 'vitest';
import { isRelevantScreenItem, isRelevantScreenPost } from '../../src/lib/orchestrator/relevance';
import type { RawItem } from '../../src/lib/orchestrator/types';

function item(title: string): RawItem {
  return { id: title, source: 'rss', title, url: 'https://example.com', publishedAt: new Date().toISOString() };
}

describe('isRelevantScreenItem', () => {
  it.each(['NFL playoff odds', 'Heat advisory continues', 'Company earnings call', 'Backpack giveaway'])('rejects off-topic item: %s', (title) => {
    expect(isRelevantScreenItem(item(title))).toBe(false);
  });

  it.each(['New movie trailer arrives', 'A24 film premieres at Sundance', 'Netflix announces final season', 'Box office record falls'])('accepts film and television item: %s', (title) => {
    expect(isRelevantScreenItem(item(title))).toBe(true);
  });

  it('always retains structured film reviews', () => {
    expect(isRelevantScreenPost({ title: 'An intentionally terse title', type: 'review', film: { title: 'Example' } })).toBe(true);
  });
});
