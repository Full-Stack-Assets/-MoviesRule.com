# MoviesRule.com Interface Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved MoviesRule operational dashboard on `/stats` without changing the public editorial experience or publishing pipeline.

**Architecture:** Preserve the Next.js server component and derive all dashboard content from `listPosts()` plus the existing topic log. Limit production changes to the stats page and narrowly scoped presentation styles.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest.

## Global Constraints
- Branch: `review/interface-rebuild-2026-08` only.
- Public reader routes and autonomous publishing behavior stay unchanged.
- Do not invent views, subscribers, revenue, or live pipeline outcomes.
- Do not change secrets, CMS configuration, DNS, custom domain, or deployment workflows.

---

### Task 1: Lock the interface contract
**Files:**
- Create: `tests/interface-rebuild.test.ts`

- [ ] Assert that `/stats` contains the approved operational navigation labels, Recent Articles, Sources, Pipeline, and Next Run/status surfaces.
- [ ] Open a draft PR and verify the test fails before implementation.

### Task 2: Rebuild `/stats`
**Files:**
- Modify: `src/app/stats/page.tsx`

- [ ] Build the dark operational rail while preserving real links only.
- [ ] Use current post/topic/category/read-time values for top summary cards.
- [ ] Render Recent Articles from actual posts.
- [ ] Render source/pipeline/status cards from repository-observable state and explicitly avoid unsupported traffic/subscriber claims.
- [ ] Preserve category/tag/topic-log insight below the primary dashboard where useful.

### Task 3: Verify
- [ ] Confirm `npm test`, `npm run typecheck`, and the repository build check pass in PR CI.
- [ ] Keep the PR draft and do not merge or deploy.