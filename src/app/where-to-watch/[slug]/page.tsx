import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { loadPost, listReviews } from '@/lib/posts';
import { WhereToWatch } from '@/components/WhereToWatch';
import { scoreToStars, verdictLabel } from '@/lib/reviews';
import {
  SITE_URL,
  SITE_NAME,
  movieJsonLd,
  faqListJsonLd,
} from '@/lib/structured-data';

export const revalidate = 300;

/**
 * Evergreen, transactional "where to watch X" page — one per structured film
 * review. Targets high-intent "is X streaming / where to watch X" searches and
 * pairs the answer with the affiliate where-to-watch rail. Generates nothing
 * until the reviews layer (TMDB_API_KEY) is producing reviews with film facts;
 * each page always has a companion review, so it's never a thin doorway page.
 */
export async function generateStaticParams() {
  const reviews = await listReviews();
  return reviews.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  const film = post?.frontmatter.film;
  if (!film) return { title: 'Not found' };

  const yr = film.year ? ` (${film.year})` : '';
  const title = `Where to Watch ${film.title}${yr} — Stream, Rent & Buy`;
  const description = `How and where to watch ${film.title}${yr} online — current streaming, rental, and purchase options, plus our review.`;
  const url = `${SITE_URL}/where-to-watch/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      images: film.posterUrl ? [film.posterUrl] : [],
    },
  };
}

export default async function WhereToWatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await loadPost(slug);
  const film = post?.frontmatter.film;
  // Only films with TMDB facts get a page; everything else 404s.
  if (!post || post.frontmatter.type !== 'review' || !film) notFound();

  // Future-dated (scheduled) reviews stay unpublished here too.
  if (new Date(post.frontmatter.date).getTime() > Date.now()) notFound();

  const yr = film.year ? ` (${film.year})` : '';
  const providers = post.frontmatter.watchOn ?? film.watchProviders ?? [];
  const url = `${SITE_URL}/where-to-watch/${slug}`;
  const score = post.frontmatter.rating?.score;

  const facts: Array<[string, string]> = [
    film.director ? ['Director', film.director] : null,
    film.cast?.length ? ['Starring', film.cast.slice(0, 4).join(', ')] : null,
    film.genres?.length ? ['Genre', film.genres.join(', ')] : null,
    film.runtimeMin ? ['Runtime', `${film.runtimeMin} min`] : null,
    film.releaseDate ? ['Released', film.releaseDate] : null,
  ].filter((x): x is [string, string] => x !== null);

  const faqs = buildWatchFaqs(film.title, providers);

  const movie = movieJsonLd(film, { url, score });
  const faqLd = faqListJsonLd(faqs);
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Where to Watch', item: `${SITE_URL}/where-to-watch` },
      { '@type': 'ListItem', position: 3, name: film.title, item: url },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
      {[movie, faqLd, breadcrumb].map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }}
        />
      ))}

      <div className="mb-4 text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/where-to-watch" className="hover:text-accent">Where to Watch</Link>
      </div>
      <h1 className="marquee text-4xl sm:text-5xl leading-[1.05]">
        Where to watch {film.title}
        <span className="text-muted">{yr}</span>
      </h1>

      <p className="mt-6 text-lg leading-relaxed text-ink/80">
        Looking to stream, rent, or buy <strong>{film.title}</strong>? Here are the current options,
        plus our verdict. Availability shifts as licensing deals change — the links below always
        resolve to live, up-to-date listings.
      </p>

      {/* Where to watch rail (provider chips + affiliate links) */}
      <WhereToWatch ctx={{ title: film.title, providers }} />

      {/* Film facts */}
      {facts.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-[0.3em] text-muted">
            The film
          </h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-ink/10 py-2">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="text-sm font-medium text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Link to the full review */}
      <section className="mt-12 border-2 border-ink p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-display text-lg font-bold">Our review of {film.title}</div>
            {typeof score === 'number' && (
              <div className="mt-1 text-sm text-muted">
                {scoreToStars(score)} / 5 stars · {verdictLabel(score)}
                {post.frontmatter.verdict ? ` — ${post.frontmatter.verdict}` : ''}
              </div>
            )}
          </div>
          <Link
            href={`/blog/${slug}`}
            className="inline-block border border-accent bg-accent px-4 py-2 font-display text-sm font-semibold text-paper hover:bg-transparent hover:text-accent transition-colors"
          >
            Read the full review →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-[0.3em] text-muted">
          FAQ
        </h2>
        <div className="space-y-5">
          {faqs.map((f) => (
            <div key={f.question}>
              <div className="font-display font-bold">{f.question}</div>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-16 border-t border-ink/20 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 font-display font-semibold text-accent hover:gap-3 transition-all">
          ← Back to {SITE_NAME}
        </Link>
      </div>
    </article>
  );
}

/** Build the templated-but-honest watch FAQ for a film + its provider list. */
function buildWatchFaqs(
  title: string,
  providers: string[]
): Array<{ question: string; answer: string }> {
  const onList =
    providers.length > 0
      ? `${title} is currently available on ${listToProse(providers)} in the US. `
      : `Streaming availability for ${title} changes often. `;
  return [
    {
      question: `Where can I watch ${title}?`,
      answer: `${onList}Use the JustWatch link above to see every live streaming, rental, and purchase option for your region.`,
    },
    {
      question: `Is ${title} streaming?`,
      answer:
        providers.length > 0
          ? `Yes — ${title} is streaming on ${listToProse(providers)}. Check the providers above for the current offer in your country.`
          : `Not on a fixed subscription service right now. It may be available to rent or buy — check the up-to-date options above.`,
    },
    {
      question: `Can I rent or buy ${title}?`,
      answer: `In most regions ${title} can be rented or purchased digitally (e.g. via Amazon, Apple TV, or Google Play). The "rent or buy" link above goes to live pricing.`,
    },
  ];
}

function listToProse(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
