// AdSense configuration. The publisher id (public value) defaults from
// site.config.ts; override per-deploy with NEXT_PUBLIC_ADSENSE_CLIENT. Slot ids
// are account-specific ad units — set them to render the manual in-article and
// footer slots; without them those slots stay empty (Auto Ads still works from
// the loaded script if enabled in the dashboard).
import { siteConfig } from '@/site.config';

export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT || siteConfig.adsenseClient;

export const ADSENSE_SLOT_IN_ARTICLE = process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE;
export const ADSENSE_SLOT_FOOTER = process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER;
// In-body units, placed at the MDX contract's section seams (see ArticleBody):
// TOP renders after the lead + takeaway callout, MID before "How to think about
// it". Unset ids mean the body renders whole, with no ad and no split.
export const ADSENSE_SLOT_ARTICLE_TOP = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_TOP;
export const ADSENSE_SLOT_ARTICLE_MID = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID;
// Listing unit shown on the homepage between the lead story and the grid.
export const ADSENSE_SLOT_LISTING = process.env.NEXT_PUBLIC_ADSENSE_SLOT_LISTING;
