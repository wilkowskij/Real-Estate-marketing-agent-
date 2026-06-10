# Marquee — Product Test Plan (UAT)

A step-by-step script for testers (agents, team leads, brokers) to exercise the
product and report issues. No technical knowledge required.

- **What you're testing:** Marquee turns listing info + photos into marketing
  (social posts, email, SMS), plans a content calendar, captures leads, and
  tracks deals/revenue — tuned for NJ / Monmouth County.
- **How to test:** work top to bottom. For each step, mark **Pass / Fail**, and
  for any Fail, jot what happened (and a screenshot if you can).
- **Test URL:** _<your team will paste the link here>_
- **Test billing card (Stripe test mode):** `4242 4242 4242 4242`, any future
  expiry (e.g. 12/34), any CVC, any ZIP. **No real money is charged in test mode.**

> Tip: Use Chrome or Safari. Some features (voice dictation) need Chrome/Edge/Safari.

---

## How to log a bug

For each failure, capture:

| Field | Example |
| --- | --- |
| Area / step # | "Create → 4.3" |
| What you did | "Clicked Generate email" |
| What you expected | "An email draft appears" |
| What happened | "Spinner forever, nothing showed" |
| Device / browser | "iPhone 15, Safari" |
| Screenshot | (attach) |

---

## 1. Sign up & first login

| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| 1.1 | Open the test URL, click **Get started / Sign up** | Sign-up form loads | |
| 1.2 | Create an account with your email + a password | You land in the app (Studio/Dashboard) | |
| 1.3 | Confirm the left sidebar shows: Studio, Create, Campaigns, Calendar, Analytics, Leads, Library, Company, Profile | All nine appear | |
| 1.4 | Sign out (top-right), then sign back in | You return to the dashboard, still your data | |

## 2. Company profile & brand

| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| 2.1 | Go to **Company → Brand & documents** | Brand editor loads | |
| 2.2 | Set company name, primary/secondary colors, and a disclaimer; **Save** | "Saved" confirmation; values persist on refresh | |
| 2.3 | Upload a logo image | Logo preview appears | |
| 2.4 | (Optional) Import a brand guide (PDF/.txt) | Colors/voice get suggested from the doc | |
| 2.5 | Go to **Company → Subscription** | Plans show Solo / Team / Brokerage with prices and "Up to N users" | |

## 3. Your profile

| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| 3.1 | Go to **Profile → My details** | Personal profile form | |
| 3.2 | Add full name, license #, phone, email, headshot; **Save** | Saves; persists on refresh | |
| 3.3 | Go to **Profile → Connections** | Shows Instagram/Facebook/LinkedIn/X connect buttons | |

## 4. Create content

| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| 4.1 | Go to **Create**. In "Describe your post" type: _"Just sold 14 Riverside Ave in Red Bank for $1.25M, 4 bed 3 bath, walk to the train"_ | Text accepted | |
| 4.2 | Click **✨ Set it up for me** | Campaign type + listing fields auto-fill | |
| 4.3 | (Chrome/Safari) Click **🎙 Dictate**, allow the mic, say a sentence | Your words appear in the box | |
| 4.4 | Upload 2–3 listing photos | Thumbnails appear; "N photos selected" | |
| 4.5 | Click the **✕** on one thumbnail | That photo is removed | |
| 4.6 | Click **Generate campaign** | A graphic + caption + hashtags appear on the right (may take ~20s) | |
| 4.7 | If a yellow **"⚠ Stop Slop"** box appears | It lists generic phrases to fix (informational) | |
| 4.8 | Switch the top toggle to **✉️ Email**, click **Generate email** | An inbox-style email preview (subject + body) appears | |
| 4.9 | Switch to **💬 SMS**, **Generate text** | A short text message + character count appears | |
| 4.10 | Click **Copy** on the email/SMS preview | "Copied!" — paste somewhere to confirm | |
| 4.11 | Turn on **🎨 Generate image with AI** (no photo) and generate | An AI-made on-brand graphic appears | |

## 5. Campaigns (multi-channel)

| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| 5.1 | Go to **Campaigns → New campaign**; name it "14 Riverside Ave — Just Sold"; add a strategy; **Create** | Opens the campaign detail page | |
| 5.2 | Back in **Create**, generate an Email, then under **Save to campaign** pick your campaign and **Save** | "Saved ✓" | |
| 5.3 | Open the campaign — the email shows under **Email & SMS** | The saved message appears | |
| 5.4 | On the campaign, under **Tracked links**, add a destination URL + label | A `…/r/<code>` link appears with "0 clicks" | |
| 5.5 | Open that `/r/...` link in a new tab | It redirects to your destination | |
| 5.6 | Reload the campaign | The link's click count increased | |

## 6. Calendar & queue

| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| 6.1 | Go to **Calendar**, click the **gear icon** next to "Plan 30 days" | Settings popover opens | |
| 6.2 | Under **Platforms**, deselect everything except **Instagram**; adjust the content-mix sliders | Only Instagram selected; live counts update | |
| 6.3 | Click **Plan N posts** | Draft posts appear in the **Approval queue** (may take ~15s) | |
| 6.4 | Confirm the queue is **grouped by platform** with a count per group | Group headers show (e.g. "📸 Instagram · N") | |
| 6.5 | On a queue item click **↻ Recreate** | The post's angle/idea changes to a fresh one | |
| 6.6 | Click a post's text to open the **preview drawer** | Drawer shows caption editor, schedule, campaign picker | |
| 6.7 | In the drawer, edit the caption and **Save edits** | Change persists | |
| 6.8 | Click **Delete** (drawer or row), confirm | Post disappears from the queue | |
| 6.9 | On a draft, click **Approve** | Its badge changes to "approved" | |

## 7. Analytics

| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| 7.1 | Go to **Analytics** | Page loads quickly | |
| 7.2 | Check **Production** stats | Total posts / published / scheduled / AI generations reflect your activity | |
| 7.3 | Check **Content mix** | Gold bars (actual) vs navy tick (target) per bucket | |
| 7.4 | Check **Engagement** | Shows an explainer until social accounts are connected (expected) | |
| 7.5 | Check **Revenue & attribution** | Funnel (Clicks→Leads→Deals→Won) + revenue stats | |

## 8. Leads & CRM

| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| 8.1 | Go to **Leads → New form**; type "Open house"; pick **Open house sign-in**; add a headline; **Create** | A form card appears, marked "Live" | |
| 8.2 | Click **Copy** on the form's link; open it in a new tab (or incognito) | A public sign-in page loads (no login needed) | |
| 8.3 | Fill name + email/phone, **Sign in** | "Thank you!" confirmation | |
| 8.4 | Click **Show QR** on the form card, then scan it with your phone | Phone opens the same sign-in page | |
| 8.5 | Back in **Leads → Pipeline** | Your submitted lead appears | |
| 8.6 | Change the lead's status dropdown to **Contacted** | Status updates | |
| 8.7 | Click **→ Deal** on the lead | A deal appears under **Deals** | |
| 8.8 | On the deal, enter a value (e.g. 12000) and set stage to **Closed won** | Saves | |
| 8.9 | Go to **Analytics → Revenue** | Closed revenue reflects the won deal, attributed to "Open house" | |

## 9. Billing (test mode)

| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| 9.1 | Go to **Company → Subscription**; click **Upgrade** on a plan | Redirects to Stripe Checkout | |
| 9.2 | Pay with test card `4242 4242 4242 4242` (future expiry, any CVC/ZIP) | Returns to the app with success | |
| 9.3 | Confirm the plan shows as your current plan | Current plan badge updates | |
| 9.4 | Click **Manage billing** | Opens the Stripe customer portal | |

## 10. Mobile

| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| 10.1 | Open the app on a phone (or a narrow browser window) | Layout fits; a **☰ menu** button shows top-left | |
| 10.2 | Tap **☰** | A nav drawer slides in with all sections + Sign out | |
| 10.3 | Tap a section | It navigates and the drawer closes | |
| 10.4 | Run a couple of the Create / Leads steps on mobile | Forms and buttons are usable | |

---

## Known limitations (expected — not bugs)

- **Live social posting is OFF** until Meta/LinkedIn/X app review completes.
  Connecting accounts and publishing may fall back to "manual export" (download
  image + copy caption). Engagement analytics stay empty until accounts connect.
- **AI generation needs funded API credits**; if generation errors with a
  billing message, the account needs credits topped up (not a product bug).
- Voice **Dictate** works in Chrome/Edge/Safari, not Firefox.
- This is **test/Stripe-test mode** — no real charges.

## Sign-off

| Tester | Date | Device/Browser | Overall (Pass/Fail) | Notes |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
