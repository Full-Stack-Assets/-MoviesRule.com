import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { listPosts } from '@/lib/posts';
import { SITE_URL, SITE_NAME } from '@/lib/structured-data';

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await listPosts();
  const cats = Array.from(new Set(posts.map((p) => p.frontmatter.category)));
  return cats.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const label = category[0]?.toUpperCase() + category.slice(1);
  const description = `The latest ${category} coverage from ${SITE_NAME}.`;
  const url = `${SITE_URL}/categories/${category}`;
  return {
    title: label,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: `${label} — ${SITE_NAME}`, description },
    twitter: { card: 'summary', title: `${label} — ${SITE_NAME}`, description },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const all = await listPosts();
  const posts = all.filter((p) => p.frontmatter.category === category);
  if (posts.length === 0) notFound();

  // Cross-link every other section that actually has posts.
  const otherCategories = Array.from(new Set(all.map((p) => p.frontmatter.category)))
    .filter((c) => c !== category)
    .sort();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 border-b-2 border-ink pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">Category</div>
        <h1 className="mt-2 font-display text-5xl font-black capitalize">{category}</h1>
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
              <div className="mt-2 text-xs uppercase tracking-widest text-muted">
                {new Date(p.frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}{p.readingTimeMin} min
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {otherCategories.length > 0 && (
        <nav aria-label="Other categories" className="mt-16 border-t border-ink/20 pt-8">
          <div className="mb-4 font-display text-xs font-bold uppercase tracking-[0.3em] text-muted">
            More sections
          </div>
          <div className="flex flex-wrap gap-2">
            {otherCategories.map((c) => (
              <Link
                key={c}
                href={`/categories/${c}`}
                className="border border-ink/30 px-3 py-1.5 text-sm capitalize hover:border-accent hover:text-accent transition-colors"
              >
                {c}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
