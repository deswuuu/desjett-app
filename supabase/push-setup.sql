-- Des & Jett — notifications. Run once in Supabase → SQL Editor, after deploying the "notify" function.
-- Replace YOUR-PROJECT-REF and YOUR-NOTIFY-SECRET (both appear twice).
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 1. when something changes, tell the function (only the kinds of records that can notify)
create or replace function public.dj_notify() returns trigger language plpgsql security definer as $$
begin
  if new.collection in ('bubbles','moments','comments','presents','pushtest') then
    perform net.http_post(
      url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify',
      headers := jsonb_build_object('Content-Type','application/json','x-notify-secret','YOUR-NOTIFY-SECRET'),
      body := jsonb_build_object('type','change','op',TG_OP,'collection',new.collection,'record',new.data,'old',case when TG_OP = 'UPDATE' then old.data else null end)
    );
  end if;
  return new;
end $$;
drop trigger if exists dj_notify on public.docs;
create trigger dj_notify after insert or update on public.docs for each row execute function public.dj_notify();

-- 2. every 15 minutes, check for reminders (trips, flights, birthdays, the 23rd)
select cron.schedule('dj-reminders', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type','application/json','x-notify-secret','YOUR-NOTIFY-SECRET'),
    body := '{"type":"tick"}'::jsonb
  )
$$);
