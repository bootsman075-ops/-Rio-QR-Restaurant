-- Storage bucket for menu item photos.
-- Public read (guests load the images via their public URL); uploads and
-- deletes only happen server-side with the secret key, so no storage.objects
-- policies are needed. Additive and idempotent: safe to run more than once.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
