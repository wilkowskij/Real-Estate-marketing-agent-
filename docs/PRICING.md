# Pricing — packages & market research

_Last updated: 2026-06-03._

Marquee's pricing model, the market research behind it, and how the per-seat
billing works. The catalog itself lives in `lib/billing/plans.ts` (single source
of truth for the UI and server gating).

## Model

- **No "unlimited" tier.** Every plan has a finite AI-credit allowance and a
  finite included-seat count.
- **Seat blocks + per-additional-user pricing.** Team tiers include a block of
  seats for a flat price, then charge a per-additional-user monthly price for
  every user beyond the block.

## Packages

| Plan | Base / mo | Included users | Extra user / mo | AI credits / mo | For |
| --- | --- | --- | --- | --- | --- |
| **Free** | $0 | 1 | — | 5 | Trial / funnel |
| **Solo** | $59 | 1 | — | 40 | The individual agent |
| **Team** ⭐ | $399 | 10 | $39 | 400 | A real-estate team |
| **Brokerage** | $899 | 25 | $32 | 1,200 | Multi-agent brokerages |

⭐ Team is the flagship "10 users" anchor.

1 AI credit = 1 generation (a social post, email, SMS, or AI image). Allowances
are enforced via `usage_records` (see `aiCampaignsRemaining`).

### Examples (per-seat math, `monthlyForSeats`)

- Team with 10 users → **$399**
- Team with 14 users → $399 + 4 × $39 = **$555**
- Brokerage with 30 users → $899 + 5 × $32 = **$1,059**

## Market research (2026)

| Competitor | Price | Notes |
| --- | --- | --- |
| Coffee & Contracts | $54 solo / $45 per user (teams) | Content **templates** only — no AI generation, no CRM, no publishing |
| Follow Up Boss | ~$69 / user / mo | CRM only |
| Curaytor | $300–$650 / mo | Done-for-you content + platform |
| Luxury Presence | $250–$1,700 / mo | Websites + marketing |
| kvCORE / BoldTrail | $499+ / mo | All-in-one platform (custom team pricing) |
| Lofty | $449+ / mo | All-in-one platform |

**Positioning.** Marquee is an all-in-one (AI content + image + email/SMS +
social publishing + content calendar + lead capture/CRM + revenue attribution +
analytics). That's well beyond template tools like Coffee & Contracts, so Solo
($59) is priced just above their solo tier while delivering far more. Team
($399 for 10 users ≈ $40/seat) undercuts per-seat CRMs (Follow Up Boss $69,
BoldTrail/Lofty $449–$499 base) while bundling the full marketing stack.
Brokerage ($899 for 25 users ≈ $36/seat) stays under the heavy platforms with a
volume seat discount.

Sources: coffeecontracts.com/pricing, housingwire.com real-estate marketing
companies, keetechnology.com CRM pricing guide, theprotoolkit.com BoldTrail
review, everettmarketingagency.com Lofty pricing.

## Stripe setup

Create these **recurring monthly** prices and set the env vars:

| Env | Price |
| --- | --- |
| `STRIPE_PRICE_SOLO` | $59 base |
| `STRIPE_PRICE_TEAM` | $399 base |
| `STRIPE_PRICE_TEAM_SEAT` | $39 (per-unit "licensed" recurring) |
| `STRIPE_PRICE_BROKERAGE` | $899 base |
| `STRIPE_PRICE_BROKERAGE_SEAT` | $32 (per-unit "licensed" recurring) |

**How seats bill.** Checkout adds the base price (quantity 1) plus, if the org
already exceeds the included block, the per-seat price with
`quantity = users − included`. The Stripe webhook reads the subscription items
and stores `seats = included + seat-item quantity`. To change seat count after
purchase, adjust the seat line-item quantity in the Stripe Customer Portal.

> Follow-up (not yet automated): syncing the Stripe seat quantity automatically
> when an admin invites/removes an agent. Today the included block covers the
> common case and overage is set at checkout / via the portal.
