-- RLS already restricts domains/use_cases to SELECT-only for anon/authenticated
-- (see existing "Public can read domains"/"Public can read use cases" policies),
-- but the underlying table grants were broader than that. Tighten them so the
-- grants themselves match intent, not just the RLS policies layered on top.

revoke insert, update, delete, truncate, references, trigger
  on public.domains
  from anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
  on public.use_cases
  from anon, authenticated;

-- Writes to these tables happen only via the notion-sync Edge Function,
-- which uses the service_role key and therefore bypasses RLS and grants.
