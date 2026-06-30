# Newsletter: Growth + Sponsorship Plan

A concrete plan to turn the existing newsletter plumbing into a real audience and
a real revenue line. Grounded in what's already wired: **Buttondown** as the
provider (`NEWSLETTER_PROVIDER=buttondown`), the footer `SubscribeForm`, the
`api/subscribe` route, and the weekly digest workflow
(`.github/workflows/newsletter.yml` → `scripts/newsletter-digest.ts`).

The newsletter matters disproportionately for this site: it's the **one channel
Google can't demote.** An AI-assisted auto-blog is exposed to search-algorithm
risk; an owned email list is a durable asset that also drives the return visits
and engagement signals that *help* the site rank.

---

## 1. Where we are

| Asset | State | Gap |
|---|---|---|
| Provider (Buttondown) | Wired | Free tier caps at 100 subs — plan the upgrade trigger |
| Footer signup form | Live, every page | Only one capture surface; no incentive |
| Weekly digest | Automated send | No welcome sequence; no segmentation |
| Subscriber count | ~0 (starting line) | Everything below is about the first 1,000 |

---

## 2. Growth — get to 1,000, then 10,000

Growth = **more capture surfaces × a reason to subscribe now × referral loops.**

### 2a. Capture surfaces (on-site, ship first — cheap and compounding)
1. **Inline CTA after the article body** — the highest-converting spot (reader
   just finished, intent is peak). Add a single-field email box between the post
   body and the "Keep reading" block. *(Code change; small.)*
2. **Exit-intent / scroll modal** — fire once per visitor at 60% scroll or
   exit-intent. Cap to one impression/week via localStorage so it's not hostile.
3. **Sticky bottom bar on mobile** — movies traffic skews mobile; a dismissible
   bar converts well.
4. **Dedicated `/newsletter` landing page** — a real page to link from social
   bios, with sample issue, value prop, and social proof. Doubles as the link
   you put everywhere.

### 2b. Reason to subscribe now (lead magnets — niche-specific)
The generic "weekly dispatch" line undersells it. Offer a concrete hook:
- **"What to Watch This Weekend"** — the single best framing for a movies list.
  Make it the newsletter's identity, not a side feature.
- **A downloadable/gated evergreen**: "50 Best Films on Netflix Right Now,"
  refreshed monthly. Gating one high-value list behind email converts cold
  traffic hard.
- **"New on streaming this week"** auto-built from the TMDB layer once it's
  producing data — a recurring, genuinely useful payload nobody unsubscribes from.

### 2c. Lifecycle (retention is growth — a leaky bucket never fills)
- **Welcome email (send #0):** deliver the lead magnet, set expectations, ask one
  question ("what do you watch most?") to boost future deliverability via replies.
- **Consistent cadence + identity:** same day/time weekly. The Friday
  "what to watch this weekend" slot is ideal.
- **Re-engagement:** a 90-day-inactive win-back, then sunset to protect sender
  reputation (Buttondown supports this).

### 2d. Referral / external loops
- **Referral milestone** ("refer 3 friends → the full Best-of-2026 guide"). Cheap
  with Buttondown's referral support; movie recs are inherently shareable.
- **Cross-promotion / swaps** with comparable small movie/TV newsletters — the
  fastest organic B2B growth lever at the 500–5k stage.
- **Reddit/Telegram/Bluesky** (the syndication channels now wired): every post's
  social push should occasionally point at `/newsletter`, not just the article.

### 2e. Growth targets

| Stage | Subs | Primary lever | Buttondown |
|---|---|---|---|
| 0 → 100 | first 100 | inline CTA + lead magnet + personal shares | Free tier |
| 100 → 1,000 | 3–6 mo | landing page + referral + 1–2 newsletter swaps | Paid (~$9/mo+) |
| 1,000 → 10,000 | 6–18 mo | cross-promo network + Pinterest/short-form → list | Scales w/ subs |

---

## 3. Sponsorship — turning subs into revenue

**Don't sell ads too early.** Below ~2,000 engaged subs the numbers are too small
to pitch and a bad first sponsor burns trust. Until then, monetize the list with
the **affiliate** layer already built (the "where to watch" rails, VPN, Amazon) —
drop those links naturally into "what to watch" issues.

### 3a. When to start
- **~2,000+ subs** and **>35% open rate** → you have a sellable product.
- Until then: affiliate only + build the media-kit metrics (open rate, CTR,
  subscriber count, audience description).

### 3b. Inventory (what you actually sell)
1. **Primary sponsor slot** — one per issue, ~75 words + link, top-third
   placement. Scarcity (one per issue) protects open rates and commands a premium.
2. **Classified / secondary** — a cheaper one-line listing lower in the issue.
3. **Dedicated send** (later, premium) — a full issue for one sponsor; rare, priced
   high, used sparingly.

### 3c. Rates (CPM-anchored, the newsletter standard)
Price on a **CPM** (cost per 1,000 *opens*, not sends — opens is the honest unit):
- Niche entertainment newsletters realistically command **$20–$40 CPM** on opens.
- Example math: 2,000 subs × 40% open = 800 opens → primary slot at $30 CPM ≈
  **$24/issue**. Modest — which is why **affiliate is the bigger line until ~10k.**
- At 10,000 subs × 40% = 4,000 opens → **~$120/issue** primary, plus classifieds
  and affiliate stacked on top. Now it's a real weekly revenue number.
- Sell **bundles** (4 issues) at a slight discount to smooth cash flow.

### 3d. Likely buyers (this niche)
Streaming services & promos, VPN brands (huge in this niche — also your top
affiliate), home-theater/AV gear, film merch & poster shops, ticketing, indie
film/festival promo, movie-adjacent DTC. Reach them via affiliate networks
(Impact, ShareASale, CJ) first — affiliate relationships convert into direct
sponsorships once you have data.

### 3e. Media kit + pitch (one page)
Subscriber count · open rate · CTR · audience description (movie fans, US-skew,
mobile) · slot options + CPM rates · 2 sample placements · contact. Keep a public
`/sponsor` or `/advertise` page so inbound buyers can self-serve.

### 3f. Fulfillment & trust
- Label sponsorships clearly ("Presented by…") — same disclosure discipline as the
  affiliate rails.
- One sponsor per issue; never sell a placement that contradicts a review.
- Track per-sponsor CTR and report it back — renewals come from proof.

---

## 4. Metrics that matter (review monthly)
- **List growth rate** (net new subs/week) and **source attribution** (which
  capture surface).
- **Open rate** (>35% healthy; <25% = deliverability or relevance problem).
- **CTR** to the site and to affiliate/sponsor links.
- **Revenue per 1,000 subs/month** (affiliate + sponsorship combined) — the north
  star that tells you when to invest more.

## 5. First 30 / 60 / 90 days
- **30:** ship inline post CTA + `/newsletter` landing page + welcome email +
  pick the "What to Watch This Weekend" identity and one lead magnet.
- **60:** add exit-intent + mobile sticky bar; launch referral milestone; line up
  2 newsletter cross-promos; start the media-kit metric tracking.
- **90:** evaluate paid Buttondown tier; if ≥2k engaged subs, publish `/advertise`
  and pitch the first primary sponsor; otherwise double down on affiliate in-issue.
