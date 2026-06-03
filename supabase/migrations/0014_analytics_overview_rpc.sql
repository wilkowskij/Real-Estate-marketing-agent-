-- ----------------------------------------------------------------------------
-- analytics_overview(p_org) — one RLS-safe aggregation entrypoint for the
-- /analytics dashboard, replacing the prior "load every posts/social_metrics
-- row and aggregate in JS" pattern (see docs/SCALABILITY.md).
--
-- SECURITY INVOKER: runs as the calling role, so each table's RLS applies —
-- queries filter by p_org AND is_org_member(org_id) yields zero rows for a
-- non-member, so there is no cross-org leak.
-- ----------------------------------------------------------------------------
create or replace function analytics_overview(p_org uuid)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
with
prod as (
  select
    count(*)::int as total,
    count(*) filter (where state = 'published')::int as published,
    count(*) filter (where state = 'scheduled')::int as scheduled,
    count(*) filter (where state = 'draft')::int as drafts,
    count(*) filter (where created_at >= now() - interval '30 days')::int as last30
  from posts where org_id = p_org
),
prod_plat as (
  select coalesce(jsonb_object_agg(platform, c), '{}'::jsonb) as by_platform
  from (select platform, count(*)::int c from posts where org_id = p_org group by platform) t
),
type_counts as (
  select coalesce(jsonb_object_agg(type, c), '{}'::jsonb) as counts
  from (select type::text as type, count(*)::int c from campaigns where org_id = p_org group by type) t
),
gens as (
  select count(*)::int as ai_month from usage_records
  where org_id = p_org and kind = 'ai_generation' and created_at >= date_trunc('month', now())
),
latest as (
  select distinct on (post_id) post_id, platform,
    coalesce(impressions,0) impressions, coalesce(reach,0) reach,
    coalesce(likes,0) likes, coalesce(comments,0) comments,
    coalesce(shares,0) shares, coalesce(saves,0) saves, coalesce(clicks,0) clicks
  from social_metrics where org_id = p_org
  order by post_id, captured_at desc
),
eng as (
  select count(*)::int n,
    coalesce(sum(impressions),0)::int impressions, coalesce(sum(reach),0)::int reach,
    coalesce(sum(likes),0)::int likes, coalesce(sum(comments),0)::int comments,
    coalesce(sum(shares),0)::int shares, coalesce(sum(saves),0)::int saves,
    coalesce(sum(clicks),0)::int clicks
  from latest
),
eng_plat as (
  select coalesce(jsonb_object_agg(platform, jsonb_build_object('impressions', imp, 'engagements', e)), '{}'::jsonb) as by_platform
  from (select platform, sum(impressions)::int imp, sum(likes+comments+shares+saves)::int e from latest group by platform) t
),
eng_top as (
  select coalesce(jsonb_agg(jsonb_build_object('postId', post_id, 'platform', platform, 'engagements', e) order by e desc), '[]'::jsonb) top
  from (select post_id, platform, (likes+comments+shares+saves)::int e from latest order by e desc limit 5) t
),
rev as (
  select
    coalesce(sum(value) filter (where stage='closed_won'),0)::numeric won_value,
    count(*) filter (where stage='closed_won')::int won_count,
    coalesce(sum(value) filter (where stage not in ('closed_won','closed_lost')),0)::numeric pipeline_value,
    count(*) filter (where stage not in ('closed_won','closed_lost'))::int open_count,
    count(*) filter (where stage='closed_lost')::int lost_count,
    count(*)::int total_deals
  from deals where org_id = p_org
),
rev_src as (
  select coalesce(jsonb_agg(jsonb_build_object('source', source, 'deals', d, 'wonValue', wv) order by wv desc, d desc), '[]'::jsonb) by_source
  from (
    select coalesce(source, 'unattributed') source, count(*)::int d,
      coalesce(sum(value) filter (where stage='closed_won'),0)::numeric wv
    from deals where org_id = p_org group by coalesce(source, 'unattributed')
  ) t
),
clk as (select coalesce(sum(clicks),0)::int c from tracked_links where org_id = p_org),
ldc as (select count(*)::int c from leads where org_id = p_org)
select jsonb_build_object(
  'production', jsonb_build_object(
    'total',(select total from prod),'published',(select published from prod),
    'scheduled',(select scheduled from prod),'drafts',(select drafts from prod),
    'last30',(select last30 from prod),'byPlatform',(select by_platform from prod_plat)
  ),
  'typeCounts', (select counts from type_counts),
  'aiMonth', (select ai_month from gens),
  'engagement', jsonb_build_object(
    'hasData', (select n from eng) > 0,
    'totals', (select jsonb_build_object('impressions',impressions,'reach',reach,'likes',likes,'comments',comments,'shares',shares,'saves',saves,'clicks',clicks) from eng),
    'byPlatform', (select by_platform from eng_plat),
    'topPosts', (select top from eng_top)
  ),
  'revenue', jsonb_build_object(
    'wonValue',(select won_value from rev),'wonCount',(select won_count from rev),
    'pipelineValue',(select pipeline_value from rev),'openCount',(select open_count from rev),
    'lostCount',(select lost_count from rev),'bySource',(select by_source from rev_src)
  ),
  'funnel', jsonb_build_object(
    'clicks',(select c from clk),'leads',(select c from ldc),
    'deals',(select total_deals from rev),'won',(select won_count from rev)
  )
);
$$;
