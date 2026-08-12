# MoviesRule.com Interface Rebuild Design

## Goal
Rebuild the existing `/stats` application surface into the approved autonomous research-to-publishing command center while preserving the public editorial site, content pipeline, TinaCMS configuration, and publishing automation.

## Visual contract
- Keep MoviesRule.com reader-facing routes unchanged; the approved dashboard becomes the operational `/stats` interface.
- Dark left rail with Dashboard, Articles, Research, Sources, Newsletter, and Settings navigation labels. Links must point only to real existing routes; non-existent destinations remain non-clickable review labels.
- Top metrics must be derived from repository content and topic-log data rather than invented analytics. Article count, topic-log count, category count, and average read time are valid current metrics.
- Recent Articles list must use actual `listPosts()` content and publication dates.
- Status cards must truthfully describe repository-observable pipeline/source state; no unsupported monthly views, subscriber counts, or revenue claims.
- Preserve visible fallback/empty states when content or the topic log is unavailable.

## Architecture
Keep the existing Next.js server component and `listPosts()`/topic-log filesystem data flow. Recompose `src/app/stats/page.tsx`; use existing global Tailwind design tokens and add narrowly scoped utility styles only if necessary.

## Testing
Add a Vitest structural interface contract that fails until the operational rail, Recent Articles, Sources, Pipeline, and Next Run/status surfaces exist.

## Review boundary
All changes remain on `review/interface-rebuild-2026-08`; no merge, publication workflow change, secret, DNS, custom-domain, or production deployment change.