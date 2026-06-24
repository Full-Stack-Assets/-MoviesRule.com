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
    // Broadened to cover movies, film and cinema widely: mainstream releases,
    // box office, arthouse/indie & festival cinema, filmmaking craft, and reviews.
    subreddits: [
      'movies',
      'boxoffice',
      'television',
      'NetflixBestOf',
      'MovieSuggestions',
      'truefilm',
      'criterion',
      'Filmmakers',
      'cinematography',
      'MovieDetails',
      'Letterboxd',
      'flicks',
      'horror',
      'oscarrace',
    ],
    rssFeeds: [
      'https://variety.com/v/film/feed/',
      'https://www.hollywoodreporter.com/feed/',
      'https://collider.com/feed/',
      'https://www.indiewire.com/feed/',
      'https://www.slashfilm.com/feed/',
      'https://deadline.com/feed/',
      'https://screenrant.com/feed/',
      'https://www.thewrap.com/feed/',
      'https://www.rogerebert.com/feed/',
      'https://www.firstshowing.net/feed/',
    ],
    braveQueries: [
      'new movie trailer',
      'movie review',
      'streaming release date',
      'box office results',
      'film casting news',
      'upcoming movie release date',
      'film festival premiere',
      'movie sequel announcement',
      'director new film project',
      'indie film news',
      'movie franchise update',
      'Oscar awards season',
      'film adaptation announcement',
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
      'film festival', 'cannes', 'sundance', 'venice film festival', 'screening', 'rotten tomatoes', 'imax',
      'blockbuster', 'indie film', 'biopic', 'screenplay', 'film score', 'box office record', 'movie franchise',
    ],
  },

  // ── Ads ───────────────────────────────────────────────────────
  adsenseClient: 'ca-pub-4655488107179825',

  // ── Engine: writer LLM (Google Gemini, OpenAI-compatible) ─────
  llm: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.5-flash',
    apiKeyEnv: 'GEMINI_API_KEY',
  },

  // Automatic failover: when Gemini returns transient 5xx / "overloaded" (503)
  // errors, generate.ts retries the request against this OpenAI-compatible
  // backup. Skipped when GROQ_API_KEY isn't set. Groq's free tier is fast.
  llmFallback: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
  },

  // ── Engine: hero images ('pexels' | 'openverse' | 'none') ─────
  imageProvider: 'pexels',
} as const;

export type SiteConfig = typeof siteConfig;
export type ImageProvider = 'pexels' | 'openverse' | 'none';
