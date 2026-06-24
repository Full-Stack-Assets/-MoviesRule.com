import { defineConfig } from 'tinacms';
import { siteConfig } from '../src/site.config';

// Tina v2 config. Run `npm run dev` to start the editor at /admin/index.html.
// For self-hosted mode (no Tina Cloud), leave clientId/token blank and Tina
// will use the local filesystem directly.
const isCloudEnabled = !!(process.env.NEXT_PUBLIC_TINA_CLIENT_ID && process.env.TINA_TOKEN);

// Derive the editor's category dropdown from the single source of truth in
// site.config.ts so the two never drift apart. "news" -> { value: 'news', label: 'News' }.
const categoryOptions = siteConfig.categories.map((c) => ({
  value: c,
  label: c.charAt(0).toUpperCase() + c.slice(1),
}));

export default defineConfig({
  branch: process.env.GITHUB_BRANCH ?? 'main',
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,

  // Skip client SDK generation when running in self-hosted mode
  client: {
    skip: !isCloudEnabled,
  },

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'uploads',
      publicFolder: 'public',
    },
  },

  schema: {
    collections: [
      {
        name: 'post',
        label: 'Posts',
        path: 'content/posts',
        format: 'mdx',
        ui: {
          router: ({ document }) => `/blog/${document._sys.filename}`,
        },
        fields: [
          { name: 'title', label: 'Title', type: 'string', required: true, isTitle: true },
          { name: 'description', label: 'Description', type: 'string', required: true, ui: { component: 'textarea' } },
          { name: 'date', label: 'Date', type: 'datetime', required: true },
          {
            name: 'category',
            label: 'Category',
            type: 'string',
            required: true,
            options: categoryOptions,
          },
          {
            name: 'type',
            label: 'Type',
            type: 'string',
            description: 'Defaults to a news/editorial post. Set to "review" for film reviews.',
            options: [
              { value: 'post', label: 'News / editorial post' },
              { value: 'review', label: 'Film review' },
            ],
          },
          { name: 'tags', label: 'Tags', type: 'string', list: true },
          {
            name: 'hero',
            label: 'Hero image',
            type: 'object',
            fields: [
              { name: 'url', label: 'URL', type: 'string' },
              { name: 'alt', label: 'Alt text', type: 'string' },
              { name: 'credit', label: 'Credit', type: 'string' },
              { name: 'creditUrl', label: 'Credit URL', type: 'string' },
            ],
          },
          {
            name: 'sources',
            label: 'Sources',
            type: 'object',
            list: true,
            fields: [
              { name: 'title', label: 'Title', type: 'string' },
              { name: 'url', label: 'URL', type: 'string' },
            ],
          },
          // ── Reviews layer (only populated when Type = review) ──
          { name: 'verdict', label: 'Verdict (one line)', type: 'string' },
          {
            name: 'rating',
            label: 'Rating',
            type: 'object',
            fields: [{ name: 'score', label: 'Score (0–100)', type: 'number' }],
          },
          { name: 'watchOn', label: 'Watch on', type: 'string', list: true },
          {
            name: 'film',
            label: 'Film (TMDB facts)',
            type: 'object',
            fields: [
              { name: 'tmdbId', label: 'TMDB ID', type: 'number' },
              { name: 'title', label: 'Title', type: 'string' },
              { name: 'year', label: 'Year', type: 'number' },
              { name: 'director', label: 'Director', type: 'string' },
              { name: 'cast', label: 'Cast', type: 'string', list: true },
              { name: 'genres', label: 'Genres', type: 'string', list: true },
              { name: 'runtimeMin', label: 'Runtime (min)', type: 'number' },
              { name: 'releaseDate', label: 'Release date', type: 'string' },
              { name: 'posterUrl', label: 'Poster URL', type: 'string' },
              { name: 'backdropUrl', label: 'Backdrop URL', type: 'string' },
              { name: 'overview', label: 'Overview', type: 'string', ui: { component: 'textarea' } },
              { name: 'watchProviders', label: 'Watch providers', type: 'string', list: true },
              { name: 'tmdbUrl', label: 'TMDB URL', type: 'string' },
            ],
          },
          {
            name: 'audio',
            label: 'Audio narration (optional)',
            type: 'object',
            fields: [
              { name: 'url', label: 'Audio URL', type: 'string' },
              { name: 'voice', label: 'Voice', type: 'string' },
            ],
          },
          {
            name: 'body',
            label: 'Body',
            type: 'rich-text',
            isBody: true,
            templates: [
              {
                name: 'Callout',
                label: 'Callout',
                fields: [
                  {
                    name: 'type',
                    label: 'Type',
                    type: 'string',
                    options: ['takeaway', 'warning', 'note'],
                  },
                ],
              },
              { name: 'ProsCons', label: 'Pros/Cons block', fields: [{ name: '_placeholder', label: '-', type: 'string' }] },
              { name: 'Pros', label: 'Pros', fields: [{ name: '_placeholder', label: '-', type: 'string' }] },
              { name: 'Cons', label: 'Cons', fields: [{ name: '_placeholder', label: '-', type: 'string' }] },
              { name: 'FAQ', label: 'FAQ', fields: [{ name: '_placeholder', label: '-', type: 'string' }] },
              {
                name: 'Question',
                label: 'Question',
                fields: [{ name: 'q', label: 'Question', type: 'string' }],
              },
            ],
          },
        ],
      },
    ],
  },
});
