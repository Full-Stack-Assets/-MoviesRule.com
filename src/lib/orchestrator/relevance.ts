import type { RawItem } from './types';

const filmSignals = [
  'movie', 'film', 'cinema', 'trailer', 'box office', 'streaming', 'netflix',
  'disney+', 'hbo max', 'hulu', 'prime video', 'apple tv', 'paramount+',
  'peacock', 'a24', 'marvel', 'dc studios', 'pixar', 'oscar', 'academy award',
  'sequel', 'prequel', 'reboot', 'remake', 'casting', 'director', 'actor',
  'actress', 'premiere', 'tv series', 'miniseries', 'tv show', 'new season',
  'final season', 'documentary', 'film festival', 'filmmaker', 'filmmaking', 'screenplay', 'imax',
];

function containsTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

const offNicheSignals = [
  'nfl', 'nba', 'mlb', 'nhl', 'soccer', 'football', 'baseball', 'fantasy betting',
  'odds', 'weather', 'heat advisory', 'stock price', 'earnings call', 'giveaway',
];

export function isRelevantScreenItem(item: RawItem): boolean {
  const text = [item.title, item.summary, ...(item.tags || [])].filter(Boolean).join(' ').toLowerCase();
  const filmMatch = filmSignals.some((term) => containsTerm(text, term));
  if (!filmMatch) return false;
  return !offNicheSignals.some((term) => containsTerm(text, term)) || containsTerm(text, 'documentary') || containsTerm(text, 'film');
}

export function filterRelevantScreenItems(items: RawItem[]): RawItem[] {
  return items.filter(isRelevantScreenItem);
}

export function isRelevantScreenPost(frontmatter: { title?: string; description?: string; tags?: string[]; type?: string; film?: unknown }): boolean {
  if (frontmatter.type === 'review' || frontmatter.film) return true;
  return isRelevantScreenItem({
    id: frontmatter.title || 'post',
    source: 'rss',
    title: frontmatter.title || '',
    summary: frontmatter.description || '',
    tags: frontmatter.tags || [],
    url: '',
    publishedAt: '',
  });
}
