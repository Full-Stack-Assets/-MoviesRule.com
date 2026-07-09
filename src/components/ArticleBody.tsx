import { Fragment } from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { mdxComponents } from '@/components/mdx';
import { AdSlot } from '@/components/AdSlot';
import { ADSENSE_SLOT_ARTICLE_TOP, ADSENSE_SLOT_ARTICLE_MID } from '@/lib/ads';

// The MDX contract (see CLAUDE.md) guarantees these top-level section headings,
// which gives us stable, content-safe seams to place in-body ad units at:
//   "## What happened"          → right after the lead + takeaway callout
//   "## How to think about it"  → mid-article, after the analysis sections
// Each seam only activates when its ad-unit id is configured; a body that lacks
// the heading (or repeats it, e.g. quoted inside a paragraph at line start)
// simply skips that seam. With no ids set the body renders exactly as before.
const SEAMS: Array<{ heading: string; slot?: string }> = [
  { heading: '## What happened', slot: ADSENSE_SLOT_ARTICLE_TOP },
  { heading: '## How to think about it', slot: ADSENSE_SLOT_ARTICLE_MID },
];

/**
 * Split `src` before `heading` iff the heading occurs exactly once as a
 * markdown heading line. Generated posts sometimes indent body lines by a few
 * spaces; up to 3 leading spaces is still a heading per markdown (4+ would be
 * a code block), so allow that.
 */
function splitAtHeading(src: string, heading: string): [string, string] | null {
  const re = new RegExp(`^ {0,3}${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*$`, 'gm');
  const matches = Array.from(src.matchAll(re));
  if (matches.length !== 1 || matches[0].index === undefined || matches[0].index === 0) return null;
  return [src.slice(0, matches[0].index), src.slice(matches[0].index)];
}

/**
 * Renders a post body, interleaving lazy in-article ad units at the contract's
 * section boundaries. Splitting at a top-level `## ` heading keeps every
 * segment independently valid MDX (headings never sit inside a JSX block in
 * contract-shaped posts).
 */
export function ArticleBody({ body }: { body: string }) {
  const segments: Array<{ mdx: string; slotAfter?: string }> = [];
  let rest = body;

  for (const seam of SEAMS) {
    if (!seam.slot) continue;
    const split = splitAtHeading(rest, seam.heading);
    if (!split) continue;
    segments.push({ mdx: split[0], slotAfter: seam.slot });
    rest = split[1];
  }
  segments.push({ mdx: rest });

  return (
    <>
      {segments.map((seg, i) => (
        <Fragment key={i}>
          <MDXRemote source={seg.mdx} components={mdxComponents} />
          {seg.slotAfter && (
            <AdSlot
              slot={seg.slotAfter}
              format="fluid"
              layout="in-article"
              className="my-10 block text-center"
            />
          )}
        </Fragment>
      ))}
    </>
  );
}
