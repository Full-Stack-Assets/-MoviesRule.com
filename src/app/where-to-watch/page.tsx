import Link from 'next/link';
import type { Metadata } from 'next';
import { listPosts, listReviews } from '@/lib/posts';
import { SITE_URL, SITE_NAME } from '@/lib/structured-data';
import { justWatchHomeUrl } from '@/lib/affiliate';

export const revalidate = 300;

const TITLE = 'Where to Watch — Streaming Guides';
const DESCRIPTION =
  'Find where to stream, rent, or buy the movies and shows worth your time — current availability plus our reviews.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/where-to-watch` },
  openGraph: { type: 'website', url: `${SITE_URL}/where-to-watch`, title: TITLE, description: DESCRIPTION },
};

export default async function WhereToWatchHub() {
  const [reviews, all] = await Promise.all([listReviews(), listPosts()]);
  // Streaming-focused editorial guides (the "what's worth streaming" content).
  const guides = all.filter((p) => p.frontmatter.category === 'streaming').slice(0, 24);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-20">
      <header className="mb-12">
        <h1 className="font-display text-4xl sm:text-6xl font-black leading-[1.02] tracking-tight">
          Where to <span className="text-accent">watch</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/80">
          The films and shows everyone&rsquo;s talking about — and exactly where to stream, rent, or
          buy them. Availability is checked live, so the options are always current.
        </p>
        <a
          href={justWatchHomeUrl()}
          target="_blank"
          rel="nofollow noopener"
          className="mt-6 inline-block border border-accent px-4 py-2 font-display text-sm font-semibold text-accent hover:bg-accent hover:text-paper transition-colors"
        >
          Search any title on JustWatch →
        </a>
      </header>

      {/* Per-film where-to-watch pages (populate as the reviews layer runs) */}
      {reviews.length > 0 && (
        <section className="mb-16">
          <h2 className="mb-6 font-display text-sm font-bold uppercase tracking-[0.3em] text-muted">
            By film
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reviews.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/where-to-watch/${p.slug}`}
                  className="block border border-ink/20 px-4 py-3 font-display font-semibold hover:border-accent hover:text-accent transition-colors"
                >
                  {p.frontmatter.film?.title ?? p.frontmatter.title}
                  {p.frontmatter.film?.year ? ` (${p.frontmatter.film.year})` : ''}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Streaming guides */}
      <section>
        <h2 className="mb-6 font-display text-sm font-bold uppercase tracking-[0.3em] text-muted">
          Streaming guides
        </h2>
        {guides.length > 0 ? (
          <ul className="space-y-6">
            {guides.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group block">
                  <div className="font-display text-xl font-bold leading-snug group-hover:text-accent transition-colors">
                    {p.frontmatter.title}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70 line-clamp-2">
                    {p.frontmatter.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink/70">New streaming guides are published regularly — check back soon.</p>
        )}
      </section>

      <div className="mt-16 border-t border-ink/20 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 font-display font-semibold text-accent hover:gap-3 transition-all">
          ← Back to {SITE_NAME}
        </Link>
      </div>
    </div>
  );
}
