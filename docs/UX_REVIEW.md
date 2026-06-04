# UX/UI Test Report — Market Area, MLS, Listings, Feedback, White-label

Scope: the features shipped in this cycle. Method: a production build
(`npm run build`) to catch render/boundary errors, a code-path audit of each
flow for correctness + "feel" (house-style consistency, dead ends, empty/error
states), the unit suite (`npm test`), and the manual matrix at the bottom.

Last run: 2026-06-04 · Build: ✅ pass (all routes generated) · Tests: ✅ 93 pass
· Typecheck: ✅ clean

---

## Findings & fixes

| # | Severity | Finding | Fix |
| --- | --- | --- | --- |
| 1 | **High** | Market-area **and** MLS editing UI lived in dead code (`app/(app)/brand/BrandClient.tsx`); that route only redirects to `/company/brand`, so users could never set their market area or MLS — they were stuck on the Monmouth default despite the backend supporting it. | Ported the **Market area & MLS** card into the live `CompanyBrandClient`; deleted the dead file. |
| 2 | Medium | Sidebar area card was hardcoded to "Monmouth County" for **every** org. | Shell now always shows the org's configured `areaLabel`. |
| 3 | Medium | White-label passed the **dark-bg** logo to the **light** mobile header → a white logo would render invisible. Brand-accent coloring on the wordmark risked invisible text on the navy sidebar. | Variant-aware `Wordmark` (dark logo on navy sidebar/drawer, light logo on light header); dropped accent-on-wordmark coloring. |
| 4 | Low | Calendar "recurring local news" blurb hardcoded "Monmouth County". | Reworded to "your market's real-estate news". |

All four are fixed and committed. Items below passed review with no change needed.

---

## Flow-by-flow notes ("works + feels right")

- **Support & feedback widget** — present on every authed page via the shell
  footer. Modal matches the house modal pattern (backdrop-dismiss, gold primary,
  secondary cancel). Type picker has helper hints; subject+message required to
  enable Send; success state confirms and links to *Your requests*. Capture is
  resilient: it always saves to Postgres even if Notion is down/unconfigured.
- **Feedback status view (`/feedback`)** — read-only, expandable cards, color-coded
  status badges, clear empty state. Org-scoped via RLS.
- **Market area & MLS settings** — state dropdown, county/region/towns, MLS field
  with a `datalist` of common MLSs (free text allowed). Disabled + "Locked by org"
  badge for non-admins. Saves through the existing `/api/brand` admin path.
- **Import from MLS** — search by address/ZIP/city; results show a per-row **Save**
  (→ *My listings*) plus click-to-fill; an area/MLS hint shows what the search is
  scoped to. Graceful 503 messaging when `RENTCAST_API_KEY` is absent.
- **My listings picker** — lists saved listings (MLS + manual), pick fills the form
  and links the campaign to the saved row; delete supported; clear empty state.
  Editing a field by hand unlinks the saved row (a chip shows the active one).
- **MLS attribution in copy** — disclaimer appended verbatim; MLS cited as a data
  source only on listing posts; never fabricates a brokerage. (Unit-tested.)
- **White-label** — toggle in the brand editor; shell shows the org logo/name with
  a "Powered by Marquee" note; public marketing/login pages intentionally keep the
  product brand.

## Known limitations

- ✅ *Resolved:* Public lead landing pages (`/l/<slug>`) are now white-labeled
  (org logo/accent, drop "Powered by Marquee") when the org enables it.
- ✅ *Resolved:* Saved-listing **price/status refresh** from the MLS — daily cron
  (`refresh-listings`) + a manual per-listing refresh in *My listings*.
- ◑ *Partial:* The new modals now close on **Escape**, lock background scroll, and
  expose `role="dialog"`/`aria-modal`. A full **focus-trap** is still not
  implemented (consistent with the app's other modals).

---

## Manual test matrix (run on the deployed app)

Mark Pass/Fail; for fails, note device/browser + what happened.

### A. Support & feedback
| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| A1 | Click the footer "Send support & feedback" on any page | Modal opens | |
| A2 | Pick each type (Problem / Feedback / Feature) | Helper hint updates | |
| A3 | Submit with empty subject/message | Send stays disabled | |
| A4 | Submit a complete Feedback item | Thank-you state with "Your requests" link | |
| A5 | Open `/feedback` | Your submission appears with a status badge | |
| A6 | Expand a card | Full message shows | |

### B. Market area & MLS (as an admin)
| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| B1 | Company → Brand & documents → Market area & MLS | Card is visible + editable | |
| B2 | Change State, County, add towns + an MLS, Save | "Saved."; persists on reload | |
| B3 | As a **member** (non-admin) | Fields disabled, "Locked by org" badge | |
| B4 | Sidebar area card | Reflects your saved County/State | |

### C. MLS import + saved listings (needs `RENTCAST_API_KEY`)
| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| C1 | Create → Import from MLS → search a city | Results list; area/MLS hint shows | |
| C2 | Click **Save** on a result | Button → "Saved ✓" | |
| C3 | Open **My listings** | Saved listing appears (tagged MLS) | |
| C4 | Pick it | Form fills; chip shows "Using saved listing" | |
| C5 | Edit the address by hand | Chip clears (treated as new) | |
| C6 | Delete a saved listing | Row disappears | |
| C7 | No `RENTCAST_API_KEY` set | Friendly "isn't set up yet" message, no crash | |

### D. Generated copy attribution
| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| D1 | Set a disclaimer + MLS in Brand; generate a **New Listing** post | Disclaimer appears verbatim; MLS may be cited as data source | |
| D2 | Generate an **Educational** post | Disclaimer may appear; **no** MLS attribution | |
| D3 | Generate an **email** (Create → Email) | Disclaimer included; SMS stays short (no disclaimer) | |

### E. White-label
| # | Step | Expected | P/F |
| --- | --- | --- | --- |
| E1 | Brand editor → enable "White-label the app", Save | Saved | |
| E2 | Upload a dark-bg logo; reload | Sidebar shows your logo, not "Marquee" | |
| E3 | Resize to mobile | Header logo is legible (light variant or name) | |
| E4 | Sidebar footer | Shows "Powered by Marquee" | |
| E5 | Turn white-label off | Shell returns to "Marquee" | |
