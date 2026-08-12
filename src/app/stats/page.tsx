import Link from 'next/link';
import { listPosts } from '@/lib/posts';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { TopicLog } from '@/lib/orchestrator/types';
import { SITE_NAME } from '@/lib/structured-data';

export const revalidate = 300;
export const metadata = {
  title: 'Publishing Operations',
  description: 'Repository-backed MoviesRule research and publishing pipeline telemetry.',
};

async function loadLog(): Promise<TopicLog> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'content', '.topic-log.json'), 'utf8');
    return JSON.parse(raw) as TopicLog;
  } catch {
    return { topics: [] };
  }
}

function compactDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function StatsPage() {
  const posts = await listPosts();
  const log = await loadLog();
  const now = Date.now();
  const weekCutoff = now - 7 * 24 * 60 * 60 * 1000;
  const publishedThisWeek = posts.filter((post) => {
    const timestamp = new Date(post.frontmatter.date).getTime();
    return Number.isFinite(timestamp) && timestamp >= weekCutoff;
  }).length;
  const sources = new Set(
    posts.flatMap((post) => (post.frontmatter.sources ?? []).map((source) => source.url)),
  );

  const byCategory = Object.entries(
    posts.reduce<Record<string, number>>((totals, post) => {
      const category = post.frontmatter.category || 'uncategorized';
      totals[category] = (totals[category] ?? 0) + 1;
      return totals;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const recentArticles = posts.slice(0, 5);
  const recentTopics = log.topics.slice(-6).reverse();
  const pipelineHealthy = posts.length > 0 && log.topics.length > 0;

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-[#181a22]">
      <div className="grid min-h-screen lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="border-r border-white/10 bg-[#11131b] px-4 py-5 text-white">
          <div className="flex min-h-[calc(100vh-2.5rem)] flex-col">
            <Link href="/" className="flex items-center gap-3 border-b border-white/10 px-2 pb-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black shadow-[0_12px_30px_rgba(79,70,229,.25)]">MR</span>
              <div>
                <strong className="block text-sm tracking-tight">MoviesRule.com</strong>
                <span className="mt-1 block text-[9px] uppercase tracking-[0.2em] text-white/40">Publishing operations</span>
              </div>
            </Link>

            <nav className="mt-5 space-y-1" aria-label="Publishing dashboard navigation">
              <NavItem href="/stats" label="Dashboard" active glyph="01" />
              <NavItem href="/blog" label="Articles" glyph="02" />
              <NavItem href="#research" label="Research" glyph="03" />
              <NavItem href="#sources" label="Sources" glyph="04" />
              <NavItem href="#newsletter" label="Newsletter" glyph="05" />
              <NavItem href="#settings" label="Settings" glyph="06" />
            </nav>

            <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/40">Authority boundary</p>
              <p className="mt-3 text-xs leading-5 text-white/65">This surface reports repository content and workflow configuration. It does not publish, edit, or widen automation permissions.</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto max-w-[1420px]">
            <header className="flex flex-col gap-5 border-b border-black/8 pb-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-600">MoviesRule.com control plane</p>
                <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.055em] sm:text-5xl xl:text-6xl">Autonomous Research-to-Publishing Pipeline</h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">From discovery to publication, every visible metric below is derived from repository content, the topic ledger, or the hourly workflow definition.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                <span className="rounded-full border border-black/8 bg-white px-3 py-2">Repository-backed</span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-violet-700">Review branch</span>
              </div>
            </header>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Publishing metrics">
              <Metric label="Articles Published" value={String(posts.length)} detail={`${Object.keys(Object.fromEntries(byCategory)).length} categories`} tone="violet" />
              <Metric label="This Week" value={String(publishedThisWeek)} detail="Published in the last 7 days" tone="blue" />
              <Metric label="Topics Logged" value={String(log.topics.length)} detail="Deduplicated research ledger" tone="amber" />
              <Metric label="Source Records" value={String(sources.size)} detail="Unique cited destinations" tone="emerald" />
            </section>

            <section className="mt-5 overflow-hidden rounded-3xl border border-black/8 bg-white shadow-[0_24px_70px_rgba(20,24,40,.08)]">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/7 px-5 py-5 sm:px-6">
                <div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Content stream</p><h2 className="mt-2 text-xl font-bold tracking-tight">Recent Articles</h2></div>
                <Link href="/blog" className="rounded-full border border-black/8 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 hover:border-violet-300 hover:text-violet-700">View editorial site</Link>
              </div>

              <div className="divide-y divide-black/6">
                {recentArticles.length > 0 ? recentArticles.map((post, index) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group grid gap-4 px-5 py-4 transition hover:bg-violet-50/40 sm:grid-cols-[52px_minmax(0,1fr)_auto_auto] sm:items-center sm:px-6">
                    <span className={`flex size-12 items-center justify-center rounded-xl text-xs font-black ${['bg-violet-100 text-violet-700','bg-blue-100 text-blue-700','bg-amber-100 text-amber-700','bg-emerald-100 text-emerald-700','bg-rose-100 text-rose-700'][index % 5]}`}>{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0"><strong className="block truncate text-sm text-slate-900 group-hover:text-violet-700">{post.frontmatter.title}</strong><span className="mt-1 block truncate text-[11px] text-slate-400">{post.frontmatter.category} · {post.readingTimeMin} min read</span></div>
                    <time className="text-[11px] text-slate-400" dateTime={post.frontmatter.date}>{compactDate(post.frontmatter.date)}</time>
                    <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">Published</span>
                  </Link>
                )) : <p className="px-6 py-12 text-center text-sm text-slate-400">No published articles are present in the repository yet.</p>}
              </div>
            </section>

            <section className="mt-5 grid gap-4 md:grid-cols-3">
              <StatusCard id="sources" eyebrow="Sources" value={`${sources.size} unique`} detail="Citations attached to published articles" glyph="SC" tone="violet" />
              <StatusCard eyebrow="Pipeline" value={pipelineHealthy ? 'Healthy' : 'Awaiting content'} detail={pipelineHealthy ? 'Repository and topic ledger both populated' : 'No unsupported success state is shown'} glyph="PL" tone="emerald" />
              <StatusCard eyebrow="Next Run" value="Top of hour" detail="GitHub workflow schedule: 0 * * * *" glyph="NR" tone="blue" />
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
              <article className="rounded-3xl border border-black/8 bg-white p-5 sm:p-6" id="research">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Editorial distribution</p>
                <h2 className="mt-2 text-xl font-bold">Articles by category</h2>
                <div className="mt-6 space-y-4">
                  {byCategory.slice(0, 8).map(([category, count]) => {
                    const percentage = posts.length > 0 ? Math.max(4, Math.round((count / posts.length) * 100)) : 0;
                    return <div key={category}><div className="mb-2 flex items-center justify-between gap-4 text-xs"><span className="capitalize text-slate-600">{category}</span><span className="font-mono text-slate-400">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-400" style={{ width: `${percentage}%` }} /></div></div>;
                  })}
                  {byCategory.length === 0 ? <p className="text-sm text-slate-400">Category data appears after the first published article.</p> : null}
                </div>
              </article>

              <article className="rounded-3xl border border-black/8 bg-[#171924] p-5 text-white sm:p-6" id="newsletter">
                <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-300">Research ledger</p><h2 className="mt-2 text-xl font-bold">Latest topic decisions</h2></div><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-white/45">Read-only telemetry</span></div>
                <div className="mt-5 divide-y divide-white/8">
                  {recentTopics.length > 0 ? recentTopics.map((topic) => (
                    <div key={`${topic.signature}-${topic.slug}`} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm text-white/90">{topic.title}</p><p className="mt-1 truncate font-mono text-[9px] text-white/35">{topic.signature.slice(0, 12)}… → /blog/{topic.slug}</p></div><time className="text-[10px] text-white/40" dateTime={topic.publishedAt}>{compactDate(topic.publishedAt)}</time></div>
                  )) : <p className="py-10 text-sm text-white/45">No topic-ledger entries have been recorded yet.</p>}
                </div>
              </article>
            </section>

            <section className="mt-5 rounded-3xl border border-black/8 bg-gradient-to-br from-violet-50 to-white p-6" id="settings">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-600">System statement</p>
              <p className="mt-3 max-w-5xl text-2xl font-semibold leading-tight tracking-[-0.035em] text-slate-900 sm:text-3xl">Autonomous content infrastructure that researches, validates, and publishes at scale while keeping its evidence and automation boundaries visible.</p>
              <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-violet-200 bg-white px-3 py-2 text-[10px] text-violet-700">Automation</span><span className="rounded-full border border-amber-200 bg-white px-3 py-2 text-[10px] text-amber-700">Content</span><span className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-[10px] text-emerald-700">Publishing</span></div>
              <Link href="/" className="mt-6 inline-flex text-xs font-semibold text-violet-700">← Back to {SITE_NAME}</Link>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function NavItem({ href, label, glyph, active = false }: { href: string; label: string; glyph: string; active?: boolean }) {
  return <Link href={href} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${active ? 'border-violet-400/20 bg-violet-500/15 text-white' : 'border-transparent text-white/50 hover:border-white/10 hover:bg-white/[0.04] hover:text-white/85'}`}><span className={`flex size-8 items-center justify-center rounded-lg text-[9px] font-bold ${active ? 'bg-violet-500/20 text-violet-200' : 'bg-white/[0.04] text-white/35'}`}>{glyph}</span>{label}{active ? <span className="ml-auto size-1.5 rounded-full bg-violet-300" /> : null}</Link>;
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'violet' | 'blue' | 'amber' | 'emerald' }) {
  const styles = { violet: 'bg-violet-50 text-violet-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700' }[tone];
  return <article className="rounded-2xl border border-black/8 bg-white p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p><strong className="mt-3 block text-3xl tracking-[-0.045em] text-slate-900">{value}</strong></div><span className={`flex size-9 items-center justify-center rounded-xl text-xs font-black ${styles}`}>↗</span></div><p className="mt-4 text-[11px] text-slate-400">{detail}</p></article>;
}

function StatusCard({ id, eyebrow, value, detail, glyph, tone }: { id?: string; eyebrow: string; value: string; detail: string; glyph: string; tone: 'violet' | 'emerald' | 'blue' }) {
  const styles = { violet: 'bg-violet-100 text-violet-700', emerald: 'bg-emerald-100 text-emerald-700', blue: 'bg-blue-100 text-blue-700' }[tone];
  return <article id={id} className="flex items-center gap-4 rounded-2xl border border-black/8 bg-white p-5"><span className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-[10px] font-black ${styles}`}>{glyph}</span><div><p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p><strong className="mt-1 block text-lg text-slate-900">{value}</strong><p className="mt-1 text-[10px] text-slate-400">{detail}</p></div></article>;
}
