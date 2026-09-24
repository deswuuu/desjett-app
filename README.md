# Des & Jett · V2

A private two-person app for a long-distance relationship: a scrapbook with some receipts in it.
Trips are the unit. Moments (a message, photos or polaroids, a voice note, a song, sometimes a cost)
are what you add. Between visits there are envelopes, not receipts. The palm pals live on Home.

This folder is the whole app. No build step.

## Try it right now (one phone, no accounts)

Open `app/index.html` on any web server, or drag the `app` folder onto Netlify (below).
Everything is stored on that phone until you add Supabase.

## Put it on both phones (15 minutes)

### 1. Hosting — Netlify (via GitHub, so updates are one push)
1. Open this `desjett` folder in VS Code → terminal → `git init`, `git add .`, `git commit -m "Initial commit"`.
2. GitHub → New repository (private is fine) → don't add a README → run the `git remote add origin …`, `git branch -M main`, `git push -u origin main` lines it shows.
3. Netlify → **Add new site → Import an existing project → GitHub** → pick the repo → Deploy. `netlify.toml` tells it the site is the `app` folder; nothing to configure.
4. Updates: replace the changed files, then in VS Code Source Control → Commit → Sync. Netlify redeploys itself.
(Drag-and-drop still works: drag the `app` folder onto **Deploy manually**.)

### 2. Shared storage — Supabase (free)
1. Create a project at supabase.com.
2. **SQL Editor → New query**, paste `supabase/schema.sql`, run it. This makes one table (`docs`)
   and one private storage bucket (`assets`) for photos and voice notes.
3. **Authentication → Providers → Email**: leave "Confirm email" on. Magic links are the login.
4. **Authentication → URL configuration**: set Site URL to your Netlify URL.
5. **Settings → API**: copy the Project URL and the `anon public` key.
6. Open `app/config.js`, paste them in, re-deploy the `app` folder to Netlify.

Now open the site on each phone, sign in with your own email (magic link), pick your pal.
Everything syncs live between you, including photos and voice notes.

### 3. Add to Home Screen
- iPhone: Safari → Share → **Add to Home Screen**.
- Android: Chrome → menu → **Add to Home screen** / Install.
It opens full-screen with the icon, works offline for browsing, and new moments upload when back online.

## What's in the app

| Screen | What it does |
|---|---|
| Setup | Who's who (pals, cities, together since), a typical-trip guess, envelopes for between visits |
| Home | Two-skies top bar (each person's date, time, live weather), pals that move closer as the trip nears, say/think bubbles, upcoming-trip card (flight card on flight day), monthly budget pill, recent memories |
| Trips | Upcoming / Past, add a trip or a past trip (three rough numbers), trip snapshot (polaroids, stats, Days / Budget / Photos tiles), Days, Budget (actual vs plan per category, who-paid bars), Photos by day, All moments, Export |
| Day | Co-written by both of you; every item carries its pal. Photos or polaroids with draggable stickers, voice notes (share/save to Voice Memos), Spotify song, captions, costs. Plan a day. |
| New moment | Message first; Photo, Polaroid, Voice, Song, Cost are optional attachments. Cost is paid by one of you or Both (split by % or $). Date and trip auto-detected. |
| Calendar | One calendar: trip band, our plans as a circle with both pals, personal events with a dot. Every plan has a Who (both / one of you) and a "Hide from …" switch — hidden plans only show for whoever made them, so a surprise can be a couples plan and still be a secret. Import or live-sync your Google Calendar. "Make it a plan for us." Under the grid, the whole month as a list grouped by day, with the selected day highlighted. |
| Profile | Pal, shared tint, Polaroid/Clean photo style, Sky (follow / light / dark), stickers, city, Google Calendar, Trip emails, export/restore backups, sync sign-in |
| Trip emails | Paste a confirmation, upload the PDF or a photo of it, or forward it (once forwarding is set up — the steps are on the page). A round trip is read as two legs (each with its own date, times, flight number); you check the legs, pick the trip (or "+ New trip from this"), who flies and who paid, then Add. Outbound lands on day 1, the return lands on the last day, one Flight line in the Budget, and the trip's dates stretch to fit the flights. Also reachable from any trip: "Add a booking from an email". |
| Memories | By month, with arrows either side: Month N ♥ above the month name, trips, days together, meals, moments, covers, "together in [month]" total (trips + envelopes), the 23rd's moments, and an all-time row. Future months are tappable and show what's coming. |
| Every 23rd | Set "Together since" in setup or Profile. On the 23rd: Home turns blush and the pals sit together, the heading is "N months", bubble chips get "happy N months"; the calendar shows a small heart under the date; that day's page is headed "N months ♥" with a strip of other 23rds. |
| Skies | Follows real sunrise and sunset for each city: morning (blue into peach), day, sunset (blush, orange low), night (violet dusk). The other pal stands in the glow of their time of day. Same city on trip days → one sky. |

## Things that need one more account (phase two)

These are designed and wired in the UI; each needs a service you sign up for:

- **Forward emails to an address** (instead of pasting). `supabase/functions-README.md` has a ready
  Cloudflare Email Worker; forwarded emails then show up under Trip emails with a Review button.
- **Google Calendar live sync** works with the secret iCal address; Google usually blocks browser fetches,
  so add the tiny ICS proxy from `supabase/functions-README.md` and set `ICS_PROXY` in `config.js`.
- **Live flight status** on flight day. Needs a flight-data API key (`FLIGHT_API_KEY`).
  Without it the card shows the scheduled times from the confirmation.
- **Export straight into Google Drive**. Today: Export makes a folder (photos, voice notes,
  moments.txt, budget.xlsx) and opens the phone's share sheet, where Google Drive is one tap.

## Files

```
app/
  index.html          shell
  styles.css          the design (one tint, frosted layers, skies)
  app.js              every screen
  store.js            storage: local (IndexedDB/localStorage) + Supabase sync
  config.js           your keys
  sw.js               offline shell
  manifest.webmanifest, assets/   icons + the pals
supabase/schema.sql   run once in Supabase
docs/JOURNEY.md       how we got here
```

## Data model (for the curious)

Every record is a JSON doc in a collection: `users`, `settings`, `trips`, `moments`,
`events` (personal calendar), `bubbles`, `inbox`. A **moment** is the one object:
`{ date, tripId, authorId, text, photos:[{asset, polaroid, stickers}], voice, song, cost:{amount, paidBy, tag}, kind }`
where `kind` is `moment`, `booking` (flight/stay) or `plan` (a calendar plan). Photos and audio
are blobs in IndexedDB locally and in the `assets` bucket remotely.
