-- Veilige QR-resolver.
-- Gasten kunnen één QR-token controleren,
-- maar krijgen nooit toegang tot de volledige qr_tokens- of tables-tabel.

create or replace function public.resolve_qr_token(p_token text)
returns table (
  restaurant_id uuid,
  restaurant_slug text,
  restaurant_name text,
  table_id uuid,
  table_number integer,
  table_label text
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    r.id,
    r.slug,
    r.name,
    t.id,
    t.number,
    t.label
  from public.qr_tokens q
  join public.tables t
    on t.id = q.table_id
   and t.restaurant_id = q.restaurant_id
  join public.restaurants r
    on r.id = q.restaurant_id
  where q.token = p_token
    and q.revoked_at is null
    and t.is_active = true
    and r.is_active = true
  limit 1;
$$;

revoke all on function public.resolve_qr_token(text) from public;
grant execute on function public.resolve_qr_token(text) to anon, authenticated;