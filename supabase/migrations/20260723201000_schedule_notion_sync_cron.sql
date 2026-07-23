-- Runs the deployed notion-sync Edge Function once a day at 06:00 UTC.
-- Uses the anon key for the request auth header (the function itself uses
-- SUPABASE_SERVICE_ROLE_KEY, auto-injected as an Edge Function secret, to do
-- the actual writes — the anon key here is only to pass verify_jwt).
select cron.schedule(
  'notion-sync-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://ugkmacjiddotrafctqsi.supabase.co/functions/v1/notion-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || 'sb_publishable_aHswmnV3UAZj-Ki935f2mw_Xd2mxKBK',
      'Content-Type', 'application/json'
    )
  )
  $$
);
