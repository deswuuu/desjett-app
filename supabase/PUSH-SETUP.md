# Notifications — one-time setup (about 15 minutes)

Two pieces in Supabase: a small function that sends notifications, and a trigger + timer that call it.
Everything is done in the Supabase dashboard. The values (keys, secret) come from Claude's message —
they're not stored in this folder on purpose.

1. **Edge Functions → Deploy a new function → Via Editor.** Name it `notify`. Delete the sample code,
   paste all of `supabase/functions/notify/index.ts`, **Deploy**.
2. Open the `notify` function → **Details / Settings** → turn **off** "Enforce JWT verification"
   (the function checks its own secret instead) → Save.
3. **Edge Functions → Secrets → Add** four secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `VAPID_SUBJECT` (`mailto:` + your email), `NOTIFY_SECRET`.
4. **SQL Editor → New query**, paste `supabase/push-setup.sql` with your project ref and secret filled in, **Run**.
5. In `app/config.js` add `PUSH_PUBLIC_KEY: "…",` (the same public key), then commit and push.
6. On each phone, in the **Home Screen app**: Profile → Notifications → **Turn on** → Allow → **Send me a test**.

If a test doesn't arrive: Edge Functions → `notify` → **Logs** shows what happened.
To stop reminders: `select cron.unschedule('dj-reminders');` in the SQL Editor.

## Updating (V2.9, optional)
Chat photos/stickers and photo imports work without this. Doing it makes the notifications nicer:
"Des sent a photo 📷" instead of “📷 Photo”, and one "Des added 42 photos · 7 new memories from Toronto"
for an import instead of nothing.
1. **Edge Functions → notify → Code**: replace everything with the new `supabase/functions/notify/index.ts` → **Deploy**.
2. **SQL Editor → New query**: run just this (it adds 'imports' to the list):
   ```sql
   create or replace function public.dj_notify() returns trigger language plpgsql security definer as $$
   begin
     if new.collection in ('bubbles','moments','comments','presents','pushtest','imports') then
       perform net.http_post(
         url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify',
         headers := jsonb_build_object('Content-Type','application/json','x-notify-secret','YOUR-NOTIFY-SECRET'),
         body := jsonb_build_object('type','change','op',TG_OP,'collection',new.collection,'record',new.data,'old',case when TG_OP = 'UPDATE' then old.data else null end)
       );
     end if;
     return new;
   end $$;
   ```
   (same project ref and secret you used the first time — it only replaces the function, nothing is deleted.)
