# Client-side flows: coaching, fitness, tutoring, admissions, pet training, managed IT, translation

Research date: 2026-10-20. Scope: what the CLIENT of a small business sees and does in the tools that business uses.

How to read this file:
- **[V]** = verified this pass from a vendor help article, vendor page or review page (URL given).
- **[K]** = from general product knowledge, not re-verified this pass (search budget ran out). Treat as likely, confirm before building against it.
- Several help centers blocked fetching (Practice Better 403, Paperbell blocked, Gingr help 403, Atera 403). Where that happened the detail comes from search-result excerpts of those same pages.
- Screenshot links on `downloads.intercomcdn.com` are signed and expire; the help-article page URL next to them is the stable reference.

---

## 1. Coaching

### 1.1 Practice Better (nutritionists, dietitians, functional medicine, wellness and health coaches, some therapists)

**Flow**
1. **Invite email** -> client sets password, lands in the portal (web) or the "Practice Better" client app. [V: help center "For Clients" category https://help.practicebetter.io/hc/en-us/categories/7712039360155-For-Clients]
2. **Dashboard (home)**: upcoming appointments, pending forms, shared resources, quick actions (book, message). Vendor wording: "upcoming appointments, pending forms, shared resources, and quick actions." [V]
3. **Intake forms / documents**: forms assigned before the first session; client fills and signs. [V demo page]
4. **Sessions / Book**: client requests a session; it shows as **pending until the practitioner confirms**. Add-on services, follow-up scheduling. [V https://practicebetter.io/demo/client-portal-software]
5. **Journal**: food and mood journal (photo of meal, time, symptoms, mood), lifestyle journal (sleep, water, exercise, supplements), wearable-linked data (Oura, Apple Health, Garmin, Fitbit). Practitioner comments on entries without a session. [V help center category + https://dupple.com/reviews/practice-better]
6. **Programs**: assigned multi-week programs with modules (content, videos, handouts), released on a schedule; Professional plan and up. [V pricing FAQ; module layout K]
7. **Messages**: encrypted, HIPAA chat with the practitioner. [V]
8. **Billing**: invoices, packages, saved card. [K]

**Used most / complaints**: food journal + messaging + booking are the daily loop. Capterra reviews (https://capterra.com/p/159263/Better/reviews/?page=2) mention clients needing help navigating the portal; app is less smooth than web. [V partial]

**Screenshots**: client portal demo https://practicebetter.io/demo/client-portal-software ; branding demo thumbnail https://cdn.prod.website-files.com/6718175ada2bc9a32b0d59ca/6a4c15f19c257a133394d786_DemoCenter-Thumbnail-BrandIdentity-Jun26.png ; client help category (article screenshots) https://help.practicebetter.io/hc/en-us/categories/7712039360155-For-Clients

**Notifications** [V General FAQ https://help.practicebetter.io/hc/en-us/articles/115000474127-General-FAQ]: appointment reminders, shared notes, journal comments, new forms, invoices, chat messages.

### 1.2 Paperbell (solo life, career, business, health coaches)

**Flow** [V via search excerpts of https://paperbell.com/support/knowledge-base/the-clients-guide-to-paperbell and https://paperbell.com/support/knowledge-base/paperbell-client-experience/]
1. **Checkout page** for a package (one link: pay, sign contract, book first session).
2. **Client portal at PaperbellClient.com**: auto-access after any purchase.
3. **Appointments**: upcoming and past; "schedule any unused sessions from the package".
4. **Packages**: each package with **sessions used vs remaining**; vendor: both coach and client "can see how many sessions you have left and when it's time to purchase more."
5. **Content**: files, surveys, contracts shared by the coach; client can upload content back.
6. **Surveys**: forms to fill.
- Coach notes are never visible to the client.
- March 2026 redesign of the client portal with a better appointments view (https://paperbell.com/support/knowledge-base/a-fresh-new-look-for-your-clients-product-update-march-2026-2).

**Used most**: "book next session" and "how many sessions left". Quenza review (https://quenza.com/blog/paperbell-review/) frames it as admin-only: no homework, journaling or progress tracking.

**Screenshots**: client experience article https://paperbell.com/support/knowledge-base/paperbell-client-experience/ ; client guide https://paperbell.com/support/knowledge-base/the-clients-guide-to-paperbell

**Notifications** [K]: purchase receipt, booking confirmation, reminders before sessions, new content shared.

### 1.3 Satori (life, business, executive coaches)

**Flow** [V https://www.learningrevolution.net/satori-review/]
1. **Discovery booking link**: intake questions, pick time, confirmation.
2. **Enrollment link**: review package -> sign agreement -> schedule first session -> pay (installments or subscription).
3. **Client portal**: schedule, agreements, billing history, shared resources, session notes; reschedule; download files; see next appointment.
4. **Pre-session check-in**: agenda or reflection prompt sent before each session; coach reads it first.

**Complaints** [V same review]: intake forms all release at once when several sessions are booked; Zoom links missing from confirmations without Zapier; portal "sparse": "no progress dashboard, goal visualization, comment threads, or momentum beyond the next session"; branding only on Pro; one-way calendar sync. Clients "consistently find it easy to navigate."

**Screenshots**: live coach portals https://coachshad.satoriapp.com , https://chelseahester.satoriapp.com (public booking pages).

**Notifications**: booking confirmation, reminders, pre-session check-in prompt. [V]

### 1.4 Kajabi Coaching (course creators who add 1:1 or group coaching)

**Flow** [V https://help.kajabi.com/articles/products/coaching/how-to-create-a-coaching-product]
1. Buy Offer -> redirected to **Library**.
2. **Coaching program page**: list of sessions (upcoming / completed), each with Schedule button (Kajabi Scheduler, Calendly, custom link or manual booking, up to 6 months ahead).
3. **Session page**: date, Join Session button (Kajabi live video or Zoom/Meet), **agenda items**, resources, **client's personal notes**, Add to Calendar, session recording if the coach uploads it.
4. After a completed session (or all sessions): optional **buy-more button** (upsell).

**Screenshots**: "Example Session" and "Add to calendar" images on https://help.kajabi.com/articles/products/coaching/how-to-create-a-coaching-product

**Notifications**: confirmation emails with ICS + calendar link; emails when sessions change (coach controls timing). [V]

---

## 2. Fitness / online personal training

### 2.1 Trainerize (ABC Trainerize) (online PTs, gyms, studios, nutrition coaches)

**Flow**
1. Invite only: "Access requires an invitation from a trainer, coach, gym, or studio." [V App Store https://apps.apple.com/app/id516851502]
2. **Main dashboard** (first screen): today's schedule; calendar tab with labelled daily items; by default clients preview **one week ahead** (coach can change). [V https://www.trainerize.com/blog/trainerize-product-update-new-modern-app-experience/ and Trainerize blog]
3. **Calendar**: workouts, cardio, habits, check-in forms, body-stat and photo reminders per day. [V partly; K for item types]
4. **Workout player**: exercise video, sets/reps/weight entry, rest timer, finish -> summary / PRs. [V App Store review mentions rest timer, form videos]
5. **Nutrition**: built-in food tracker, meal plans, recipes, MyFitnessPal sync. [V]
6. **Habits**: daily habit checkboxes, streaks, badges. [V]
7. **Progress**: body stats, progress photos (side-by-side compare), graphs; wearable sync (Apple Health/Watch, Fitbit, Garmin, Withings). [V]
8. **Messages**: 1:1 chat with coach, groups and challenges. [V]

**Complaints**: "It crashes daily" (2022 App Store review); "this app responds sluggishly", taps double-register on rest timer (2025). MyFitnessPal sync "constantly a pain"; older clients find it confusing; dated workout look (Capterra https://capterra.com/p/140262/Trainerize/reviews/). Liked: progress photos, "I can take my pictures and look back for myself". [V]

**Screenshots**: App Store listing https://apps.apple.com/app/id516851502 (screenshot carousel) ; product update post https://www.trainerize.com/blog/trainerize-product-update-new-modern-app-experience/

**Notifications** [V App Store]: push for scheduled workouts, check-ins, activities; workout-day reminders; coach messages.

### 2.2 TrueCoach (strength coaches, online PTs)

**Flow** [V https://help.truecoach.co/en/articles/2403707-the-truecoach-client-experience]
1. **Invite email** -> set password; web app.truecoach.co or iOS/Android app.
2. **Workouts (today)**: workout at top; Warm Up (swipeable demo videos), exercises A, B, C..., Cool Down; collapsible instructions.
3. **Log results**: "Update results for A" per exercise; free-text results, upload photo/video of a set.
4. **Exercise History** per movement (past logged results).
5. **Past tab**: what the workout was on a given date.
6. **Profile**: metrics, progress photos, Library files.
7. **Messages**: real-time chat, gifs.
8. **Empty state** when nothing is assigned.

**Complaints** [V Capterra https://capterra.com/p/155784/truecoach/reviews/ ; GetApp]: slow loads/freezing, lost unsaved work, video upload problems; all-exercises-scroll layout disliked vs swipe supersets; **missed workout shown as a large red X is discouraging**.

**Screenshots** (from the help article, signed): daily email https://downloads.intercomcdn.com/i/o/557324716/599675ea380ca45311218caa/Untitled_Artwork.png ; Update results https://downloads.intercomcdn.com/i/o/557326525/c156a8c8828394d8d503d7ad/Untitled_Artwork+2.png ; Exercise History https://downloads.intercomcdn.com/i/o/557325967/7022c4334bfc1c5553e193ab/Untitled_Artwork+2.png

**Notifications**: **daily workout email**, **missed-workout email** (with "Open in TrueCoach"), toggleable by coach and client; push for messages. [V]

### 2.3 Everfit (online coaches, gyms, hybrid trainers)

**Flow** [V https://help.everfit.io/en/articles/5635436-walkthrough-today-screen , https://help.everfit.io/en/articles/5555389-onboarding-walkthrough-for-client]
1. Invite -> onboarding walkthrough.
2. Tabs: **Today, Coaching, Inbox, You**.
3. **Today** (adaptive to what the coach assigned): Today's workout or rest-day message + Start workout; Tasks (tap for instructions, personal reminder clock); Steps (Apple Health / Google Fit); Food Journal (meal photo timeline, coach feedback per meal); Community Forums; bell with unread count.
4. **Workout player**: check off sets, auto rest timer, add/remove sets, comments, save -> workout result screen. [V https://help.everfit.io/en/articles/5829094-client-app-track-a-workout]
5. **Coaching**: weekly view of workouts and tasks, programs, resources.
6. **Inbox**: chat with coach (text, video); some programs have no DMs.
7. **You**: goals, metrics (body weight, measurements), progress, steps daily/weekly/monthly.

**Screenshots**: Today overview https://downloads.intercomcdn.com/i/o/390009798/85c51ab043e5f4e3aaa86e75/Screen+Shot+2021-09-15+at+11.53.36+AM.png ; checking off sets https://downloads.intercomcdn.com/i/o/386522553/f70c6fe8247ed0603afbbf40/image.png ; food journal https://downloads.intercomcdn.com/i/o/386515565/76f702da7a8ecef9f1b990c3/image.png ; workout result https://downloads.intercomcdn.com/i/o/401178805/83cc3d7011659f7452d5a936/image.png

**Notifications**: in-app bell + push for assigned items, coach comments on meals/workouts, task reminders set by client. [V]

---

## 3. Tutoring / test prep

### 3.1 TutorBird (private tutors, music teachers, small tutoring centers)

**Flow** [V https://tutorbird.com/?p=5213 and search excerpts of TutorBird getting-started guide]
1. Student or parent login (separate parent logins).
2. **Calendar**: lessons for the next month; click an event for detail; **parent can cancel a lesson** from it; self-schedule into tutor availability; make-up lessons created from cancellations (make-up credits by policy).
3. **Lesson notes**: tutor writes student notes and separate **parent notes**.
4. **Homework**: student uploads completed work; **study log** (time spent); tutor reviews and gives feedback.
5. **Account & Invoices** (parent login): balance, invoices, pay online (Stripe/PayPal).
6. **Tutor reviews**: parents/students leave feedback.

**Screenshots**: https://www.tutorbird.com/wp-content/uploads/2026/05/student-portal-header-v2@2x.png ; https://www.tutorbird.com/wp-content/uploads/2026/05/homework-submission_1@2x.png ; https://www.tutorbird.com/wp-content/uploads/2026/05/tutor-reviews@2x.png

**Notifications** [K]: lesson reminders (email/SMS), invoice emails, cancellation confirmations.

### 3.2 Teachworks (tutoring companies, test prep centers, music schools)

**Flow** [V via search excerpts of https://blog.teachworks.com/2022/05/save-time-and-impress-your-clients-with-user-accounts/ and https://blog.teachworks.com/2024/12/teachworks-tutoring-management-software-the-customer-journey-explained/]
- Account types: **Family** (parent sees lessons and billing for each child), **child student** (lessons only), **independent student** (own billing).
- **Calendar / Lessons**: upcoming lessons; optional add-ons: request lessons, self-cancel, join online lesson from calendar.
- **Lesson notes / reports** shared by tutor. [K]
- **Account page**: current balance at top; Transactions (invoices, credit notes, payments); **Packages** with balance remaining; pay online via Stripe.
- Admin can hide teacher contact info, profile editing, payment instructions.
- Feature requests: parents cannot see tutor photos/bios; no iCal feed for students (https://teachworks.featureupvote.com/).

**Screenshots**: client accounts blog https://blog.teachworks.com/2022/05/save-time-and-impress-your-clients-with-user-accounts/ ; test prep page https://teachworks.com/test-preparation-school-management

**Notifications** [K]: lesson reminders, invoice emails, lesson note emails.

### 3.3 Wise (tutoring/coaching institutes, many in India; parent app)
[V listings only: https://www.getapp.com/education-childcare-software/a/wise-2 , https://www.capterra.ca/software/1033151/wise] Parent/overseer account; schedule, attendance, session reminders, post-session feedback, fee collection and invoices, student reports for parents, assessments with instructor feedback, drip courses. Screen-level detail not verified.

---

## 4. College admissions consulting

### 4.1 Cialfo (high school counseling offices; some independent counselors)

**Flow** [V https://help.cialfo.co/en/articles/8119376-the-student-window-explained , https://help.cialfo.co/en/articles/8115122-to-dos-explained]
1. **Home**: profile-strength bar + Complete Profile; counts of universities in **Applying / Shortlist / Longlist / Applied**; chat with counselor; recommendations, events, articles; "My University Quest" readiness quiz.
2. **To-dos**: Tasks assigned by counselor (e.g. top-5 list, personal statement) with due dates; Assessments; **Meetings** (book a counselor slot; pending/upcoming list); Surveys.
3. **Universities**: search (plain-language "Super Search"), add to list; Connect for events, deadlines, essay prompts.
4. **Bookmarks**: Longlist / Shortlist / Applying.
5. **Applications**: In progress vs Submitted; filters for deadline, submission status, pending action, missing info; each card: major, round (ED/EA/RD), **deadline**, portal, tests sent, scholarship, **result**, notes (student-visible).
6. **Documents (cDocs)**: checklist with check marks; transcripts/LORs sent via Common App, Parchment etc.; Request LOR.
- Parents can access the student's profile and application dashboard.

**Screenshots** (signed): Applications card https://downloads.intercomcdn.com/i/o/giyujuw5/2523624138/ece8736324846c05a0479bcf1db1/Screenshot+2026-07-06+at+7_04_08%E2%80%AFPM.png ; Home https://downloads.intercomcdn.com/i/o/giyujuw5/2523545533/46b3e590a360194dcc8378a426c2/Screenshot+2026-07-06+at+6_26_04%E2%80%AFPM.png ; Tasks https://downloads.intercomcdn.com/i/o/giyujuw5/2523534343/ae7b5fe56e73b6537c5aac4db8cd/Screenshot%2B2026-07-06%2Bat%2B6_17_12-E2-80-AFPM.png

### 4.2 CollegePlannerPro and CounselMore (independent educational consultants, IECs)
- CollegePlannerPro student side ("CustomCollegePlan"): college tab with target deadlines, calendar, **Application Outline** tab listing all deadlines and requirements per college (Peterson's data), per-college **ESSAYS** screen with prompts, student-specific tasks. [V via search excerpts of https://support.collegeplannerpro.com/hc/en-us/articles/229667528]
- Per CounselMore's comparison, CollegePlannerPro has **no parent portal** and a separate student interface. [V, competitor source: https://www.counselmore.com/counselmore-vs-collegeplannerpro-which-college-planning-software-should-i-use-to-start-my-college-planning-practice]
- CounselMore: Student and **Parent Portal**, tasks emailed to student and parent, application tracker with automated deadline reminders, essay prompts, essays exported to counselor's Google Drive folder, messaging/texts. Screenshots: https://irp.cdn-website.com/6b10f110/dms3rep/multi/opt/Portals-1920w.png ; https://irp.cdn-website.com/6b10f110/dms3rep/multi/Screen+coll+list.mov-low.gif
- AdmitPlatform listing: portal shows college lists, deadlines, assignments, files, academic records, essays, application materials, two-way messaging. [V https://www.getapp.ca/software/2085398/admitplatform]

### 4.3 CollegeVine (consumer platform, not a consultant tool)
Reviews: deadline data errors (an ED II round listed that Dartmouth does not have) and **data deleted when sharing between student and parent accounts** (https://www.findmyorbit.com/blog/collegevine-sage-review-2026). Lesson: parent/student shared access is a known failure point.

**Notifications (admissions overall)**: task due reminders, deadline reminders (CounselMore automated), meeting confirmations. [V partial]

---

## 5. Pet care and dog training

### 5.1 Gingr (daycare, boarding, grooming, training facilities)

**Flow** [V https://www.gingrapp.com/blog/webinar-recap-highlights-from-mastering-the-customer-portal-gingr ; search excerpts of https://support.gingrapp.com/hc/en-us/articles/28303758802189-Customer-Portal-Feature-Overview]
1. Download "Gingr for Pet Parents", enter facility **invite code** (or web portal).
2. **First login gate**: complete required owner and pet details; sign waivers.
3. **Dashboard**: personalized alerts (**missing vaccine records, unpaid deposits**), upcoming reservations, pets with missing-info actions, Book button.
4. **Book**: location -> reservation type -> dates/time -> add-ons (e.g. fetch session) -> custom questions -> see discounts/deposit/fees -> submit. Lands as **Requested** until staff approve. Recurring bookings, promo codes. Cannot change dates after submitting.
5. **View**: report cards with photos/videos from staff; live webcams if enabled.
6. **Account**: upload vet/vaccine records, waivers and agreements, invoices and estimates, pay balance.
7. **Shop**: packages, retail, store credit, subscriptions, reward points.

**Complaints**: a 2025 business reviewer: clients find the portal "clunky and unintuitive"; parents often ask staff for help (Capterra https://www.capterra.com/p/136469/Gingr/reviews). Report cards are the delight feature.

**Screenshots**: https://www.gingrapp.com/hs-fs/hubfs/portal2.png (mobile portal) ; https://www.gingrapp.com/hs-fs/hubfs/gingrlogin.png

**Notifications**: booking confirmations by email/SMS, report card ready, missing vaccine alerts, reminders. [V]

### 5.2 PetExec (small daycare, boarding, grooming, training)
[V Capterra listings https://www.capterra.com/p/92864/PetExec/reviews/3852955/] Owner login + mobile app: request/schedule appointments real time, pet records, purchase history; automated email/SMS for appointment reminders, **package use** and **vaccinations due**. Class booking through portal not confirmed.

### 5.3 Revelation Pets (boarding, daycare, appointments, group training)
[V https://support.revelationpets.com/hc/en-us/articles/360056545792-Setting-Up-and-Using-the-Group-Training-Module] Group training classes have fixed dates set by the business (no date pick when booking). Owners: view availability, pet profiles, request appointments, invoices. Client class-enrollment screens not confirmed.

### 5.4 Dog-training homework apps (verified what exists; "DogFlow" not found)
- **Dog Homeskool** (iOS): lesson plan builder, live repetition tracker, clients upload photos, video, audio, notes between sessions. https://apps.apple.com/app/id6630376061
- **E-Collar Training Hub** (iOS): homework builder + client web portal with progress, session history, reports, homework. https://apps.apple.com/app/id6759734810
- **Digital Dogsitter**: shared training diary; trainer comments on client sessions, assigns homework. https://www.digitaldogsitter.com/for-trainers
- **SchedulingKit dog trainer portal**: book sessions, training plan, homework with videos and step-by-step instructions, progress. https://schedulingkit.com/customer-portal/dog-trainers
- **Dogeared Coach**: video programs assigned to clients, no client account needed. https://www.capterra.co.za/software/1111127/Dogeared-Coach
Pattern: small trainers glue Gingr/PetExec (booking, vaccines, packages) to a separate homework tool (videos + rep log). Nobody does both well.

---

## 6. Managed IT (MSPs)

### 6.1 ConnectWise PSA customer portal
[V MSP end-user guide PDF https://www.mainstream-tech.com/wp-content/uploads/2017/06/HowTo_Use_the_Customer_Portal_MTI.pdf]
1. Login (email + password) -> Home.
2. **Create Ticket**: Service Needed (carousel of request types), Due Date, Emergency checkbox, PO Number, Title, Problem Description, attachment -> confirmation with ticket number. Contact info auto-filled.
3. **Tickets tab**: all company tickets (security level dependent), Summary vs List view, sort/search.
4. **Projects tab**: project -> work plan -> project tickets.
5. **Recommendations tab**: quotes/opportunities for client review.
6. **Configurations**: company devices.
7. **Reports**: service request trends, executive report.
8. **Account**: agreements, invoices (view and pay), contacts, add users.
Complaint: portal "communicates ticket processing and assignment poorly", so customers avoid it (https://codeweavers.com/compatibility/crossover/forum/connectwise-psa?msg=194049). Many MSPs replace it with CloudRadial or DeskDirector (https://www.cloudradial.com/connectwise-integration).

### 6.2 HaloPSA self-service portal
[V https://halopsa.com/guides/article/?kbid=1070 and search excerpts] Areas: log ticket, view my tickets, request services (catalog), **approve/reject** requests and **quotations**, service status, dashboards, assets, contracts, invoices, knowledge base with article feedback. Can allow anonymous ticket logging.

### 6.3 Atera customer portal
[V search excerpts of https://support.atera.com/hc/en-us/articles/8426004684444-Service-Portal-overview and Portal FAQ https://support.atera.com/hc/en-us/articles/23345386364188-Portal-FAQ] Link from IT provider -> login (SSO supported) -> **My tickets** (main contacts see all company tickets) -> **New ticket** (description, category/priority, attachments) -> **Ticket detail** (status, assigned technician, replies) -> knowledge base -> request remote assistance. Email notifications on updates, reply by email or portal.

### 6.4 SuperOps
[V https://superops.com/features , factsheet https://resources.elovade.com/hubfs/files/superops/superops-factsheet.pdf] Ticket via email, self-service portal with process-specific forms, system tray icon; KB; **CSAT survey after every closed ticket**. Portal screens not verified.

### 6.5 Onboarding checklists (client side)
No PSA ships a strong client-facing onboarding checklist. MSP guides: 40 to 80 hours per onboarding, 200+ internal line items (ScalePad https://www.scalepad.com/?p=2165); client-side items are: company details and contacts, user list, SLA/MSA sign-off, access procedures, welcome kit via portal (JumpCloud https://jumpcloud.com/resources/the-client-onboarding-guide-for-msps).

**Big finding**: clients mostly do not use MSP portals; they email or call. "Portals require a separate URL and login, so people default to whatever is quicker" (https://blog.cloudradial.com/why-your-clients-arent-using-your-portal-and-what-to-do-about-it).

**Notifications**: ticket created (with number), technician reply, status change, resolved + CSAT survey; invoice emails.

---

## 7. Translation agencies (LSPs)

### 7.1 XTRF Client Portal 2.0 (mid-size LSPs)
[V https://help.xtm.ai/xtrf/client-portal-2-0/?lang=en and sub-pages]
1. Login / password reset.
2. **Dashboard** cards: Recent quotes (5), Recent projects (5), Quote statistics (how many **await your approval**), Project statistics (current/past), Payment statistics (**unpaid / overdue invoices**), KB link, LSP custom message area.
3. **Request quote** wizard: (a) Basic: name, service, source and target languages, specialization; (b) Details & files: contact persons, price profile, reference/PO number, **deadline**, notes (20k chars), source files (up to 1 GB), reference files, or links; (c) Summary with edit cards -> Send request. Same wizard for **Request project**.
4. **Quotes**: list with status, dates, total cost; "Requires approval" pinned on top; **Approve / Reject**; offer expiration date; quote files.
5. **Projects**: list (status, dates, total cost, filters by status/start/deadline); "To review" pinned on top. Project page: status, start, **deadline**, languages, PM, total cost; Tasks per language pair (Open / Closed / To review); Project files tabs Source / Reference / **Deliverables**; **Download all deliverables as .zip**; Leave feedback when closed; reuse details for a new request.
6. **Invoices**, **Settings**.
Screenshots: Dashboard https://help.xtm.ai/xtrf/client-portal-2-0/en/dashboard-module.html ; Projects https://help.xtm.ai/xtrf/client-portal-2-0/en/projects-module.html ; Request quote https://help.xtm.ai/xtrf/client-portal-2-0/en/request-a-quote.html

### 7.2 Smartcat branded Client Portal (small LSPs and freelancers)
[V https://help.smartcat.com/using-the-client-portal/]
1. Branded landing -> Log in / Create an account.
2. **Add Files** (drag/drop, Google Docs).
3. Choose **target languages**, then **services** (prices from LSP rates, per-client custom rates).
4. **Get a Quote**: project name, translation memory (or skip) -> **instant cost estimate**.
5. **Orders tab**: PM accepts or edits estimate; if "Cost approval required", client approves; status -> In progress.
6. **Progress** view while in progress.
7. **Download** source, target and multilingual CSV, even before completion.
8. **Payments tab**: Pay Now (card/PayPal) or download invoice; status Paid.
Screenshots: https://gqucouwbfxremfdhdosu.supabase.co/storage/v1/object/public/sc-store/1703172884158mceclip11__1_.png (cost estimate) ; https://gqucouwbfxremfdhdosu.supabase.co/storage/v1/object/public/sc-store/1703172982776mceclip15__1_.png (progress) ; https://gqucouwbfxremfdhdosu.supabase.co/storage/v1/object/public/sc-store/1703173022309mceclip2__5_.png (payments)
Client notifications not documented in that article.

### 7.3 Plunet (mid/large LSPs)
[V https://www.plunet.com/en/translation-management-software/] Customer Portal: submit project requests, upload source files, enter requirements; quotes and orders created by LSP staff; customer can view their jobs (testimonial: no need to keep their own record of translations sent). Graphic: https://www.plunet.com/en/wp-content/uploads/sites/3/2019/03/Graphic-Workflow-step1.svg. [K] Customers typically see quote/order lists, accept quotes, download deliverables, and view invoices.

**Notifications (translation overall)** [K]: request received, quote ready for approval, project started, delivery ready (download link), invoice issued/overdue.

---

## 8. Synthesis: core views per business type

| Business type | Core view 1 | Core view 2 | Core view 3 | Evidence |
|---|---|---|---|---|
| 1:1 coach (life/business) | **Sessions used vs remaining + Book next** | Next session card with pre-session check-in/agenda | Shared files/notes from past sessions | Paperbell package counter; Satori check-in; Kajabi agenda+notes; Satori "no momentum beyond the next session" complaint |
| Health / nutrition coach | **Daily journal (food, mood, habits) with coach comments** | Program modules released over time | Book + message | Practice Better journal + notifications on journal comments; Everfit food journal |
| Online personal trainer | **Today: workout with set logging + rest timer** | Weekly check-in (weight, photos, form questions) | Progress: photo compare + charts, exercise history | Everfit Today; TrueCoach Update results + Exercise History; Trainerize photos praised |
| Tutoring / test prep (parent) | **Upcoming lessons calendar with cancel/reschedule + make-up credits** | Lesson notes for parent + homework status | Balance, package hours left, pay invoice | TutorBird parent notes, Account & Invoices; Teachworks Packages balance |
| Admissions consultant | **Application tracker: school, round, deadline, status, result** | Tasks / essay drafts with due dates | Meetings + parent visibility | Cialfo Applications card + To-dos; CollegePlannerPro Application Outline + ESSAYS; CounselMore parent portal |
| Pet daycare / trainer | **Book + see requested/approved reservations** | Requirements: vaccines, waivers, missing info | Report card photos / training homework video + rep log | Gingr dashboard alerts + report cards; Dog Homeskool, E-Collar Training Hub homework |
| Managed IT | **My tickets: status + who is working it** | New ticket in under a minute (or by email) | Invoices/agreements, approvals of quotes | ConnectWise portal fields; Atera ticket detail; CloudRadial adoption post |
| Translation agency | **Order status with deadline + download deliverables** | Request quote (files, languages, deadline) -> approve price | Unpaid/overdue invoices | XTRF dashboard cards and project page; Smartcat instant estimate and Payments tab |

## 9. Gaps to close in a follow-up pass
- Practice Better, Paperbell, Gingr and Atera help pages could not be fetched directly (403/blocked); screen details came from search excerpts.
- Trainerize official help (exact tab names) and client-facing check-in form screens not verified.
- Wise, PetExec, Revelation Pets, SuperOps, Plunet client screens are listing-level only.
- No App Store review mining for Gingr for Pet Parents, Practice Better, Everfit, TrueCoach client apps (search budget exhausted).
