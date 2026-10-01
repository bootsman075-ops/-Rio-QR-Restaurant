-- Restrict privileged QR RPCs to trusted server-side callers.
-- Public guest flows call these through the Next.js server, never directly.

revoke execute on function public.resolve_qr_token(text)
  from public, anon, authenticated;
grant execute on function public.resolve_qr_token(text)
  to service_role;

revoke execute on function public.create_service_request(text, text)
  from public, anon, authenticated;
grant execute on function public.create_service_request(text, text)
  to service_role;

-- Internal DDL event-trigger helper must never be exposed via the Data API.
revoke execute on function public.rls_auto_enable()
  from public, anon, authenticated;
