'use client';

import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT as CLIENT } from '@/lib/ads';

/**
 * A single AdSense ad unit. The publisher id is configured by default (see
 * src/lib/ads.ts), so this renders nothing unless a `slot` id is also set — the
 * manual slots stay empty until their ad-unit ids are provided (Auto Ads still
 * works from the site-wide script regardless).
 *
 * Units are lazy-initialized: the adsbygoogle push (which triggers the ad
 * request + iframe) only fires once the slot scrolls within ~200px of the
 * viewport, so below-the-fold ads never compete with content for bandwidth or
 * main-thread time (CWV). Falls back to eager init where IntersectionObserver
 * is unavailable.
 */
export function AdSlot({
  slot,
  format = 'auto',
  layout,
  className = '',
}: {
  slot?: string;
  format?: string;
  layout?: string;
  className?: string;
}) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT || !slot || pushed.current) return;
    const el = ref.current;
    if (!el) return;

    const push = () => {
      if (pushed.current) return;
      pushed.current = true;
      try {
        ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []).push({});
      } catch {
        // AdSense script not ready or blocked — leave the slot empty.
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      push();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          push();
          io.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [slot]);

  if (!CLIENT || !slot) return null;

  return (
    <ins
      ref={ref}
      className={`adsbygoogle ${className}`}
      style={{ display: 'block' }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
      {...(layout ? { 'data-ad-layout': layout } : {})}
      aria-label="Advertisement"
    />
  );
}
