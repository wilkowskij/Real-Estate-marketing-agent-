-- ----------------------------------------------------------------------------
-- White-label theming. When an org turns this on, the app shell shows the org's
-- own logo + name (and accent) instead of the product's "Marquee" branding, so
-- a brokerage can hand the app to its agents as its own.
--
-- Org-level decision only (members never override it), so it is NOT added to the
-- lockable-fields set — it always comes from the org's default kit.
-- ----------------------------------------------------------------------------
alter table brand_kits add column if not exists white_label boolean not null default false;
