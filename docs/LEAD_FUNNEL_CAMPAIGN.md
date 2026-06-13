# Marquee — First 50 Customers Lead Funnel Campaign Plan

**Goal:** 50 paying customers  
**Timeline:** 90 days (3 milestones × 30 days)  
**Primary Market:** NJ/Monmouth County solo agents → expand to teams/brokerages  
**Revenue Target at 50 customers:** ~$5,000–$7,500 MRR

---

## Customer Mix Target

| Segment | Count | Price | MRR |
|---|---|---|---|
| Solo Agents | 38 | $59/mo | $2,242 |
| Teams (10-seat) | 9 | $399/mo | $3,591 |
| Brokerages (25-seat) | 3 | $899/mo | $2,697 |
| **Total** | **50** | | **~$8,530** |

> **Strategy:** Start with solo agents (faster sales cycle, word-of-mouth), use those case studies to close teams and brokerages in Month 2-3.

---

## Funnel Architecture

```
AWARENESS          INTEREST           CONSIDERATION      DECISION          RETENTION
    │                  │                   │                 │                 │
Paid Ads           Landing Page        Free Trial         Demo Call       Onboarding
Social Content     Email Capture       Nurture Seq.       Social Proof    30-day Check-in
Community Posts    Lead Magnet         Product Tour       Limited Offer   Referral Ask
Direct Outreach    Webinar Reg.        Case Studies       Objection FAQ   Upsell Path
```

---

## Phase 1 — Foundation (Days 1–14)

**Milestone: Infrastructure live, first 5 customers (friends + network)**

### Week 1: Build the Foundation

#### 1. Landing Page Optimization
- Headline: *"Turn Your Listings Into 30 Days of Marketing in 60 Seconds"*
- Sub-headline: *"AI-powered content engine built for NJ real estate agents — social posts, email, SMS, images, all done."*
- Hero: Screen recording / GIF of upload → content output in under 60 seconds
- Social proof section: logos/quotes from beta users (even 2–3 counts)
- Pricing table: Solo / Team / Brokerage with toggle
- CTA: "Start Free Trial" (no credit card) + "Book a Demo" (for teams/brokerages)
- Footer trust signals: Fair Housing badge, Stripe payment badge, "Made for NJ Agents"

#### 2. Email Infrastructure
- Set up transactional + marketing email via Resend (already in stack)
- Create 5-part onboarding drip sequence (see Email Sequences below)
- Set up lead magnet delivery automation

#### 3. Lead Magnet
Create ONE high-value free download:
- **"The 30-Day Real Estate Social Media Calendar for NJ Agents"** (PDF)
- Include 30 post ideas, optimal posting times, hashtag sets for Monmouth County
- Gate it behind email capture on landing page
- Deliver via automated email immediately upon signup

#### 4. Tracking & Analytics
- Install Vercel Analytics + custom conversion events
- Set up UTM parameter convention: `?utm_source=fb&utm_medium=paid&utm_campaign=solo-agents`
- Define KPIs: MQL (email captured), SQL (trial started), Customer (paid)
- Create simple tracking spreadsheet: Date | Channel | Leads | Trials | Paid

#### 5. Direct Outreach (Warm Network)
- List every real estate agent you know personally (target: 50+ names)
- Personal DM/text: *"Hey [name], I built something for agents like you — would you try it free for 2 weeks and give me honest feedback?"*
- Offer: 60-day free trial for first 10 testers in exchange for a testimonial
- **Target: 5 paying customers by end of Week 2**

---

### Week 2: Content Engine Launch

#### Social Media Setup
Claim and brand all accounts:
- **Instagram** `@marquee.realestate` — visual-first, listings, before/after content demos
- **Facebook Page** — agent community, ad account home
- **LinkedIn** — brokerage/team targeting, thought leadership
- **YouTube** — tutorial videos, product demos (SEO long-tail plays)

#### Organic Content Calendar (Week 2, seed content)
Publish 3 posts before running ads — social proof for ad traffic landing on profiles:

| Platform | Post Type | Topic |
|---|---|---|
| Instagram Reel | Screen recording | "Watch Marquee write 10 social posts from one photo in 30 sec" |
| LinkedIn Article | Thought leadership | "Why most NJ agents are invisible online (and how to fix it)" |
| Facebook | Question post | "What takes you the most time: writing posts, emails, or flyers?" |

---

## Phase 2 — Launch & Paid Ads (Days 15–45)

**Milestone: 20 customers, paid ads profitable, email list at 500+**

### Paid Ad Strategy

#### Budget Allocation

| Channel | Monthly Budget | Goal |
|---|---|---|
| Meta (FB/IG) | $600 | Solo agent leads |
| LinkedIn | $400 | Team/brokerage leads |
| Google Search | $200 | High-intent keywords |
| **Total** | **$1,200/mo** | 30–50 leads/mo |

> At $1,200/month and a 3–5% trial-to-paid conversion, target 600 trial starts to close 18–30 customers/month. Optimize toward channels converting best.

---

#### Facebook / Instagram Ads

**Campaign 1: Awareness (Traffic / Video Views)**
- **Objective:** Video views, brand awareness
- **Creative:** 30-second Reel showing upload → 10 posts generated
- **Caption:** "NJ agents — stop spending 3 hours writing social posts. Marquee does it in 60 seconds. Try free ↓"
- **Audience:** NJ/Monmouth County, Job Title = Real Estate Agent, Realtor, Real Estate Broker; Age 28–55
- **Budget:** $10/day
- **KPI:** Cost per 3-second view < $0.05

**Campaign 2: Lead Generation (Lead Ads)**
- **Objective:** Lead form completions (email capture)
- **Creative:** Static carousel — 3 frames: Problem → Solution → Result
  - Frame 1: "Writing content for 5 listings = 10 hours/week"
  - Frame 2: "Marquee generates it all in 60 seconds"
  - Frame 3: "Free 14-day trial — no credit card"
- **Audience:** Retarget video viewers (Campaign 1) + Lookalike from email list
- **Lead form fields:** Name, Email, Phone (optional), "How many listings per month?"
- **Budget:** $10/day
- **KPI:** Cost per lead < $8

**Campaign 3: Retargeting (Conversions)**
- **Objective:** Trial signup
- **Audience:** Website visitors (past 30 days) who didn't sign up
- **Creative:** Testimonial ad — quote from beta user + headshot + "What I wish I had 2 years ago"
- **CTA:** "Start Free Trial"
- **Budget:** $5/day
- **KPI:** Cost per trial start < $25

---

#### LinkedIn Ads

**Campaign 1: Brokerage Targeting**
- **Objective:** Lead generation
- **Audience:** Title = Broker, Managing Broker, Real Estate Director; Company size 10–200; NJ location
- **Creative:** Single image ad
  - Headline: "Your agents spend 40% of their time on marketing, not selling"
  - Body: "Marquee gives every agent on your team branded content in 60 seconds. Fair Housing compliant. Brand-locked."
  - CTA: "Book a Demo"
- **Budget:** $15/day ($450/mo)
- **KPI:** Cost per demo booked < $75

**Campaign 2: Team Lead Targeting**
- **Objective:** Lead generation
- **Audience:** Title = Real Estate Team Lead, Team Leader, Sales Manager; NJ
- **Creative:** Carousel showing team brand kit → individual agent posts
- **Budget:** $7/day

---

#### Google Search Ads

**Target Keywords:**

| Keyword | Intent | Max CPC |
|---|---|---|
| "real estate social media tool" | High | $3.50 |
| "real estate marketing software NJ" | High | $4.00 |
| "automate real estate posts" | High | $3.00 |
| "real estate content generator" | Medium | $2.50 |
| "fair housing compliant social media" | Very High | $5.00 |

- **Ad copy:** Headline 1: "AI Marketing for NJ Agents" | Headline 2: "60-Second Content From Listings" | Headline 3: "Free 14-Day Trial"
- **Landing page:** Dedicated `/lp/search` page with no nav (conversion focused)
- **Budget:** $7/day

---

### Content Strategy (Organic)

Post 5× per week across platforms. Rotate through 4 content pillars:

#### Pillar 1: Education (40%) — "How to" content for agents
- "5 hashtags every Monmouth County agent should use"
- "The best time to post real estate content in NJ (we analyzed 500 posts)"
- "How to write a listing caption that gets DMs (not just likes)"

#### Pillar 2: Product Demo (30%) — Show, don't tell
- Weekly "60-Second Marquee Demo" Reel: pick a real listing photo, run it through Marquee, show output
- "Before Marquee vs. After Marquee" carousel: agent's old posts vs. AI-generated
- Screen recordings: brand guide import, content calendar, social publishing

#### Pillar 3: Social Proof (20%) — Real results
- Customer quote cards (one per week minimum)
- "Agent Spotlight" — feature a beta user, their results, their market
- Engagement metrics screenshots (with permission): "Our user's last post got 847 views in 48 hours"

#### Pillar 4: Local Market (10%) — NJ-specific authority
- Monmouth County market stats (monthly)
- "Why NJ agents have a unique opportunity in [neighborhood]"
- Local real estate news commentary

---

### Email Nurture Sequences

#### Sequence A: Free Lead Magnet Download → Trial

| Day | Subject | Goal |
|---|---|---|
| 0 (instant) | "Your 30-Day NJ Social Calendar is inside" | Deliver lead magnet + soft intro to Marquee |
| 1 | "The reason 73% of agents quit social media" | Pain point → solution tease |
| 3 | "See how Sarah listed 3 homes and never wrote a caption" | Case study |
| 5 | "Your free trial is waiting (no card needed)" | Hard CTA to trial |
| 8 | "Quick question for you" | Reply-bait email, segment by interest |
| 12 | "Last chance: free calendar bonus expires Friday" | Urgency close |

#### Sequence B: Trial Started → Paid

| Day | Subject | Goal |
|---|---|---|
| 0 (instant) | "Welcome to Marquee — here's your first win" | Onboarding step 1: upload a photo |
| 2 | "Did you see your content calendar?" | Prompt content calendar usage |
| 4 | "Quick tip: how to lock your brand in 3 minutes" | Brand guide setup |
| 7 | "Your trial is halfway done — here's what's working" | Usage summary + upgrade nudge |
| 10 | "Agent tip: how to schedule a week of posts in 10 min" | Value delivery |
| 13 | "Your trial ends in 24 hours" | Urgency + upgrade CTA |
| 14 | "Don't lose your content — upgrade today" | Final close |

#### Sequence C: Trial Expired, Didn't Convert → Win-back

| Day | Subject | Goal |
|---|---|---|
| 0 | "We saved your account for 7 more days" | Re-engagement |
| 3 | "What got in the way?" | Reply-bait, learn objection |
| 7 | "One month free if you upgrade before Sunday" | Discount offer |

---

### Community & Outreach

#### Facebook Groups (organic, not ads)
Join and actively contribute (no spam — value first):
- NJ Real Estate Professionals
- Monmouth County Realtor Network
- Women in Real Estate NJ
- BiggerPockets NJ Chapter

Post cadence: 2 genuine value posts/week per group. Once established, share a demo or offer.

#### Cold Email Outreach
- Source: NJ MLS public records, LinkedIn Sales Navigator
- Target: 50 agent emails/week, 10 brokerage emails/week
- Tool: Apollo.io or Hunter.io for verification
- Template:

```
Subject: Cut your marketing time in half (NJ agents only)

Hey [First Name],

I noticed you're active in [area] — impressive listing volume.

I built Marquee specifically for NJ agents: upload a listing photo, get 10 social posts, 
3 email templates, and an SMS campaign generated in 60 seconds. 
Fair Housing compliant, brand-consistent.

Would you want a free 2-week trial? No card, no commitment.

— [Your name]
P.S. I'm only onboarding 10 NJ agents in June. Happy to hop on a 15-min call.
```

- **Target:** 5–10 replies/week → 2–3 trials/week → 1 paid/week

---

## Phase 3 — Scale & Close (Days 46–90)

**Milestone: 50 customers, referral loop running, $5K+ MRR**

### Referral Program Launch (Day 46)

Activate after first 20 customers to seed it with real advocates.

**Structure:**
- Referrer gets: 1 free month for every paid referral
- Referred agent gets: 30-day free trial (vs. standard 14)
- Track via unique referral links (build simple `/ref/[code]` redirect)

**Activation:**
- Email all 20 existing customers: *"You're in our founding member circle. Here's your referral link."*
- In-app banner: "Know another agent? Give them 30 days free, get a free month."
- Social share kit: pre-written LinkedIn/IG post they can copy-paste

**Target:** 20 customers × 20% referral rate = 4 new customers/month from referral alone

---

### Brokerage Blitz (Day 46–60)

Use solo agent case studies to crack team/brokerage deals.

**Process:**
1. Create 1-page PDF case study: "How [Agent Name] generated 3 listing inquiries from one Marquee campaign"
2. LinkedIn outreach to Brokers: attach case study, offer team demo
3. Demo script focus: brand consistency across agents, Fair Housing gate, team analytics
4. Offer: "Onboard your whole team free for 30 days — I'll set up your brand kit personally"

**Target:** 3 brokerages (25-seat) = +$2,697 MRR

---

### Ad Optimization (Day 46+)

By Day 46, you have 30 days of data. Cut underperformers, double winners:
- Pause any ad set with CPL > $15 (solo) or CPL > $100 (brokerage)
- Increase budget 20%/week on profitable ad sets
- Test 2 new creative variants per month (testimonial video, UGC-style screen recording)
- Add lookalike audiences built from paying customers (most powerful targeting)

**Stretch: add YouTube pre-roll ads** (15-sec non-skippable) targeting real estate channels

---

### Webinar / Live Demo Event (Day 60)

Host a free 45-minute live Zoom:
- **Title:** "How NJ Agents Are Getting 10× More Content Out of Every Listing (Live Demo)"
- Promote: email list, Facebook groups, paid social (event response objective)
- Content: 20 min education + 20 min live Marquee demo + 5 min Q&A
- Close: 30% discount for attendees who sign up within 24 hours
- **Target:** 75 registrants → 40 attendees → 8 sign-ups

---

## KPIs & Tracking Dashboard

Track weekly in a simple spreadsheet:

| Metric | Week 1 Target | Month 1 Target | Month 2 Target | Month 3 Target |
|---|---|---|---|---|
| Email subscribers | 25 | 150 | 400 | 700 |
| Trial starts | 5 | 25 | 80 | 180 |
| Paid customers | 5 | 12 | 28 | 50 |
| Trial → Paid rate | - | 48% | 35% | 28% |
| MRR | $295 | $708 | $1,652 | $5,000+ |
| CAC (blended) | $0 | $30 | $55 | $75 |
| LTV:CAC target | - | - | - | 10:1+ |
| Referrals generated | 0 | 0 | 3 | 10 |

---

## 30-60-90 Day Milestone Checklist

### Day 30 Milestone: Proof of Concept
- [ ] Landing page live with lead magnet
- [ ] 5-part email sequences A + B active
- [ ] 5 paying customers (warm network / direct outreach)
- [ ] 150+ email subscribers
- [ ] First week of paid Meta ads running
- [ ] All social profiles active with 10+ posts each
- [ ] Testimonials collected from all beta users

### Day 60 Milestone: Momentum
- [ ] 20 paying customers
- [ ] 400+ email subscribers
- [ ] All 3 paid channels (Meta, LinkedIn, Google) running and optimized
- [ ] CPL < $10 on Meta, < $80 on LinkedIn
- [ ] 1 brokerage or team deal closed
- [ ] Referral program live
- [ ] Live webinar hosted (1st run)
- [ ] 2 published case studies

### Day 90 Milestone: 50 Customers
- [ ] 50 paying customers
- [ ] MRR ≥ $5,000
- [ ] Referral program generating ≥ 4 customers/month
- [ ] CAC payback period < 3 months
- [ ] NPS score collected from all customers (target > 50)
- [ ] Content machine running with minimal daily effort
- [ ] 3+ brokerages on team plans
- [ ] 700+ email subscribers

---

## Budget Summary

| Category | Month 1 | Month 2 | Month 3 | Total |
|---|---|---|---|---|
| Paid Ads | $400 | $1,200 | $1,800 | $3,400 |
| Tools (Apollo, design) | $100 | $100 | $100 | $300 |
| Lead magnet design | $150 | $0 | $0 | $150 |
| Webinar platform | $0 | $0 | $49 | $49 |
| **Total** | **$650** | **$1,300** | **$1,949** | **$3,899** |

> Revenue at Month 3 (50 customers): ~$8,500 MRR = **$8,500 vs. $3,899 invested = 2.18× ROI in 90 days**

---

## Quick-Start Checklist (Do These First)

1. **Today:** Write your personal network list (50+ agent names), start DMs
2. **Day 2:** Create/update landing page with lead magnet gate
3. **Day 3:** Set up email sequences A + B in Resend
4. **Day 4:** Create lead magnet PDF ("30-Day NJ Social Calendar")
5. **Day 5:** Set up Meta Business Manager + ad account + Facebook Pixel
6. **Day 7:** Publish 3 seed posts across IG, LinkedIn, Facebook
7. **Day 10:** Launch Meta awareness campaign ($10/day)
8. **Day 14:** Close first 5 customers from warm outreach
9. **Day 21:** Launch lead gen + retargeting Meta campaigns
10. **Day 30:** Review data, cut losers, scale winners, launch LinkedIn ads
