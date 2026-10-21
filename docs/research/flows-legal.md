# Law firm client portals: what CLIENTS actually see and do

Research date: 2026-10-20. Scope: the client-facing side only. Sources are vendor help-center
articles, App Store listings and vendor pages fetched on that date. Claims without a source link are
marked (unverified).

Coverage status (be honest about gaps):
- Done from primary sources: Clio for Clients, MyCase, PracticePanther, Smokeball Client Portal,
  Case Status (partial), Lawmatics (partial).
- Thin: Filevine, CasePeer (their portal pages 404'd; the web-search budget for this run ran out).
- Not recovered: the immigration (Docketwise, INSZoom, Envoy) and family/estate (OurFamilyWizard,
  WealthCounsel, Lawyers With Purpose, Vanilla) research was done by sub-agents whose reports were
  lost when the app crashed. Those sections below hold only a short, clearly marked placeholder
  from general product knowledge (unverified) and need a re-run.

Note on screenshot URLs: help-center images hosted on downloads.intercomcdn.com carry signed,
expiring query strings (expires=1792541700, roughly 2026-10-20). They may stop loading; the article
page URL next to each one is the stable reference.

---

## 1. Clio for Clients (formerly Clio Connect)

**Practice types:** general small-firm practice management; heavy in family law, criminal, estate,
PI and business. The firm in Clio's own best-practice guide is a divorce firm.

**Client flow, screen by screen**
1. **Invite email.** Firm creates a "client portal" per matter in Clio Manage. Every item shared
   (message, document, bill, calendar event) sends the client an email with a link. Source: Clio for
   Clients Best Practice Guide (PDF, Apr 2025)
   https://www.clio.com/wp-content/uploads/2025/04/Clio-for-Clients-Best-Practice-Guide.pdf
2. **Sign-in.** Web at clients.clio.com or the iOS/Android app. Client confirms email, then logs in;
   the app supports Face ID / Touch ID. App reviewers say the app asks for an email, sends a sign-in
   link, and the link opens Safari which asks for the email again (magic-link loop).
   https://apps.apple.com/us/app/id1506329289
3. **Home / navigation (v2.0.0, Oct 2025 redesign).** New bottom navigation bar; added Tasks and a
   case-stage tracker. Sections: Messages, Documents, Tasks, Case progress, Invoices, Calendar.
4. **Case progress (stages).** Shows the matter's current stage name plus an optional plain-language
   description, with completed and upcoming stages. Firm defines up to 15 stages per practice area
   (kanban "Matter Stages") and toggles client visibility per practice area (Pro/Expand plans).
   Client gets push + email on every stage change. Source: Clio help article
   https://help.clio.com/hc/en-150/articles/15083241879195 (snippet; page 403 to fetch).
5. **Tasks.** "See what your legal team needs from you", mark tasks done, alert on new assignment.
6. **Messages.** Private threads with the legal team; attach files.
7. **Documents.** Shared files and folders; client uploads via built-in multi-page scanner (combines
   pages into one PDF), camera roll or files; notification "when documents are ready for review".
8. **Invoices.** View invoices and payment history; pay by credit, debit, eCheck, Apple Pay, Google
   Pay (Clio Payments).
9. **Calendar.** Shared events (hearings, meetings).

What the firm's welcome letter (in Clio's guide) tells clients: portal is the main way the firm
contacts you; check daily or turn on notifications; send your question list before meetings;
"DON'T treat messaging in the portal like a casual, text-message conversation." The firm also
shares a "Welcome package" folder plus an intake questionnaire with a due date.

**Use most / complaints** (App Store, 4.9 from ~14K ratings,
https://apps.apple.com/us/app/clio-for-clients/id1506329289?see-all=reviews):
- Praise: messaging ("Better Than Email"), instant notifications, documents easy to view, feeling
  organized during family court.
- Complaints: magic-link sign-in loop ("prompts for an email address to receive a sign-in link");
  message screen shakes while typing and timeline scroll jumps; uploaded photos named by "worthless
  photo numbers"; PDFs not appearing a day later. Nobody mentions payments.

**Screenshots**
- App Store listing (screenshots): https://apps.apple.com/us/app/id1506329289
- Product page: https://www.clio.com/clients/ and https://www.clio.com/features/client-mobile-app/
- Best-practice guide PDF (above).

**Notifications / compliance:** email per shared item; push in app; push+email on stage change;
client only sees what is explicitly shared; marketed as secure private messaging (privilege is the
pitch: keep case talk off email/SMS).

---

## 2. MyCase (now "8am MyCase")

**Practice types:** small firms across family law, criminal, PI, estate planning, immigration.

**Client flow**
1. **Invite email** "Welcome to your MyCase account" sent on the firm's behalf, button **Activate
   Now** -> create password -> portal. Client sees nothing about the case until the firm shares an
   item (document, event, invoice, message). Linking client to a case does not auto-share.
   https://supportcenter.mycase.com/en/articles/9369913-what-will-my-client-see-when-i-invite-them-to-the-portal
2. **Dashboard / Home.** Tabs: Home, Inbox (Messages), Documents, Events (Calendar), Billing. Home has
   **What's New** (new events, invoices, documents, messages) and **Recent Activity** (only shared
   items). https://supportcenter.mycase.com/en/articles/9369919-mycase-client-portal-overview
3. **Messages.** Email says "you have a secure message"; the message body is NOT in the email: the
   client must click and log in to read and reply. Client can message one staff member or the whole
   team. https://supportcenter.mycase.com/en/articles/13371385-8am-mycase-client-portal-messages
4. **Documents.** View shared docs, comment, upload ("Add a Document"); firm notified on upload.
5. **Billing / invoice.** Email "invoice ready" -> **View Invoice** -> login -> lands directly on the
   invoice -> pay (card or eCheck) if online payments enabled. Reminders until paid.
   https://supportcenter.mycase.com/en/articles/9369909-what-will-my-client-see-when-i-share-an-invoice-with-them
6. **Funds request (retainer / trust replenishment).** Email "Please deposit funds into your account"
   with **Deposit Funds** button -> card payment page (no login needed for card; eCheck requires
   login). https://supportcenter.mycase.com/en/articles/9369916-requesting-funds-what-will-my-client-see
7. **Intake form.** Emailed link, no login described; client can save and finish later.
   https://supportcenter.mycase.com/en/articles/9369915-what-will-my-client-see-when-i-email-them-an-intake-form
8. **eSignature.** Email -> **View & Sign Document** -> draw or type signature -> all signers get the
   completed PDF by email. https://supportcenter.mycase.com/en/articles/9369917-what-will-my-client-see-when-i-request-an-esignature
9. **Case closed.** Recent Activity "(User) closed case"; email; invoices stay payable; documents
   move to archived but downloadable; messages remain; reopen sends an email.
   https://supportcenter.mycase.com/en/articles/9369906-what-does-an-active-client-see-when-a-case-is-closed

**Use most / complaints:** G2 firm reviewers say clients like logging in to see documents and their
court date; complaints focus on the mobile app being weak for pulling up documents and messages,
and text history detaching when a client changes phone numbers (G2 https://www.g2.com/products/mycase/reviews ,
Capterra https://www.capterra.com/p/115613/MyCase/reviews/).

**Screenshots (signed, expiring)**
- Client portal message view GIF:
  https://downloads.intercomcdn.com/i/o/q07v75s8/1938440403/812cc6e9fbb5437004ea5b6f30e3/client+portal+view.gif
- Invoice view after login and Recent Activity feed: see
  https://supportcenter.mycase.com/en/articles/9369909-what-will-my-client-see-when-i-share-an-invoice-with-them
- Funds request pages (3 states): see the funds article above.
- Learning-center course: https://www.mycase.com/learning-center/how-to-use-client-portal/#/

**Notifications:** email for each shared invoice, document, event, message, funds request, case
closed/reopened; invoice reminders. Compliance visible: message content kept out of email; sharing is
opt-in per item.

---

## 3. PracticePanther

**Practice types:** small firms (general, family, criminal, PI, immigration).

**Client flow** (https://support.practicepanther.com/en/articles/593609-using-the-client-portal-to-communicate-with-your-attorney)
1. **Invite email** to the contact's address; portal and emails white-labeled with firm logo/colors.
2. **Login page** (client bookmarks it).
3. **Home** (click logo): assigned **Tasks**, each with **Mark As Completed** (toggles to Mark
   Incomplete). Messaging from a task pre-fills the subject with the task title.
4. **Messages** (envelope icon): green **New Secure Message** button.
5. **Activities tab**: events assigned to the client.
6. **Invoices tab**: invoices for the client's matters, pay online.
7. **Files tab**: only if the firm syncs Box.com.
8. **Trust / operating balances**: optional, firm must enable; shows a trust account summary.
   https://support.practicepanther.com/en/articles/479978-viewing-your-operating-and-trust-escrow-account-balances
9. **Settings** (name, top right): password, timezone, **two-factor authentication**.

**Screenshots (signed)**
- https://downloads.intercomcdn.com/i/o/32008760/be2cf7134863a8de603037f9/Article+on+Client+Portal+1.png
- https://downloads.intercomcdn.com/i/o/41948161/1192d9488ca429bbd7476f8a/Trust+account+summary.png

**Notes:** the trust balance view is the one real "trust accounting" surface any of these portals
exposes to clients, and it is off by default.

---

## 4. Smokeball Client Portal (formerly "Communicate")

**Practice types:** small firms; strong in real estate/conveyancing, estate, family, PI (US and AU).

**Client flow** (https://support.smokeball.com/hc/en-au/articles/6891779787287)
1. **Email** when the lawyer sends a message or document; **Log in** button. Unique link, no
   username/password; old email -> enter address for a new secure link. MFA if the firm requires it.
2. **Home**: open conversations; firm picker (one client, several firms); **Cases** filter at top.
3. **To do (left rail)**: items the lawyer wants reviewed (new uploads, outstanding intake forms);
   tick to acknowledge -> moves to **Done** tab.
4. **Msgs**: conversation list, reply, paperclip to attach.
5. **Events**: upcoming and past (court appearances).
6. **Docs**: files shared in conversations; preview, comment, print, download; bulk download.
7. **Forms** (under Docs): outstanding and completed intake forms, completed in a right-hand pane.
8. **Billing**: outstanding and paid invoices, preview with **Pay Now**.
Also: firm can SMS clients who do not use the app; files up to 100 MB; shared folders stay in sync.
Overview: https://support.smokeball.com/hc/en-au/articles/5888010424471-Client-Portal-Overview

**Screenshots** (prefix https://support.smokeball.com): /hc/article_attachments/29234093577367
(to-do list GIF), /hc/article_attachments/29610513028247 (billing), /hc/article_attachments/29234114879255
(intake forms), /hc/article_attachments/34718291103895 (to-do list, new view).

---

## 5. Lawmatics (intake and client comms, pre-engagement)

**Practice types:** estate planning, PI, family, immigration, criminal; used for intake/CRM.
**Client-side touchpoints** (https://www.lawmatics.com/): web intake form (custom builder) ->
instant automated text or email -> self-schedule consultation with confirmation and reminders
(Zoom link option) -> branded e-sign engagement agreement -> drip emails / newsletters. A "Client
Portal" page exists in their nav but was not described. Client sees mostly emails, SMS and single
forms, not a portal.
Candidate screens (unlabelled): https://cdn.prod.website-files.com/688005f0c89682201c6776cf/6a3f4ebd1ad153cdebe5cb6a_Landing%20Page%20-%20Mobile%20(1).avif

---

## 6. Case Status (PI-first client app; integrates with Clio, Filevine, CasePeer, etc.)

**Practice types:** personal injury, workers comp, immigration, employment, disability, mass tort,
estate planning, criminal. https://www.casestatus.com/
**Client flow:** firm-branded app (firm logo/name/colors) -> access via text message link, no
password -> case status: where the case stands, what comes next, what the client must do, with a
short video per phase -> secure messages (automatic AI translation) -> scan/upload documents, which
land in the firm's case file -> satisfaction (NPS) question at each stage; 9-10 scorers are prompted
for a Google review and referral.
**Evidence:** vendor claims up to 80% of routine client communication automated; Pond Lehocky about
15,000 active clients in the app. Security badges: HIPAA, SOC, GDPR.
**Screenshots:** https://cdn.prod.website-files.com/65f0b710052a39d20f058f70/68c9a6d89fe21413460a3bdf_video-messages.png ,
https://cdn.prod.website-files.com/65f0b710052a39d20f058f70/6a60cafe670de08780dfa76f_Frame%2013808.png

## 7. Filevine and CasePeer (thin)

Portal pages at filevine.com and casepeer.com returned 404 on this run and the search budget was
spent, so no verified screen-by-screen detail. Both are PI case-management systems whose client
updates commonly run through Case Status or SMS integrations (casestatus.com lists them as
integrations). Re-run needed.

## 8. Immigration (Docketwise, INSZoom, Envoy) - NOT RECOVERED, re-run needed

Unverified placeholder from general knowledge: clients fill a long online questionnaire (personal
info, 5-year address and employment history, travel, family) that maps to USCIS forms, often with
language options; upload against a per-item document checklist; view case status with USCIS receipt
numbers. Envoy serves employer-sponsored cases with separate employee and HR views.

## 9. Family law and estate planning - NOT RECOVERED, re-run needed

Unverified placeholder: OurFamilyWizard is a co-parent tool (shared calendar, messages with ToneMeter,
expense log, info bank) where attorneys get professional read access; it is not a law-firm client
portal but its records are used as court evidence. Estate tools (WealthCounsel, Lawyers With
Purpose, Vanilla) center on a long client questionnaire (family, assets, fiduciaries) and, for
Vanilla, visual estate diagrams.

---

## Synthesis: core views per practice type

Across all four practice-management portals the same five screens recur: **Messages, Documents
(with client upload), Invoices/Pay, Calendar/Events, Tasks/To-do**. New since 2024-25: **stage
tracker** (Clio Oct 2025, Case Status) and **to-do lists** (Smokeball, Clio, PracticePanther).

| Practice | Core view 1 | Core view 2 | Core view 3 | Evidence |
|---|---|---|---|---|
| Personal injury | Phase timeline with plain-language "what happens next" (video per phase) | Secure messages (translated) | Document/photo upload (bills, injuries) | Case Status; Clio stages |
| Family law | Secure messages with rules of use | Document folder / welcome package with due dates | Calendar of hearings + invoices/retainer top-up | Clio guide (divorce firm); MyCase funds request |
| Estate planning | Questionnaire (save and resume) | E-sign | Documents + invoice | MyCase intake/eSign; Lawmatics (verified); estate tools (unverified) |
| Immigration | Questionnaire | Document checklist with upload | Case status with receipt numbers | unverified, re-run |
| Business law | Invoices + trust balance | Documents/e-sign | Messages | PracticePanther trust view; MyCase billing |

Design implications for the portal:
- Email notifications must not contain the message body; they say "you have a secure message" and
  deep-link to the item after login (MyCase, Clio).
- Payment links work without full login (MyCase card payments, funds requests); everything else needs
  login.
- Nothing is visible until the firm shares it; per-item sharing is the default model.
- Use passwordless links, but avoid the Clio loop where the link opens a different context and asks
  for the email again.
- Name uploaded files sensibly (Clio complaint about photo numbers) and confirm uploads appear.
