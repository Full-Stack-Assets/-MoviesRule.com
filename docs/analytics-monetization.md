# Analytics and monetization activation

Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to the `moviesrule.com` stream in the portfolio GA4 property and `NEXT_PUBLIC_PORTFOLIO_SITE_ID=moviesrule`. The script is omitted if the ID is absent.

The shared contract automatically records `article_scroll` (50/90), `outbound_click`, `internal_recirculation`, `affiliate_click`, and explicitly tagged CTAs such as `newsletter_signup`. New monetized links should include `data-analytics-event`, `data-merchant`, and `data-placement` as appropriate.

Before monetization, verify the Search Console domain property, register GA4 custom dimensions, link GA4 to AdSense, install a Google-certified CMP for applicable AdSense traffic, and keep affiliate or sponsor disclosures beside each recommendation. AdSense serving is disabled until `NEXT_PUBLIC_GOOGLE_CERTIFIED_CMP_ACTIVE=true`; set that only after provider verification. Affiliate tags and ad slots must remain disabled until real approved values are configured.

The film/TV relevance gate runs before new topics are scored and while persisted posts are exposed to the static renderer. Off-topic source files remain recoverable in the repository but are omitted from listings, taxonomy, feeds, sitemaps, and generated routes. Structured film reviews always remain eligible.
