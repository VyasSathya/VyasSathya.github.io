# Client portal and owner studio

- `vyasapps.dev/portal/` is the client side: one project's current milestone, what is waiting on them,
  review (Approve / Request changes), Pay links, check-ins and messages.
- `vyasapps.dev/studio/` is the owner side: a bar toward the next milestone for every project, client and own,
  and everything the client sees, edited in one place.

## Access

There are no passwords and no Supabase Auth users. Every person gets a key link (`/portal/#k=...` or
`/studio/#k=...`). The page saves the key on that device and removes it from the address bar. The server
stores only the key's SHA-256. Every link can be turned off in Studio, and turning one off ends access at once.

- **owner**: Vyas, one link per device. "Add a device" in Studio > Access makes another.
- **client**: one or more projects. "New client link" on a client project makes one. It is shown once.
- **sync**: the PC feed. It can only read feed settings and push feed items.

The raw owner and sync keys live in `%USERPROFILE%\.vyasapps-portal\keys.json`, which is never in a repo.

## How it is built

- Tables are in the private `portfolio` schema of sparktory-prod (`portfolio-portal.sql`). RLS is on and there is
  no anon or authenticated access. The tables are reached only through the `portfolio-portal` edge function
  (`portfolio-portal.ts`), over the direct database connection.
- Clients get client-visible milestones, items and check-ins only. They never get private notes, feeds, signals or
  other projects. Feed items arrive hidden; "Shown" on an item reveals it to the client.

## How progress is counted

- **Bar.** Checklist items done / items in the current milestone. Only acceptance makes it 100%.
- **Review.** "Send for review" starts a 5-business-day window. The client approves or requests changes. With no
  reply, the milestone counts as accepted when the window ends.
- **Payment.** Paste a Stripe hosted invoice link on the milestone to show Pay to the client, then "Mark paid".
- **Change orders.** These are milestones marked Change, with their own amount.

## Phone app and notifications

- Both pages install as apps. The client app is dark and the studio app is green. On iPhone: Share, then Add to Home Screen,
  then open it and tap Turn on updates (iOS 16.4+; iOS needs the installed app for push). On Android and desktop
  Chrome there is an Install app button. The key is saved in a cookie as well as localStorage because an iPhone
  Home Screen app starts with Safari's cookies but not its localStorage (iOS 17.2+). Otherwise, paste the link on
  the first screen.
- Push uses Web Push with VAPID keys. The private key is only in the function secrets (`PORTAL_VAPID_*`) and in
  `%USERPROFILE%\.vyasapps-portal\keys.json`. The payloads are Declarative Web Push JSON, so iOS 18.4+ shows
  them without the service worker. Other browsers get them through `portal/sw-core.js`, which also refreshes
  any open page.
- Clients hear about:
  - check-ins they can see
  - a milestone sent for review
  - an invoice
  - payment received
  - Vyas's messages
  - new decisions
  - review closing in a day
  - things waiting on them for 3+ days (nudged at most every 3 days)
  - auto-acceptance
- Vyas hears about:
  - approvals
  - change requests
  - answers
  - client messages
  - auto-acceptance
  - nudges sent
- Each device can pause updates. Every notice is also kept as the feed: "Since your last visit" for clients and
  Activity in Studio.
- Reminders run on Supabase itself with pg_cron (`vyasapps-portal-tick`, every 15 min). It posts `tick` with a
  `cron` key stored in the vault as `portal_cron_key`, so it keeps working when the PC is off.

## Decisions, budget, calendar

- **Decisions.** A question with options the client taps (or a written answer) and a due date.
- **Budget.** Total, paid, due and not yet billed, from the milestone amounts.
- **Add dates to calendar.** Downloads an .ics file with target dates, review deadlines and decision due dates.

## Feeds (`portal-sync.py`)

Each project's feeds are set in Studio > Settings:

- **hub**: hub task ids. Each subtask becomes a checklist item.
- **brain**: last handoff time and remaining count.
- **repo** or **github**: last commit time.

The scheduled task "vyasapps portal sync" runs `%USERPROFILE%\.vyasapps-portal\portal-sync.py` with pythonw every
30 minutes and logs to `sync.log` beside it. After changing the script here, copy it there.

## Deploy

```
supabase db query --linked -f backend/portfolio-portal.sql
# copy portfolio-portal.ts to supabase/functions/portfolio-portal/index.ts in a temp dir, then:
supabase functions deploy portfolio-portal --project-ref ihmayqzxqyednchbezya --use-api
```
