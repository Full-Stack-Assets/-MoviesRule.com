# Productizing the Engine — What the Offer Looks Like

Movies Rule is one deployment of a **generic, niche-agnostic auto-blog engine**
(see `CLAUDE.md`: everything niche-specific lives in `src/site.config.ts`; the
pipeline, schema-validated MDX contract, scheduling, syndication, reviews layer,
and now the affiliate + where-to-watch monetization are all reusable). That means
the *engine* — not just this one site — is a sellable asset.

This document sketches the realistic ways to package it as an offer, with
positioning, ICP, pricing, delivery, and the honest risks.

---

## 0. What you're actually selling

A system that, per niche, turns a one-file config into: hourly sourced + scored +
researched + LLM-written + schema-validated posts, auto-committed and
auto-deployed, with SEO structured data, newsletter, social syndication, a TMDB
reviews layer, and affiliate "where to watch" monetization — **at ~$0 marginal
hosting cost** (free tiers: Gemini/Groq, Brave, Pexels, GitHub Actions, Vercel).

The wedge is that last clause. The differentiated promise is **"a self-running,
monetizing niche site for near-zero running cost."**

---

## 1. The four packaging options (ranked by fit)

### Option A — Done-For-You (DFY) niche sites  ⭐ best first offer
You spin up and hand over (or operate) a complete niche site from a customer's
chosen niche. Fastest to revenue; no multi-tenant engineering required; you
already have the playbook (`CREATE-A-SITE.md`).

- **Offer:** "Pick a niche. In 7 days you get a live, auto-publishing,
  monetization-wired content site on your domain."
- **Two flavors:**
  - **Build & handover** (one-time): you configure, deploy, seed content, hand
    over the repo + keys. Customer runs it.
  - **Build & operate** (recurring): you keep it running, monitor the pipeline,
    tune sources/prompts, report traffic + revenue. Higher LTV.

### Option B — Productized service / "portfolio partner"
You operate a *portfolio* of these sites, optionally with revenue-share partners
who bring niches/domains/capital while you run the engine. This is the highest-
margin path because the marginal cost of site N is near zero — but it's a
*business*, not a product sale.

### Option C — Self-serve SaaS  (highest ceiling, highest build cost)
Multi-tenant: customer signs up, picks a niche, connects their own API keys
(BYO-key keeps your costs ~$0), and the platform runs their site. Big lift —
needs auth, billing, multi-tenant orchestration, key vaulting, a config UI,
abuse/cost controls, and support. Only pursue after A/B prove demand.

### Option D — Template / source license
Sell the codebase as a one-time template (à la a premium theme/boilerplate) with
setup docs. Lowest touch, lowest price, lowest LTV; mainly a lead source for A.
Risk: you give away the moat. Better as a tripwire than the main offer.

**Recommended sequence:** A (cash + learning now) → B (compounding portfolio) →
graduate the most-repeated parts into C once the niche-config and ops are boringly
repeatable.

---

## 2. ICP — who buys this

- **Affiliate / niche-site operators & "publishers"** who already understand
  content→affiliate economics and want output without a writer team. (Best fit.)
- **Local/SMB & agencies** who need a perpetually-fresh content engine for SEO and
  can't sustain manual publishing.
- **Domain investors / portfolio builders** sitting on aged domains wanting to
  monetize them cheaply (great for Option B revenue-share).
- **Creators/experts** in a vertical who want an "always-on" companion site.

Disqualify: anyone wanting *thin content at scale to game Google* — that's the
failure mode (see Risks) and it churns hard. Sell to people who want a real,
differentiated property.

---

## 3. Pricing (anchors, not gospel)

| Offer | Model | Anchor price |
|---|---|---|
| A — Build & handover | one-time | **$1.5k–$5k** per site (niche complexity, seed depth, design) |
| A — Build & operate | retainer | **$300–$1,500/mo** per site (ops + tuning + reporting), or **rev-share** (e.g. 30–50%) |
| B — Portfolio partner | rev-share / JV | partner brings domain+niche+capital; you bring engine+ops; split net |
| C — SaaS (BYO key) | subscription | **$29–$99/mo** per site tier (BYO-key keeps COGS ~$0); annual discount |
| D — Template license | one-time | **$149–$499** + optional setup add-on |

Margin logic: BYO-key + free-tier hosting means **COGS is near zero**, so price on
*value delivered* (a monetizing site / traffic), not on cost. The retainer and
rev-share models capture the most because the engine's upside compounds.

---

## 4. Delivery & ops (what fulfillment requires)

- **Onboarding:** niche intake → fill `site.config.ts` (branding, audience,
  sources, categories) → provision keys → deploy to Vercel → seed N posts → QA.
  Productize this into a checklist/wizard; it's the unit of work you repeat.
- **Reliability:** the pipeline already degrades gracefully (dead source/scrape
  never kills a run) and the MDX-compile guard prevents a bad post from breaking
  deploys — both are *sales features* ("it won't silently break"). Add per-site
  uptime/freshness monitoring and a status report.
- **Quality & safety:** human editorial oversight per site (the About-page
  standard), source citations, and the self-healing schema are the trust story.
- **Support surface:** keep it thin — a runbook, the docs, and async support
  tiers. Operate-tier customers get monitoring + monthly reports.

---

## 5. Moat & differentiation

The code is copyable; the moat is **the operating system around it**: the niche
configs that actually rank, the source/prompt tuning per vertical, the
monetization wiring (affiliate rails, where-to-watch SEO), the reliability
guards, and the portfolio data on what works. Sell outcomes and operations, not
"an AI blog generator" (a commodity). The reviews + where-to-watch + affiliate
layer is a concrete, hard-to-copy differentiator most "AI blog" tools lack.

---

## 6. The honest risks (put these on the table)

1. **Search-algorithm exposure.** Scaled AI content is squarely in Google's
   crosshairs (site-reputation / scaled-content-abuse policies). The offer must be
   "differentiated, monetizing property," **not** "thin pages at scale." Bake
   E-E-A-T (bylines, methodology, citations, real reviews) into every build or
   churn will be brutal. *This is the #1 thing that kills the business if ignored.*
2. **Platform/free-tier dependency.** Gemini/Groq/Brave/Pexels/Vercel free-tier
   limits or pricing changes hit COGS and reliability. BYO-key (SaaS) pushes that
   risk to the customer; for DFY/operate, monitor quotas and keep provider
   failover (already built) current.
3. **AI-content disclosure / brand-safety / IP.** Per-niche legal and disclosure
   norms vary; affiliate/FTC disclosure is mandatory (already implemented).
4. **Commoditization.** "AI blog builders" are a crowded space — compete on
   operations, monetization, and results, not on the generator itself.
5. **Support load creep** (esp. SaaS). Gate with docs, tiers, and BYO-key before
   scaling tenants.

---

## 7. First moves to validate (cheapest proof first)

1. **Use Movies Rule as the live case study** — traffic, revenue, "runs itself"
   proof. The whole sales motion rests on a working reference site.
2. **Sell 1–3 DFY "build & operate" sites** (Option A) to validate price and
   delivery before building anything multi-tenant.
3. **Productize onboarding** into a repeatable checklist/wizard from those builds.
4. **Only then** evaluate SaaS (Option C) — and only for the parts that proved
   boringly repeatable.
