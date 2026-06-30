import { listPosts, listReviews } from '@/lib/posts';
import { SITE_URL } from '@/lib/structured-data';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = SITE_URL;
  const [posts, reviews] = await Promise.all([listPosts(), listReviews()]);

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: new Date(p.frontmatter.date),
    changeFrequency: 'never',
    priority: 0.8,
  }));

  const categories = Array.from(new Set(posts.map((p) => p.frontmatter.category)));
  const catEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteUrl}/categories/${c}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.5,
  }));

  // Programmatic "where to watch" pages (one per structured review) + the hub.
  const watchEntries: MetadataRoute.Sitemap = reviews.map((p) => ({
    url: `${siteUrl}/where-to-watch/${p.slug}`,
    lastModified: new Date(p.frontmatter.date),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/where-to-watch`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/stats`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.3 },
    ...postEntries,
    ...watchEntries,
    ...catEntries,
  ];
}
