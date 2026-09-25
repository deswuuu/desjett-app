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
