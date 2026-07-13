# Merz Product Expert — Working Demo

A functional, interactive demo of the **Merz Product Expert** — an AI product-knowledge
assistant for aesthetic sales reps. This converts the original static `v5` HTML mockup into
a working single-page app: you can ask questions and get source-grounded answers, file an
adverse-event report, search the approved library, and run the manager & admin flows.

It runs entirely in the browser — **no backend, no build step**. Answers are resolved
against a mock knowledge base; interactions persist in `localStorage`.

> All product content is **fictional demo data** styled to look like approved Merz sources.
> It is not real medical, dosing, or promotional information.

## Design (per the Merz build plan, Part A1 branding)

- **Full-screen app** — no demo chrome or outer frame; the interface fills the viewport.
- **Merz identity, monochrome** — a single neutral scale derived from the black/white Merz
  logo. **Light** = black brand on white; **dark** = white brand on black. Toggle in the
  top bar (persists across reloads). Danger/PV signals stay prominent via inversion.
- **Lucide icons** throughout (inlined from `lucide-static`, so it stays offline-capable).
- **Profile menu** (open from the top-bar avatar or the sidebar role badge) holds both the
  **View as** persona switch (Rep / Manager / Admin) and the **Appearance** light/dark control.
- **Responsive, field-first** — off-canvas sidebar with a hamburger on phones, the chat source
  drawer becomes a full-screen bottom sheet at/below tablet width, tables scroll horizontally,
  and grids collapse to a single column. Usable one-handed on a phone; no horizontal overflow.

## Run it

Open `index.html` in any modern browser (double-click it, or serve the folder):

```bash
# optional local server
python3 -m http.server 8000   # then open http://localhost:8000
```

## What's functional

**Rep · Home**
- Type any question in the ask bar (or press Enter) → routes to a grounded chat answer
- Category chips swap the suggested-question set live
- Clicking a product, a "team asked" item, a brand card, or a saved answer starts the right question
- **Safety action** opens the dedicated pharmacovigilance (PV) flow — required fields, immediate routing, generated reference number
- Dynamic update cards are dismissible; notification bell opens a panel

**Rep · Chat**
- Free-text questions are matched to the knowledge base (keyword + token scoring)
- **HCP conversation / Rep detail** mode toggle swaps the guidance
- **Show sources** opens the approved-sources drawer with permission badges; citation superscripts jump to the cited source
- Save answer (pins to Home), Helpful / Not helpful, Flag, **Ask Medical Affairs**
- Share panel enforces "approved material only"; follow-ups and multi-turn threads work
- Smart safety handling: **adverse-event wording** surfaces a PV banner; **off-label** questions surface an off-label caution; unanswerable questions become a **content gap** you can raise to Medical Affairs

**Rep · Library**
- Search + filter by product / type / HCP-shareable; quick-access chips map to categories
- Browse-by-product, document viewer, bookmark, and "Ask" jump to a grounded answer

**Manager (Team Pulse)**
- Interactive rep table (click a row for detail + reminder), action strips, knowledge signals, content-gap visibility

**Admin**
- **Write answer** resolves a content gap and decrements the live queue count
- Review AI-drafted assessment questions, add / edit users (persisted), compliance-flag detail
- **Roles & permissions** — separated permission sets (content, PV, assessment, users, KB), combinable, never one super-role
- Provisioning captures **email + password** (no self-registration)

**Login / onboarding** — Merz logo (also the browser-tab favicon), admin-provisioned sign-in,
appearance toggle. First sign-in opens a full-size, laptop-friendly 3-step onboarding (replayable
from the profile menu). Sign out from the profile menu.

**Role-based medicine access** — an admin assigns the specific medicines each rep is responsible
for (Add/Edit user → *Assigned products*). The signed-in rep only sees and handles their assigned
medicines across the sidebar, Home, and Library. Editing the signed-in rep updates the Rep view live.

**Off-label handling** — off-label questions are **not** auto-routed to Medical Affairs; the
assistant shows only approved indications and logs the query in the Admin compliance panel where
Medical Affairs has visibility.

**Part B — Assessment & Certification module** (build plan Part B)
- **Rep · Certification** — per-brand certification grid, next-due date, cadence, and full assessment history
- **Rep · Take assessment** — a document-grounded MCQ runner: progress bar, per-question brand/difficulty/topic, auto-scoring against the configurable threshold, per-brand breakdown, weak-area review with source refs, pass → certified, fail → retake (never locked out)
- **Admin · Question manager** — AI drafts reviewed one-by-one (source, correct answer, explanation, difficulty, product, country — no bulk approve), preset/AI pool-mix sliders per product, filters, add/retire questions
- **Admin · Assessment monitor** — who's certified/failed/due, configurable pass threshold, ad-hoc trigger, per-rep drill-down with score trend
- **Admin · Gap analytics** — most-failed questions, weakest topics, trend across cycles
- Two profiles throughout: **multi-brand** (20/15/15 split) and **Ultherapy-only**

**Manager**
- Named **active vs non-active** adoption lists with a **configurable activity window** ("asked ≥1 question in last N days")
- **Configurable table fields** (show/hide columns via config, not code)

## Structure

```
index.html        # full-screen shell + theme boot
css/styles.css    # monochrome light/dark design system
js/icons.js       # inlined Lucide icon subset + icon() helper
js/data.js        # mock knowledge base, documents, reps, admin data
js/app.js         # state, routing, answer engine, views, modals, theme/persona
```

Persisted keys (`localStorage`): `merz_theme`, `merz_authed`, `merz_onboarded`,
`merz_saved`, `merz_dismissed`, `merz_pv`, `merz_gaps`, `merz_users`, `merz_access`,
`merz_assess`, `merz_mgrcols`. Clear them to reset the demo.

## Build-plan coverage

Implemented in this front-end demo: Part A branding (logo + monochrome palette + login),
the "current state" behaviours (four brands, dual reply, citations, follow-ups, team trending,
Team Pulse, content-gap detection, voice, answer guardrail), the admin rebuild (named
active/inactive, configurable fields + activity window, email/password provisioning,
separated permission sets), all Addendum UX items (safety PV flow, share-panel wording,
trust pill, source-drawer permission badges, entitlement filters, two profiles, mobile
bottom-sheet + off-canvas nav), and the full **Part B** assessment & certification module
(data model, question sources with preset/AI review, lifecycle language, scoring/threshold,
and all six screens).

Out of scope for a client-side demo (they are backend / process / deployment work):
A2 accuracy grading pass, A3 real document ingestion (FAQs + MIRT), the branded testing-link
delivery, the onboarding video, and the pentest. These need a running backend, real Merz
content, and infra — not front-end code.
