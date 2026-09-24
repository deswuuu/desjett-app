# Des & Jett — build log

## Where it started
Jett made a budget spreadsheet (dashboard, two personal budgets, a Shared Expenses tab). Its first computed number was "Balance (Jett minus Desiree)" / "Who's Ahead". Des wanted an app, not a spreadsheet, and no scoreboard.

## Decisions
- **Us first, who-paid second.** Recorded on every item, shown per trip, never summed into a lifetime balance.
- **Awareness, not control.** No alarms or red bars; cost vs plan is said in words.
- **Two kinds of money.** Envelopes between visits (a number, never logged); trips itemized.
- **The unit is a moment.** Message + optional photos / polaroid / voice / song / cost.
- **Days are co-authored.** Every item carries its author's pal.
- **Hiding never deletes.** Calendar events can be hidden from the other person; they stay in Google.

## Design rounds
1. First sketches: serif, colour blobs, explainer text in UI. "Looks AI."
2. One sans, white ground, glass over colour. Still too much colour.
3. Auro reference: one pale sage tint, frosted layers, Geist everywhere. This is the look.
4. Palm pals (bunny = Des, puppy = Jett) as avatars, stickers, countdown. Trips expanded. Calendar with hidden events. Profile.
5. Speech/thought bubbles. One calendar. Photos grid. Export to Drive via share sheet. Between visits in Profile.
6. Trip snapshot as the main trip screen. Three-tier calendar marking.
7. From email: paste/forward a confirmation → review → into the trip. Flight-day card on Home.
8–9. Author pals on every day item; both pals on shared calendar rows.
10. Every 23rd (anniversary Jul 23): pals together and a blush Home each month, a heart under the date on the calendar, the day page headed with the month count, and Memories reorganised by month with "Month N ♥" above the month name and tappable future months.
Skies: morning (blue→peach), day, sunset (blush, orange low), night (violet dusk). Two-skies top bar with each person's date, time, weather; the other pal glows in their time of day.

## Final product
Installable web app (PWA), vanilla HTML/CSS/JS, Supabase for shared storage + magic-link auth, Netlify hosting. See README.md for the feature table and setup.

## Left out on purpose
Lifetime balance, per-person totals across trips, over-budget alerts, visible gift amounts, prominent light/dark switch.

## Phase two
Inbound email address, live flight status, Google Calendar live sync, direct Google Drive export, a sticker pack from plushie photos.

## V2 (after the first click-through)
Two evenings of feedback rounds on real screens produced V2:
- Home: fixed sides (Des/Vancouver left, Jett/Toronto right), your small pal on your side opens Profile, hint until the first bubble, the line under the pals opens Chat, spacing fixed, pals together on trips.
- Chat: every bubble ever, messenger style, all in the tint colour; said with a squared corner, thought italic with trailing circles.
- New memory: tall sheet, Trip / No trip with the trip list dropping down from the chip, categories from the trip's budget plus "+ Other", "Transport".
- Budget: Actual / Planned columns, who-paid pals right-aligned, category pages, add / rename / remove categories.
- Calendar: taller band with the heart directly under the 23rd, plans with a Who, Google Calendar live sync from the secret address with a "show my events" switch.
- Tints: six (sage, pink, butter, sky, silver, ink), all on the sage template (pale ground, white glow, one colour glow), day mode only, buttons and chat in the tint's dark colour, Profile always in daylight.
- How it works: six cards in Des's voice, the Trips card as a framed miniature.
- Memories: Month N counted in calendar months (Sep = 2), a Chat row per month.
- Setup: no Subscriptions envelope by default; the tutorial plays right after setup.

## V2.1 (second click-through)
- Pals actually touch on the 23rd on real phone widths (the meeting point is computed from the screen width, not a fixed number).
- Memories: the month number is the calendar-month difference from July, so October says 3.
- Between visits left the Profile (it lives on Home / Memories).
- Calendar: "+ Mine" is gone. One "+ Plan" sheet with Who (both / Des / Jett) and a "Hide from …" switch that works for any Who — a hidden couples plan is visible only to whoever wrote it, and shows a small "hidden" tag for them.
- Google Calendar: the page explains the relay when the browser blocks the fetch, with the two-minute Cloudflare steps inline.
- Trip emails: paste, upload (PDF read in the browser, photos OCR'd), or forward; forwarding steps live on the page instead of pointing at a guide. Round trips parse as legs; the review sheet shows every leg editable, a trip picker with "+ New trip from this", Who flies and Paid by. Days shows "Des lands 4:10 pm" on the first flight day and "Des flies home 9:00 am" on the last; the flight is one Budget line; the trip stretches to cover both legs.
- Paid by is editable on any cost (tap edit on the moment).
- Tests: the smoke walkthrough now adds a hidden couples plan and a two-leg round trip and checks both.

## V2.2 (third click-through — "is delete actually deleting?")
- Traced deletion end to end and wrote a test for the exact steps: add a real Flair round trip, tap Fun on a flight and Close, delete the outbound, reload. Records are gone and stay gone.
- The real bug behind "it moved to Fun": edit sheets worked on the saved record's own cost object, so a chip tapped and then Closed still stuck. Edit sheets now work on a true copy; Close discards. Delete shows a "Deleted" toast.
- Reader: "25 September 2026" no longer reads as the 20th; F8603-style flight numbers; the date nearest a flight line wins whether it's above (WestJet) or below (Flair).
- Flights say lands / flies home by destination — landing in the other person's city vs flying back to your own — not by which flight came first.
- Calendar: the whole month's plans, flights, events and the 23rd listed under the grid, grouped by day; the selected day is highlighted and carries "+ Plan".
- Category pages: "Add a booking from an email". A new trip from an email is named after the city (Vancouver), not the airport code.
- Home: "2 months!"

## V2.3
- Calendar list keeps rolling past the month (month dividers), "2 Months" everywhere.
- Home bubbles follow the pals and use the chat shapes; tapping a bubble opens the chat; a quiet "Chat ›" sits at the end of the line.
- Budget planning per category: Total / Per day (Per night for Stay) × Both / Each, with the maths shown ("$200/day together · 5 days").
- A cost can be paid by Both, split by % or $ (the other side fills itself in); who-paid bars and exports use the real shares.
