-- Storage bucket for photos, logos, headshots, and rendered graphics.
-- Files are namespaced by org id: the first path segment is the org uuid,
-- e.g. "<org_id>/listings/<listing_id>/photo.jpg".

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- Members of an org can read/write objects under their org's prefix.
create policy "media_read" on storage.objects for select
  using (
    bucket_id = 'media'
    and is_org_member( (split_part(name, '/', 1))::uuid )
  );

create policy "media_insert" on storage.objects for insert
  with check (
    bucket_id = 'media'
    and is_org_member( (split_part(name, '/', 1))::uuid )
  );

create policy "media_update" on storage.objects for update
  using (
    bucket_id = 'media'
    and is_org_member( (split_part(name, '/', 1))::uuid )
  );

create policy "media_delete" on storage.objects for delete
  using (
    bucket_id = 'media'
    and is_org_member( (split_part(name, '/', 1))::uuid )
  );
