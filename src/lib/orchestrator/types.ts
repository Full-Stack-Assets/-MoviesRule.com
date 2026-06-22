import type { FilmFacts, Rating, PostType, ReviewAudio } from '../reviews';

export interface RawItem {
  id: string;
  source: 'reddit' | 'hackernews' | 'devto' | 'rss' | 'youtube' | 'bravenews' | 'googletrends';
  title: string;
  url: string;
  author?: string;
  publishedAt: string; // ISO
  summary?: string;
  upvotes?: number;
  comments?: number;
  tags?: string[];
}

export interface ScoredItem extends RawItem {
  score: number;
  breakdown: {
    popularity: number;
    engagement: number;
    recency: number;
  };
}

export interface ResearchBundle {
  winner: ScoredItem;
  articles: Array<{ url: string; title: string; content: string }>;
  transcripts: Array<{ videoId: string; title: string; text: string }>;
  related: RawItem[];
}

export interface GeneratedPost {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  heroImage: { url: string; alt: string; credit: string; creditUrl: string };
  body: string; // MDX
  sources: Array<{ title: string; url: string }>;
  // ── Reviews layer (optional; populated only when type === 'review') ──
  type?: PostType; // defaults to 'post' downstream
  film?: FilmFacts;
  rating?: Rating;
  verdict?: string; // one-line, spoiler-free verdict
  watchOn?: string[]; // platform names for the "watch on" badges
  audio?: ReviewAudio; // optional AI narration
}

export interface TopicLog {
  topics: Array<{
    slug: string;
    title: string;
    url: string;
    publishedAt: string;
    signature: string; // hashed title for fuzzy dedup
  }>;
}
