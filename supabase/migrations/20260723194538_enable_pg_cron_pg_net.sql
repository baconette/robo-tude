-- Required for scheduling the notion-sync Edge Function to run every 24h.
create extension if not exists pg_cron;
create extension if not exists pg_net;
