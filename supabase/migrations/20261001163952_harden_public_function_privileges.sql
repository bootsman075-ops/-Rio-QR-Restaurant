-- Harden privileged helpers and prevent internal functions from being exposed as API endpoints.

alter function public.resolve_qr_token(text) set search_path = '';
alter function public.create_service_request(text, text) set search_path = '';

revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

revoke all on function public.rotate_qr_token(uuid) from public, anon;
