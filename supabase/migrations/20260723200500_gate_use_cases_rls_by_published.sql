-- The existing "Public can read use cases" policy had no predicate (qual = true),
-- so draft/unpublished use cases were already publicly readable via the anon key.
-- Replace it with a policy that only exposes published rows, matching the
-- confirmed rule that `published` gates all visitor-facing visibility.
-- domains has no publish gating (a domain is just a container; its visibility
-- follows from whether it has any published use cases, decided app-side).

drop policy if exists "Public can read use cases" on public.use_cases;

create policy "Public can read published use cases"
  on public.use_cases
  for select
  to anon, authenticated
  using (published = true);
