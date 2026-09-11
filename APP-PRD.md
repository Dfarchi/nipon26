# NIPON26 — Personal Travel Companion · PRD

English on purpose: this doc is written to be handed to a model cold.
The rest of the repo's docs (`MANIFEST.md`, `METHOD.md`) are Hebrew.

Status: **direction agreed, nothing built.** Last updated 10.9.2026.

---

## 1. The premise

The website (`index.html` + friends, GitHub Pages) is for **planning** the trip.
The app is for **being on** the trip: 14.10–25.11.2026, 42 nights, two people.

It should cut the jumping between Google Maps, the site, booking confirmations,
tickets, notes, transit info and saved places — and stay useful with bad signal.

## 2. The constraint that decides the architecture

> Whatever we build must preserve the loop that already exists:
> **talk to Claude → the change is live on the phone.**

That loop is the product, not a convenience. It is how the 42-decision cleanup
happened, and how the trip data moves at all. Score every option against it.

| | Content edits | App/UI edits | Native APIs |
|---|---|---|---|
| **PWA** (GitHub Pages) | git push, seconds | git push, seconds | limited |
| **Expo + EAS Update** | build + publish | build + publish | full |
| **Thin native shell over `trip.json`** | git push, seconds | `eas update` | full |

**Decision: build the PWA first.** It keeps the loop whole, gives offline, costs
about an hour. Live with it two weeks. Only if something genuinely needs native —
scheduled local notifications, a home-screen widget, camera-roll access — build
the thin shell over the same `trip.json`, and none of the PWA work is wasted.

Rejected: an APK that bundles content (every bus-time change becomes a rebuild
and a reinstall on two phones), and a chat UI inside the app (the Claude app is
on the same phone and is better; a claude.ai subscription is billed separately
from API access anyway).

## 3. Data

- `data.js` is `window.TRIP = {...}`. Serve it also as `trip.json` — one build
  step — so any future native shell reads the same source.
- **Google Maps saved places: do not re-enter by hand.** Options, cheapest first:
  Takeout import once → CSV/JSON; Android share-target (Maps → share → app);
  or keep Maps as the place database and only deep-link out. Do not assume live
  sync with Saved Lists is available.
- Navigation stays in Google Maps. The site's links are already
  `google.com/maps/dir/?api=1&...`, which open the native app. Nothing to build.

## 4. Screens

Mockups: `mockup/*.dc.html` — structure is agreed, the **skin is not** (see §7).

| Screen | Job |
|---|---|
| **Today** | "What are we doing now, and what's next?" — one screen, no scrolling to the answer |
| **Day** | Full day: acts, crowd level 🟢🟡🔴, links, maps buttons |
| **Itinerary** | 45 days by phase / city / date |
| **Wallet** | Bookings, confirmation numbers, QR, docs — local to the device |
| **Open** | 1 open decision + 26 tasks, with cancellation deadlines |
| **Offline** | A designed state, not an error: what still works, when it last synced |

Design note that survived review: **the taxi card is inverted — dark text on a
light card.** It is the only screen a stranger reads, in daylight, at arm's
length. Everything else stays dark.

## 5. Features, triaged

### MVP
- **Offline-first.** Service worker: network-first for `trip.json`, cache-first
  for the shell, forced refresh on version bump (`bump.sh` already does the bump).
  This is the single biggest win and the reason the app exists.
- **Today dashboard** — current city, now, next movement, tonight's bed.
- **Wallet** — confirmations, amounts, addresses, cancellation deadlines.
- **Japanese cards** — hotel/station name and address in Japanese, full-brightness,
  built to be handed to a driver.
- **Deadline reminders** — but as an `.ics` export into both their Google
  Calendars, not in-app notifications. Zero code, works on both phones, sits
  next to the flights.
- **Journal** — written by talking to Claude Code, landing in the repo as files,
  rendered into the existing day pages. The site becomes the memento.
  No capture layer, no recording, no chat UI in the app.

### Nice to have
- Share-target to save a place from Google Maps.
- Lightweight expenses: JPY, category, day, note, rough ILS.
- Saved-places browser with Must / Want / Maybe.

### Overkill for a private two-person app
- A chat UI inside the app.
- Voice capture and on-device transcription — considered and dropped; Yuval
  won't record.
- Auto-generated journal entries from GPS + itinerary. Without a human voice
  they are the itinerary in past tense.
- Play Store, accounts, onboarding, multi-user scaling, monetization.

## 6. Known gaps, not yet solved

- **State is per-device.** Checkmarks and notes live in `localStorage`. Yuval
  ticks a task, Shir doesn't see it. No packaging fixes this — it needs a small
  backend or Firebase. Decide whether it matters before building around it.
- **Editing offline.** With no signal in Japan, Claude is unreachable, so local
  edits (tick a task, add a note, write a journal line) must be something the
  app itself does and syncs later. True for both architectures.
- **The repo is public.** It carries hotel addresses, amounts and links to
  booking documents. Journal entries would make that worse. Make it private
  before the app holds anything personal.

## 7. Visual direction — open

Round one (`mockup/`) got the structure right and the skin wrong: the Edo layer
was hand-authored SVG paths, which read as flat and stiff. The look Yuval wants —
anime references he actually likes, his own cats, something fun — is an
illustration problem, not a markup problem, and needs real assets.

Open questions before round two:
1. Which anime, specifically? (Protected character art and emblems are out;
   palette, composition and energy are fair game.)
2. Photos of Morgana and Baltrkis.
3. Public-domain ukiyo-e (Met / Art Institute of Chicago / Rijksmuseum open
   access) as the texture layer — real woodblock beats drawn paths.

Separate from the art: "it should flow" is code craft, not assets — view
transitions between screens, spring easing, skeleton states instead of spinners,
real gestures. That part is buildable now.

## 8. Next step

Build the PWA — offline first, existing screens, current skin. Reskin after §7
is answered. Slowly.
