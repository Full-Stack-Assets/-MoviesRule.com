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

  // ── Engine: writer LLM (Groq, OpenAI-compatible) ──────────────
  llm: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'openai/gpt-oss-120b',
    apiKeyEnv: 'GROQ_API_KEY',
  },

  // Automatic failover chain: generate.ts walks these in order when the
  // current provider errors — 413 "request too large", 429, 5xx,
  // "overloaded"/"unavailable", or a hard 400 (e.g. Groq's
  // json_validate_failed) that repeating the same model can't fix. Groq
  // free-tier limits are PER MODEL (each has its own tokens-per-minute and
  // tokens-per-day bucket on the same key), so every extra model here is real
  // extra daily runway: the primary's 8K TPM / 200K TPD gets backed by Scout
  // and Maverick (30K TPM, 500K TPD each) and finally llama-3.3-70b (12K TPM,
  // 100K TPD). `maxTokens` overrides the request's completion budget — the
  // 30K-TPM models can afford a bigger ask, which also prevents the truncated
  // JSON that made Scout fail json_object validation on the old 3584 cap.
  llmFallbacks: [
    {
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      apiKeyEnv: 'GROQ_API_KEY',
      maxTokens: 8000,
    },
    {
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      apiKeyEnv: 'GROQ_API_KEY',
      maxTokens: 8000,
    },
    {
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
      apiKeyEnv: 'GROQ_API_KEY',
    },
  ],

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
