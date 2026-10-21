# Client-side flows: home and field services

Researched 2026-10-20 from vendor help centers, product pages, app store listings and review sites.
Scope: only what the business's CLIENT (homeowner, resident, mover customer) sees and does.

Evidence labels used below:
- [HELP] vendor help-center article written for or about the client view (strongest).
- [MKT] vendor marketing page (says what exists, rarely the exact screen).
- [REV] third-party review (G2, Capterra, community forum, press).
- [GAP] not found; do not build on it without checking.

Note on screenshot URLs: Houzz, Jobber and AccuLynx images are stable CDN URLs. Housecall Pro
(Intercom) and ServiceTitan (document360) image URLs are signed and expire within hours/days, so the
help-article page URL is listed instead; open it to see the images. Buildertrend's site returns 403 to
scripted fetches, so its pages are listed as page URLs only.

---

## 1. Buildertrend (Client Portal + Buildertrend mobile app)

**Who uses it:** custom home builders, remodelers, design-build firms, pool builders (Ashton Pools,
Cronulla Pools publicly), roofing and specialty contractors on bigger jobs.

**Client flow, screen by screen**
1. **Invite email** from the builder -> client creates a login (username/password) for the web Client
   Portal; the same login works in the Buildertrend iOS/Android app (one app for builders, subs and
   clients; role decides what shows). [HELP glossary, MKT]
   - Reported friction: "clients and sub-contractors ... get confused how to sign in" (Capterra builder
     review). [REV]
2. **Summary / dashboard**: "price summary, a weekly schedule and high-level project details". [MKT]
   - Job Price Summary = contract price, approved change orders, allowances, selected options; recent
     release replaced "Job Running Total" with Contract Price, Current Price, Price Adjustments. [HELP glossary, release notes]
3. **Schedule**: list or calendar/Gantt of phases; client sees "what's coming up next" and can comment
   per item. Builder chooses which items are shared. [MKT]
4. **Daily Logs**: dated entries with work completed, site conditions/weather, notes and photos; client
   can comment. Some builders send them automatically every day (Cronulla Pools). [MKT, REV]
5. **Photos / Documents / Videos**: builder-shared folders plus a "Client Uploaded Files" area where the
   client can upload into Photos, Documents or Video. [HELP Client Portal FAQ]
6. **Selections**: choices organized by **Location** (Kitchen, Primary Bath) or **List view**; each
   selection shows options with price, allowance and approval deadline; client Approves or Declines an
   option; running total of approved amounts updates; builder can reset to Pending. [HELP Selections
   on Mobile, Selections and Allowances Overview]
7. **Change Orders**: title, description, (optionally) line-item costs, total price impact, approval
   deadline; client Approves or Declines and e-signs. Builder controls whether line items are visible
   and whether internally declined COs are shown. Option "Invoice on client approval". Client can also
   *request* a change order. [HELP Change Order Overview, MKT]
   - Proposal approval flow (documented client side): open proposal -> Approve -> disclaimer screen ->
     Sign -> Finish. [HELP How to Approve a Proposal]
   - Bug report: "comments to customers on Change Orders don't display for the customer" (G2). [REV]
8. **Invoices / Payments**: all past and present invoices, pay online (card/ACH). [MKT]
9. **Messages**: threaded messages per job, replaces email ("the emails have stopped" - Capterra). [REV]
10. **Warranty**: Project Management menu -> Warranty tab -> New Claim (Title, Description,
    Attachments); builder may schedule an inspection appointment; client approves/declines/comments on
    the appointment; all claim statuses listed under the tab. [HELP Client Portal FAQ]
11. **Client Updates** (announced): weekly recap summaries the builder drafts, with an AI draft option.
    Status unconfirmed. [Release notes]

**Used most vs ignored:** Builders and clients cite daily logs + photos and messages ("user-friendly
for clients seeking to view progress", "clients love it"). Complaints are about sign-in confusion and
CO comment bugs, not missing features. No homeowner-written app-store complaints surfaced. [REV]

**Screenshots / pages**
- App Store: https://apps.apple.com/app/id504370616 (4.5, ~4.8K ratings, shared builder/client app)
- https://buildertrend.com/communication/construction-client-portal/
- https://buildertrend.com/help-article/buildertrend-glossary-for-clients/
- https://buildertrend.com/help-article/client-portal-faqs/
- https://buildertrend.com/help-article/selections-on-mobile/
- https://buildertrend.com/help-article/how-to-approve-a-proposal/
- https://buildertrend.com/blog/best-home-construction-app-for-homeowners/

**Notifications:** email + app push for new daily logs (if builder sets auto-notify), selection
deadlines, change orders awaiting approval, warranty appointments awaiting approval, new messages,
invoices. [HELP FAQ, MKT]

---

## 2. JobTread (Customer Portal)

**Who uses it:** remodelers, custom builders, specialty trades (roofing, decks, concrete), increasingly
ex-CoConstruct users.

**Client flow**
1. **Email with a button** -> opens portal in the browser via a personal magic link (no username /
   password, "do not forward this link"). Password is needed only to install it as a mobile app (PWA)
   or to save ACH bank details. [HELP Using the Customer Portal, Create a Password, Pay an Invoice]
2. **Portal home**: if the client has several jobs, a navigation panel to switch projects and see tasks
   and documents across all of them; if several contractors use JobTread, switch by clicking the
   contractor logo at top left. [HELP]
3. **Documents** (estimates/proposals, change orders, invoices) with **status and change history**. [MKT]
4. **Sign a proposal**: review the order -> make selections inside it -> expand attached photos, files,
   videos -> read contract and terms -> Comment box (message + upload files/photos/videos) ->
   e-sign at bottom -> green **Approve** button. [HELP Sign a Proposal]
5. **Selections tab**: expand each Selection Document -> tick boxes for pre-defined options, or fill
   write-in fields + upload photos/files -> "submit your write-in selections for review before signing"
   -> comment -> sign and approve each selection document. Allowances tracked. [HELP Make Selections]
6. **Pay an invoice**: review invoice, comment/upload, pay by card or ACH (if enabled). [HELP]
7. **Schedule and To-Dos**: full schedule, specific phases, or only tasks assigned to the customer. [MKT]
8. **Files and photos** shared by the contractor. [MKT]
9. **Messages**: replies notify all participants. [MKT]
10. **Customize notifications** page for the client. [HELP article exists; content not retrieved]
- Contractor controls visibility by **customer role**. [MKT]
- Daily logs to clients: [GAP] not described on the portal page.

**Screenshots**
- https://www.jobtread.com/images/customer-portals/customer-portal-hero.webp
- https://www.jobtread.com/images/customer-portals/customer-portal-documents.webp
- https://www.jobtread.com/images/customer-portals/scheduling-assign-todos-customer-portals.webp
- https://www.jobtread.com/images/customer-portals/customer-portal-mesaging.webp
- https://www.jobtread.com/images/customer-portals/selections-allowances.webp
- https://www.jobtread.com/images/resources/training/customers/sign-a-proposal-1.webp
- https://www.jobtread.com/images/resources/training/customers/sign-a-proposal-2.webp
- Help desk: https://www.jobtread.com/resources/help/customer-portal

**Notifications:** email when a document is ready to review/sign/pay; email to all participants on new
comments/replies; client-configurable settings. [HELP]

---

## 3. CoConstruct

**Status:** acquired by Buildertrend (2021), no longer developed, users being moved to Buildertrend;
historical data stays readable. Its client-facing ideas (selections-first, client comment threads on
every item) live on in Buildertrend/JobTread. Reviews found are about the forced migration and price
("increased monthly costs by 500%", Reddit via aggregator), not the client portal. [REV]
Treat as dead for new research; do not model a portal on it specifically.

---

## 4. Houzz Pro (Client Dashboard)

**Who uses it:** interior designers, design-build remodelers, kitchen/bath, landscape designers.

**Client flow** [HELP "How to Use Your Project Dashboard (For Clients)"]
1. **Invite email** "Go to Project Dashboard" button, or a unique link; no separate login described;
   help article tells clients to bookmark it.
2. Left menu (pro decides which sections show; showing a section is not the same as sharing access):
   - **Overview**: current state, relevant documents, messages, financial overview; Send Message button.
   - **Messages**: full history; send with attachments.
   - **Project Updates**: weekly progress report = work completed, next steps, **items needing
     attention (approvals or payments)**, photos. Email sent each time one is published.
   - **Claims** (warranty): description, status, photos; Create a Claim; pro approves/denies.
   - **Contracts**: status, View, sign, signed copy.
   - **Financials**: estimates, proposals, invoices, change orders, project totals; view, download, pay.
   - **Budget**: total project cost, amount invoiced, line items.
   - **Online Payment Records**: receipts ("for taxes, cost tracking, home sales, or bank approval").
   - **Selection Boards**: approve/decline each item, comment, export PDF, switch boards by dropdown,
     **order, ship and delivery dates** when shared; pro can hide prices or product URLs.
   - **Mood Boards**, **3D Floor Plans**: open full view.
   - **Tasks**: tasks assigned to the client with deadlines; mark done; completed drop to bottom.
   - **Schedule**: Gantt; switch to calendar; zoom hourly to yearly; collapse phases.
   - **Files & Photos**: search, filter, sort, list/grid, zoom, comment, download.
   - **Daily Logs**: view, comment.

**Screenshots** (stable CloudFront)
- Invite email: https://d12ttebjzxeiti.cloudfront.net/houzz/Z7doYZ7c43Q3gB7n_ClientDashboardEmail1.png
- Mobile 1-3: https://d12ttebjzxeiti.cloudfront.net/houzz/Z9hxSziBA97GikT8_CDMobile1.PNG ,
  https://d12ttebjzxeiti.cloudfront.net/houzz/Z9hxejiBA97GikUD_CDMobile2.PNG ,
  https://d12ttebjzxeiti.cloudfront.net/houzz/Z9hxmjiBA97GikUF_CDMobile3.PNG
- Desktop: https://d12ttebjzxeiti.cloudfront.net/houzz/Z9hx1jiBA97GikUM_ClientDashboardDesktop.png
- Project Updates: https://d12ttebjzxeiti.cloudfront.net/houzz/J6JIOLQuCmSyOJXS_ProjectUpdatesDashboard.png
- Budget: https://d12ttebjzxeiti.cloudfront.net/houzz/abG421xvIZEnjlcH_BudgetClientDashboard.png
- Article: https://pro.houzz.com/pro-help/r/how-to-use-your-project-dashboard-for-clients

**Notifications:** invite email; email per published Project Update; payment reminders; new
documents to review. Online payment availability varies by country. [HELP]

---

## 5. CompanyCam (shared timeline / project link)

**Who uses it:** roofing (very heavy), restoration/insurance work, siding, windows, HVAC installs,
plumbing, solar, remodelers. Usually alongside another system (JobNimbus, AccuLynx, Jobber).

**Client flow**
1. Crew taps **Share** on a project -> generate **timeline link** (or add **Guest Access**, web-only,
   select plans). Link often attached to invoices/estimates. [HELP Guest Access, Knowify integration page]
2. **Timeline page** (no account, no app): chronological feed of photos, videos and documents, each
   stamped with date/time, GPS and the user who took it; updates live as crew uploads; crew can hide
   individual photos from the shared view. [REV contractortoolstack, Capterra]
3. Guests added to a project can add notes in real time. [REV]
- Exact page layout and captions: [GAP] official help article not retrieved.

**Used most:** the live photo link itself. "This feature alone has reduced my customer phone calls by
probably 30%" (reviewer). Also sent to insurance adjusters "so everyone can see exactly what our
contractors do, step by step". Complaint: link/photos fail to load on weak cell signal. [REV]

**Pages**
- https://intercom.help/companycamapp/en/articles/6828444-how-to-add-guest-access-on-projects
- https://contractortoolstack.com/software/companycam/
- https://www.capterra.com/p/171143/CompanyCam/ (review screenshots)

**Notifications:** none automatic to homeowner found; the contractor texts/emails the link once. [GAP]

---

## 6. Jobber (Client Hub)

**Who uses it:** lawn care/landscaping, cleaning, HVAC, plumbing, electrical, pest, pressure washing,
window cleaning, handyman, pool service (not pool construction).

**Client flow** [HELP "What do your clients see in client hub"]
1. **Passwordless entry**: link in any quote/invoice/reminder email or text, or a "Client hub" login
   button on the business website. After 14 days without a fresh link, client is asked for email or last
   4 digits of phone. Anyone with the link sees the same data.
2. **Requests**: new work request form (if enabled), list of past requests, optional card capture.
3. **Quotes**: status "Awaiting Response" / "Approved"; buttons **Approve** (signature), **Request
   changes**, **Download PDF**; optional line items with images (Grow plan); **Approve & Pay Deposit**
   in one step.
4. **Appointments**: date, time or arrival window, address, assigned team members' first names and
   photos; today, next 5 upcoming, past visits ("Show More").
5. **Invoices**: "Awaiting Payment" / "Paid" / "Past Due"; Pay form with tip, method, details; green
   Pay button showing total incl. tip; Pay in full / Other amount (partial); Download PDF. On mobile the
   pay form is at the top.
6. **Wallet**: saved cards, default star, remove (blocked if card funds an auto-pay job).
7. **Contact Us**: company phone, website, email, address, hours, socials.
8. **Refer a Friend** pop-up (some plans).

**Used most / complaints:** quote approval and invoice pay are the main reasons clients open it.
Forum complaint from a contractor: against "my customers having to log into the client hub"; some are
seniors "challenged sending a text message or email"; he sees customers "once every 2 or 3 years".
Booking-calendar error reported and fixed. [REV Jobber community]

**Screenshots** (stable)
- https://help.getjobber.com/_astro/4407545038487.Bqbm4117_Vq039.webp
- https://help.getjobber.com/_astro/22908997070487.DeUtCUf6_2cGqFy.webp
- https://help.getjobber.com/_astro/22909021446423.CBjtjbie_Zy6gLt.webp
- https://help.getjobber.com/_astro/27313070224919.D97atv6w_Z2iqtOu.webp
- Article: https://help.getjobber.com/en/articles/what-do-your-clients-see-in-client-hub/

**Notifications:** quote sent + automatic quote follow-up reminders; appointment reminders (email/SMS);
"on my way" text with rough arrival minutes; invoice sent + overdue reminders; post-visit follow-up /
review request; receipts. [MKT, HELP]

---

## 7. Housecall Pro (Customer Portal)

**Who uses it:** HVAC, plumbing, electrical, cleaning, garage door, appliance repair, carpet cleaning,
handyman, pest, landscaping.

**Client flow** [HELP "Using the customer portal"]
1. **Invite email** "Login to Customer Portal" button = magic link, valid 7 days; expired link auto-
   sends a new one. Invite can auto-send when a job is scheduled. Branding: logo, phone, email, address.
2. Collapsible left nav:
   - **Appointments**: Upcoming / Past tabs. Unpaid-invoice banner appears here.
   - **Invoices**: past and current with status and Pay; badge in nav when unpaid.
   - **Estimates**: open ones to view/approve (badge); approved/declined/expired viewable.
   - **Send a Message**: request new / reschedule / cancel (requires custom SMS number).
   - **Book Online** button top right -> online booking flow.
   - **Card on File**: add/update/remove (business is emailed).
   - **Referral Program**: unique link.

**Used most:** the texts, not the portal: scheduled confirmation, "On my way" with tech photo, job
finished, invoice, review request. Customer replies to job texts route to the tech's app. [HELP]

**Pages** (images on these are signed Intercom URLs that expire; open the article)
- https://help.housecallpro.com/en/articles/8448657-using-the-customer-portal
- https://help.housecallpro.com/en/articles/357613-customer-notifications-overview
- https://www.housecallpro.com/features/customer-portal/

**Notifications:** Job/Estimate Scheduled (text + email, resent if time or tech changes); On My Way
(text only, with tech profile photo; no ETA confirmed); Job Finished (text); Review Request (text +
email when job finished, Reviews app); marketing campaigns; payment receipt. [HELP]

---

## 8. ServiceTitan (Customer Portal)

**Who uses it:** mid-to-large HVAC, plumbing, electrical, garage door, roofing, and residential/
commercial service companies with memberships (maintenance plans).

**Client flow** [HELP Customer Portal overview, release notes]
1. **Login page** -> "Request an invitation" -> enter email that matches the customer record ->
   confirmation email -> set password. (Password-based, unlike Jobber/HCP.)
2. **Invoices (Online Payments)**: unpaid invoices for completed jobs; pay full or partial (partial =
   one invoice); full payment can cover several invoices; new card, saved card or ACH; "bill to"
   dropdown for multiple profiles.
3. **History**: invoices by service location; view/download.
4. **Memberships** (residential) / Contracts (commercial): plan details, upcoming maintenance visits,
   update card for the membership; Visits tab with call / request-appointment options.
5. **Web Appointment Scheduler** (if enabled): request or self-book from real capacity, limited job types.
6. New portal adds: estimates (approve/decline), equipment history (installed units), upcoming work.
- Internal/dispatcher notes never shown.

**Pages**
- https://help.servicetitan.com/docs/customer-portal-overview (screenshots of Invoices and History
  tabs and the Request-an-invitation page; image URLs are signed and expire)
- https://servicetitan.com/features/customer-portal-software
- https://www.servicetitan.com/blog/webinar-recap-unlock-a-better-customer-experience

**Notifications:** booking confirmation, appointment reminders, dispatch / technician-on-the-way
(often with tech photo and live map via add-ons), invoice email with {CustomerPortalLink}, review
requests (Reputation module). Turning off job notifications also stops confirmations and reminders. [HELP]

---

## 9. AccuLynx (Customer Portal) - roofing

**Who uses it:** roofing contractors (retail and insurance/storm), siding, gutters, windows.

**Client flow** [MKT product announcement 2022, enhancements post]
1. After job approval, contractor invites -> **secure web link + login tied to the homeowner's mobile
   phone** (code to phone).
2. **Project Summary** landing: photo of their home, project details, contact cards for team members.
3. Documents (estimates, contracts, job packets, company docs), photos, invoices in one place.
4. **Upcoming appointments** (inspection, adjuster meeting, install date).
5. **Messages** to the contractor's team.
6. **Pay invoices**; financing offers.
- Access can auto-expire when the job closes.

**Screenshots**
- https://acculynx.com/wp-content/uploads/2022/05/Sample-Project-Summary-1024x756.png
- https://acculynx.com/crm-communication
- https://rooferscoffeeshop.com/post/acculynx-introduces-new-customer-portal-for-roofing-contractors

**Notifications:** customizable automated alerts when new content or messages are posted. [MKT]
Roofing clients also commonly receive a CompanyCam link for photos (see 5).

---

## 10. Solar installer customer apps (Sunrun, Tesla, Bodhi, Enerflo)

**Who uses it:** residential solar + battery installers and national providers.

**Sunrun app** [MKT welcome page, Google Play notes]
- Install tracker stages: **Home review -> Design approval -> City permitting -> Installation -> City
  inspection -> Power on**; "Dynamic Install Status Tracker" for not-yet-activated customers, later
  with appointment info.
- Message your rep and CX pro; review and sign documents; submit referrals for cash.
- After PTO: system/energy monitoring and billing.
- Store: https://apps.apple.com/us/app/sunrun/id6443806453 ,
  https://play.google.com/store/apps/details?id=com.sunrun.customerapp
- Reviews of the company: smooth installs for many, "delays ... or communication issues" for others. [REV]

**Tesla (Tesla app / Tesla Account)** [HELP tesla.com support]
- Order page with status and **next steps / tasks**: upload utility bill, confirm design and price
  (Interactive Layout after bill upload), HOA approval responsibility, schedule install.
- Then permits (2-6 weeks), utility approval, install, inspection, pay open invoices, Permission to
  Operate; then the app becomes the energy monitoring app.
- https://www.tesla.com/support/energy/solar-panels/going-solar/process-overview
- https://www.tesla.com/support/energy/solar-panels/install/installation-process

**Bodhi (white-label for installers)** [REV Electrek 2022, Solar Academy]
- Tracker "from design through powering up"; alerts on permitting, payments, notice-to-proceed,
  installation, inspection; text + email + in-app; integrates with installer CRM; free tier up to 60
  projects. https://electrek.co/2022/01/31/this-app-makes-tracking-rooftop-solar-installation-and-performance-a-cinch-for-homeowners/

**Enerflo customer portal**: real-time project status, installer-configured milestones contract -> PTO,
loan/doc signing. Exact homeowner screens [GAP].

**Solo**: [GAP] no homeowner-side documentation found.

**Notifications:** milestone-change texts/emails (permit submitted/approved, install scheduled,
inspection passed, PTO granted), document-to-sign requests, appointment reminders.

---

## 11. Pool builders

**Tools:** Buildertrend (most common for construction), custom branded apps, PoolBuilderHQ, Projul.
- **My CPL (California Pools & Landscape)** builder-branded app: project progress, construction
  photos, upcoming schedule, account balance, contract and change-order documents.
  https://apps.apple.com/us/app/id1384809910 [MKT]
- Cronulla Pools on Buildertrend: clients see the schedule and **daily logs sent automatically every
  day**. https://buildertrend.com/?p=41880 [MKT case study]
- Pool construction has named phases clients follow: design, permit, excavation (dig day), steel,
  plumbing/electrical, gunite/shotcrete, tile/coping, decking, plaster, startup/fill, orientation.
  [GAP for exact app labels; phases are industry-standard]

---

## 12. Moving companies (SmartMoving, Supermove)

**SmartMoving customer portal** [MKT, HELP]
1. Estimate arrives by text/email -> mobile portal: move details, estimate (price display set per
   estimate), contracts, waivers, invoices.
2. **Manage Inventory**: room-by-room item tool (or direct link by text/email from consultant).
   https://help.smartmoving.com/en/articles/4189788-use-the-customer-mobile-friendly-inventory-tool
3. **Sign** estimate/contract/addendum (simple link; ahead of time or on move day).
4. **Pay deposit** online (if company charges one). Reviewer: deposit sometimes shows on the wrong day
   of a multi-day move. [REV Capterra]
5. Upload documents.
- Pages: https://www.smartmoving.com/impress-your-customers ,
  https://help.smartmoving.com/en/articles/4166016-1-0-send-book-and-confirm-estimates

**Supermove** [MKT]
- Customer gets an "Uber-like live link" to follow the crew once en route.
- On move day the crew walks the customer through a **digital bill of lading** on a tablet; customer
  signs, tips and pays in the app (Stripe).
- https://www.supermove.com/manage-jobs

**Notifications (moving):** estimate ready (text), signature request, deposit receipt, confirmation one
day before move, "on the way" when crew leaves warehouse and when arriving at destination, final
invoice, review request.

---

# Synthesis: core views per business type

| Business type | Core views the client cares about (2-3) | Evidence |
|---|---|---|
| Remodel / custom home | 1. Progress feed: daily logs + photos, newest first, with comments. 2. Decisions due: selections and change orders with price impact, deadline, Approve/Decline + e-sign. 3. Money: price summary (contract, approved COs, allowances, current price) + invoices/draws to pay. | Buildertrend daily logs/selections/CO/price summary; JobTread sign + selections; Houzz Project Updates "items needing attention (approvals or payments)" |
| Design-build / interior design | 1. Selection boards with approve/decline and order/ship/delivery dates. 2. Weekly project update with action items. 3. Financials + payment receipts. | Houzz Pro dashboard |
| Roofing | 1. Photo timeline (before / during / after, time and GPS stamped) shareable with insurance. 2. Appointments: inspection, adjuster, install date. 3. Documents + invoice/financing. | CompanyCam reviews (30% fewer calls, insurance sharing); AccuLynx summary, appointments, docs |
| HVAC / plumbing / electrical | 1. Who is coming and when: appointment with arrival window, tech name and photo, "on my way" text. 2. Approve estimate (good-better-best options). 3. Pay invoice; memberships with next maintenance visit and equipment history. | Jobber appointments with team photos; HCP On My Way with photo; ServiceTitan memberships, equipment, invoices |
| Cleaning / lawn / pest / pool service (recurring) | 1. Upcoming visits list. 2. Invoices + card on file / autopay. 3. Request or reschedule a visit. | Jobber Wallet/autopay, Requests; HCP Book Online, Send a Message |
| Solar | 1. Milestone tracker (design, permit, install, inspection, PTO) with current step and dates. 2. My to-dos: upload utility bill, approve design, HOA approval, sign docs. 3. Rep messaging; later, energy production. | Sunrun stages and tracker; Tesla next steps; Bodhi alerts |
| Pool construction | 1. Phase tracker (dig, steel, gunite, tile, plaster, startup). 2. Daily photos/logs. 3. Draw payments tied to phases + change orders. | My CPL (progress, photos, balance, CO docs); Cronulla daily logs |
| Moving | 1. Estimate + sign + deposit in one flow. 2. Inventory builder (room by room). 3. Move-day tracking: live crew location, digital bill of lading, sign/tip/pay. | SmartMoving portal; Supermove live link and BOL |

## Cross-tool patterns worth copying
- **Login is a magic link** in Jobber, Housecall Pro, JobTread, Houzz; password only for saved bank
  details or app install. ServiceTitan's password + invitation flow and Buildertrend's login are the
  ones with documented sign-in confusion.
- **Badges and banners for what is owed**: HCP shows unpaid-invoice banner + nav badges on Invoices and
  Estimates; Houzz updates list "items needing attention". The client's first question is "what do I
  need to do?".
- **Status vocabulary is tiny**: Awaiting Response / Approved; Awaiting Payment / Paid / Past Due;
  Pending / Approved / Declined.
- **Every document has a comment thread + upload** (JobTread, Buildertrend, Houzz).
- **Business controls visibility per section** (Buildertrend CO line items, Houzz hide prices, JobTread
  roles). Clients never see internal notes.
- **Most client engagement happens in SMS/email**, which deep-link into one document, not the portal
  home.
