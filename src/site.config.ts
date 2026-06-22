export const siteConfig = {
  // ── Branding ──────────────────────────────────────────────────
  name: 'Movies Rule',
  tagline: 'Films · Streaming · Screens',
  description: "Movie news, reviews, and what's worth streaming — the films and shows everyone's talking about.",
  url: 'https://moviesrule.com',
  footerNote: 'what to watch, updated every hour from across the web.',

  // ── Audience & taxonomy ───────────────────────────────────────
  audience: 'movie fans and streaming watchers',
  categories: ['news', 'reviews', 'streaming', 'trailers', 'boxoffice', 'features'],
  navCategories: ['reviews', 'streaming', 'trailers'],

  // ── Niche sources ─────────────────────────────────────────────
  sources: {
    subreddits: ['movies', 'boxoffice', 'television', 'NetflixBestOf', 'MovieSuggestions', 'truefilm'],
    rssFeeds: [
      'https://variety.com/v/film/feed/',
      'https://www.hollywoodreporter.com/feed/',
      'https://collider.com/feed/',
      'https://www.indiewire.com/feed/',
      'https://www.slashfilm.com/feed/',
    ],
    braveQueries: [
      'new movie trailer',
      'movie review',
      'streaming release date',
      'box office results',
      'film casting news',
    ],
    // Google Trends' "Trending now" feed is general-interest (sports, weather,
    // celebrities…). Only surface a trend when its term or related headlines
    // match one of these niche keywords. Cheap, lowercased substring match.
    trendsKeywords: [
      'movie', 'movies', 'film', 'films', 'trailer', 'box office', 'streaming',
      'netflix', 'disney', 'disney+', 'hbo max', 'hulu', 'prime video', 'apple tv',
      'paramount', 'peacock', 'a24', 'marvel', 'dc studios', 'dc comics', 'pixar',
      'oscar', 'oscars', 'academy award', 'golden globe', 'sequel', 'prequel', 'reboot', 'remake',
      'casting', 'director', 'actor', 'actress', 'premiere', 'cinema', 'movie theater',
      'tv series', 'miniseries', 'tv show', 'new season', 'final season', 'episode', 'showtime', 'documentary',
    ],
  },

  // ── Ads ───────────────────────────────────────────────────────
  adsenseClient: 'ca-pub-4655488107179825',

  // ── Engine: writer LLM (Google Gemini, OpenAI-compatible) ─────
  llm: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-flash-latest',
    apiKeyEnv: 'GEMINI_API_KEY',
  },

  // ── Engine: hero images ('pexels' | 'openverse' | 'none') ─────
  imageProvider: 'pexels',

  // ── Reviews layer (cinema reviews + release rails) ────────────
  // TMDB powers factual film metadata, posters, and "now playing / upcoming".
  // Requires TMDB_API_KEY; the whole layer is skipped when that's unset.
  tmdb: {
    region: 'US', // ISO-3166-1 country for release dates + watch providers
    language: 'en-US',
  },
  reviews: {
    scoreMax: 100, // canonical review score is 0–100…
    starMax: 5, // …displayed as an N-star rating
    perDay: 3, // target reviews/day (used by scheduling in a later phase)
  },
} as const;

export type SiteConfig = typeof siteConfig;
export type ImageProvider = 'pexels' | 'openverse' | 'none';
