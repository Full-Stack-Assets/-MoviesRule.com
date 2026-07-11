import {
  type WatchContext,
  providerLink,
  amazonSearchUrl,
  amazonBluRayUrl,
  justWatchSearchUrl,
  justWatchHomeUrl,
  VPN_AFFILIATE_URL,
  VPN_AFFILIATE_NAME,
  AFFILIATE_ENABLED,
} from '@/lib/affiliate';

// rel for outbound affiliate (earning) links — sponsored + nofollow per policy.
const AFF_REL = 'sponsored nofollow noopener';
// rel for plain discovery links (JustWatch / provider search) — not earning.
const NAV_REL = 'nofollow noopener';

/**
 * "Where to watch" rail for film-content posts. Server component, rendered from
 * frontmatter via watchContextFor(). Two modes:
 *  - titled  → a specific film/show: provider chips + title-scoped search links.
 *  - generic → film-adjacent post with no precise title: a discovery rail.
 * Earning links (Amazon, VPN) only appear when their env vars are set; the
 * disclosure only shows when an earning link is actually present.
 */
export function WhereToWatch({ ctx }: { ctx: WatchContext }) {
  const { title, providers } = ctx;
  const amazon = title ? amazonSearchUrl(title) : null;
  const bluRay = title ? amazonBluRayUrl(title) : null;
  const jwUrl = title ? justWatchSearchUrl(title) : justWatchHomeUrl();
  const heading = title ? `Where to watch ${title}` : 'Where to watch';

  return (
    <section
      aria-label="Where to watch"
      className="card-poster mt-16 rounded-lg p-6 sm:p-8"
    >
      <div className="mb-4 font-display text-sm font-bold uppercase tracking-[0.3em] text-gold">
        {heading}
      </div>

      {providers.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-ink/70">
            Streaming and rental options{title ? ` for ${title}` : ''} in your region:
          </p>
          <ul className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <li key={p}>
                <a
                  href={providerLink(p, title ?? p)}
                  target="_blank"
                  rel={NAV_REL}
                  className="inline-block rounded-full border border-ink/25 px-3 py-1.5 text-sm font-medium hover:border-gold hover:text-gold transition-colors"
                >
                  {p}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mb-4 text-sm text-ink/70">
          Streaming availability changes constantly. Check where it&apos;s playing right now —
          subscription, rent, or buy:
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <a
          href={jwUrl}
          target="_blank"
          rel={NAV_REL}
          className="font-display font-semibold text-accent hover:underline"
        >
          See all options on JustWatch →
        </a>
        {amazon && (
          <a href={amazon} target="_blank" rel={AFF_REL} className="text-ink/80 hover:text-accent">
            Rent or buy on Amazon
          </a>
        )}
        {bluRay && (
          <a href={bluRay} target="_blank" rel={AFF_REL} className="text-ink/80 hover:text-accent">
            Own it on Blu-ray / 4K
          </a>
        )}
        {VPN_AFFILIATE_URL && (
          <a
            href={VPN_AFFILIATE_URL}
            target="_blank"
            rel={AFF_REL}
            className="text-ink/80 hover:text-accent"
          >
            Region-locked? Watch with {VPN_AFFILIATE_NAME || 'a VPN'}
          </a>
        )}
      </div>

      {AFFILIATE_ENABLED && (
        <p className="mt-5 border-t border-ink/15 pt-3 text-xs leading-relaxed text-muted">
          Some links above are affiliate links. If you sign up or buy through them we may earn a
          small commission, at no extra cost to you. It never affects our reviews or what we cover.
        </p>
      )}
    </section>
  );
}
