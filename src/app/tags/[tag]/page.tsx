import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { listPosts } from '@/lib/posts';
import { SITE_URL, SITE_NAME } from '@/lib/structured-data';

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await listPosts();
  const tags = Array.from(new Set(posts.flatMap((p) => p.frontmatter.tags ?? [])));
  return tags.map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const description = `Everything tagged “${tag}” on ${SITE_NAME}.`;
  const url = `${SITE_URL}/tags/${tag}`;
  return {
    title: `#${tag}`,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: `#${tag} — ${SITE_NAME}`, description },
    twitter: { card: 'summary', title: `#${tag} — ${SITE_NAME}`, description },
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const all = await listPosts();
  const posts = all.filter((p) => p.frontmatter.tags?.includes(tag));
  if (posts.length === 0) notFound();

  // Related tags = tags that co-occur with this one, ranked by overlap.
  const cooccur = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.frontmatter.tags ?? []) {
      if (t === tag) continue;
      cooccur.set(t, (cooccur.get(t) ?? 0) + 1);
    }
  }
  const relatedTags = Array.from(cooccur.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([t]) => t);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 border-b-2 border-ink pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">Tag</div>
        <h1 className="mt-2 font-display text-5xl font-black">#{tag}</h1>
        <p className="mt-2 text-muted">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
      </div>
      <ul className="divide-y divide-ink/20">
        {posts.map((p) => (
          <li key={p.slug} className="py-6">
            <Link href={`/blog/${p.slug}`} className="group block">
              <h2 className="font-display text-2xl font-semibold group-hover:text-accent transition-colors">
                {p.frontmatter.title}
              </h2>
              <p className="mt-1 text-ink/70">{p.frontmatter.description}</p>
            </Link>
          </li>
        ))}
      </ul>
      {relatedTags.length > 0 && (
        <nav aria-label="Related tags" className="mt-16 border-t border-ink/20 pt-8">
          <div className="mb-4 font-display text-xs font-bold uppercase tracking-[0.3em] text-muted">
            Related tags
          </div>
          <div className="flex flex-wrap gap-2">
            {relatedTags.map((t) => (
              <Link
                key={t}
                href={`/tags/${t}`}
                className="border border-ink/30 px-3 py-1.5 text-sm hover:border-accent hover:text-accent transition-colors"
              >
                #{t}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
