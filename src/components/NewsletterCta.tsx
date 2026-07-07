import { SubscribeForm } from '@/components/SubscribeForm';
import { siteConfig } from '@/site.config';

/**
 * Inline newsletter capture for article pages — a higher-intent surface than
 * the footer form (readers who reach the end of a post are the ones who
 * convert). Same /api/subscribe backend as the footer SubscribeForm; branding
 * comes from siteConfig per the no-hardcoding rule.
 */
export function NewsletterCta() {
  return (
    <aside
      aria-label="Newsletter signup"
      className="mt-16 border-2 border-accent bg-accent/[0.04] p-6 sm:p-8"
    >
      <div className="font-display text-sm font-bold uppercase tracking-[0.3em] text-accent">
        The weekly dispatch
      </div>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/75">
        Enjoyed this? Get the week&rsquo;s best from {siteConfig.name} — {siteConfig.tagline.toLowerCase()} —
        in one email. No spam, unsubscribe anytime.
      </p>
      <div className="mt-4">
        <SubscribeForm />
      </div>
    </aside>
  );
}
