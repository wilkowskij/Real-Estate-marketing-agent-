-- High-traffic content types from the Monmouth County / NJ market research.
-- These join the existing just_sold / new_listing / open_house / custom types.
-- ADD VALUE IF NOT EXISTS is idempotent. Note: in PostgreSQL these cannot run
-- inside a transaction block with other statements that use the new values, so
-- keep enum additions in their own migration.
alter type campaign_type add value if not exists 'market_stat';
alter type campaign_type add value if not exists 'neighborhood_spotlight';
alter type campaign_type add value if not exists 'deal_of_week';
alter type campaign_type add value if not exists 'before_after';
alter type campaign_type add value if not exists 'educational';
alter type campaign_type add value if not exists 'testimonial';
