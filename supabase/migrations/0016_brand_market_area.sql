-- Market area on brand kits
-- ----------------------------------------------------------------------------
-- Let each org (and, via the brand resolver, each member) choose the state +
-- county they market in, so AI-generated copy is tailored to their real market
-- instead of the hardcoded Monmouth County, NJ. Layers + locks exactly like the
-- other brand-kit fields (see resolveBrand + LOCKABLE_FIELDS).
--
-- The default preserves the product's original market so existing accounts see
-- no change; new accounts edit it in Brand settings.

alter table brand_kits
  add column if not exists market_area jsonb not null default
    '{"state":"NJ","county":"Monmouth","region":"Jersey Shore","towns":["Red Bank","Asbury Park","Middletown","Freehold","Rumson","Fair Haven","Long Branch","Holmdel","Colts Neck","Manasquan","Spring Lake","Belmar"]}'::jsonb;
