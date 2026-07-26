# Parity Checklist

Tracks every feature ID in `allysai-feature-catalog.md` against the build.
Legend: `[ ]` missing · `[~]` partial · `[x]` done. "UI" = present as UI only;
"svc" = enforced/backed by the service layer. Build mode: **client-only
simulation** (service layer plays the server).

_Last updated: Area 5 — Ask UI polish (memory, feedback, comparison)._

**Area 1 landed:** `js/services.js` (the single enforcement point + Part E store),
`js/components.js` (reusable filtered-list, Part D4), retrieval now scoped by the
service so a revoked/inactive product returns an authorization boundary — not a
content gap or a fabricated answer. Tests in `tests/` (20 assertions, run with
`node tests/run.js` or open `tests/index.html`).

## AUTH
- [~] AUTH-1 Sign-in (email+password)  — fake localStorage flag today
- [ ] AUTH-2 Hybrid provisioning (invite + pending queue)
- [x] AUTH-3 Onboarding, replayable
- [x] AUTH-4 Sign out
- [x] AUTH-5 Simulated session identity in service (svc)

## NAV
- [~] NAV-1 Top bar (needs tier label)
- [~] NAV-2 FOR ME / ADMIN nav groups
- [~] NAV-3 Admin-only rendering (not a real boundary)
- [x] NAV-4 Grant-filtered sidebar/home/library (now via service · svc)
- [x] NAV-5 Active pill + accent
- [ ] NAV-6 cid routes / /admin/* routes

## HOME
- [~] HOME-1 Greeting card (needs corpus summary)
- [ ] HOME-2 Stat cards
- [x] HOME-3 Ask bar + voice
- [~] HOME-4 Suggested chips (static, not top-team)
- [x] HOME-5 Brand list (grant-filtered UI)

## ASK
- [x] ASK-1 Corpus-only via vector retrieval (svc-scoped); unanswerable→gap
- [x] ASK-2 Retrieval trace chip (Researched N sources · Xs)
- [x] ASK-3 Confidence badge (High/Med/Low) + named provenance
- [x] ASK-4 HCP-ready card
- [x] ASK-5 HCP/Rep toggle
- [x] ASK-6 Supporting points + citations
- [x] ASK-7 Section-level heading-path citations (footnotes + drawer)
- [x] ASK-8 Disclaimer
- [x] ASK-9 Show sources drawer
- [x] ASK-10 Share copy/WhatsApp/email
- [x] ASK-11 Feedback logged (recordFeedback)
- [x] ASK-12 Memory pill (per-thread context counter)
- [x] ASK-13 Follow-up / new question
- [x] ASK-14 No-source content-gap state
- [x] ASK-15 Comparison template (columnar per-brand, grant-scoped)
- [x] ASK-16 Staged render: trace+confidence → composing → body
- [x] ASK-17 Q/A logged (MerzService.logAnswer)

## BRAND
- [ ] BRAND-1 Hero
- [ ] BRAND-2 Key differentiators
- [ ] BRAND-3 Common team questions
- [ ] BRAND-4 KB count + type chips

## HIST / LIB
- [ ] HIST-1 Chat history (persisted threads)
- [x] LIB-1 Library search + filters
- [x] LIB-2 Quick-access chips
- [x] LIB-3 Doc viewer / bookmark / ask

## ATAKE / CERT
- [~] ATAKE-1 Intro/pre-flight (no official/practice choice)
- [x] ATAKE-2 One-per-screen single-choice
- [ ] ATAKE-3 Per-question confidence
- [ ] ATAKE-4 Autosave/resume
- [x] ATAKE-5 Results score vs threshold
- [x] ATAKE-6 Per-question review + rationale
- [x] ATAKE-7 Weak-area callout
- [~] ATAKE-8 Auto-recert (no official/practice split)
- [x] CERT-1 My certification

## QMAN / AMON / GAP / RDD
- [x] QMAN-1 Question CRUD + taxonomy
- [x] QMAN-2 Draft→approved gate
- [x] QMAN-3 Retire + source-link
- [~] QMAN-4 Pool config (per-attempt count partial)
- [x] AMON-1 Monitor KPIs + roster + ad-hoc
- [ ] AMON-2 Official vs practice split
- [x] GAP-1 Gap analytics
- [x] RDD-1 Rep drill-down

## PULSE
- [~] PULSE-1 Team pulse cards
- [x] PULSE-2 Top topics
- [x] PULSE-3 Content gaps this week
- [ ] PULSE-4 Weekly digest job

## USER / ACCESS / ROLE
- [x] USER-1 User list + filters
- [ ] USER-2 Invite / approve / reject
- [~] USER-3 Role select (persona-based)
- [~] ACCESS-1 Brand-access matrix — enforcement done in service (svc); matrix UI pending (Area 11)
- [~] ROLE-1 Permission sets — enforcement done in service (svc); editor UI pending (Area 11)
- [~] ROLE-2 Country dimension (no filters)

## PROD  (Area 2)
- [x] PROD-1 Catalog list (`viewProducts`, uses filtered-list; type/status filters)
- [x] PROD-2 Add/Edit — slug immutable on edit, editable on create (OQ-8 default); aliases, sort order
- [x] PROD-3 Competitor products (neutral placeholders; first-class + flagged)
- [x] PROD-4 Deactivate ≠ delete (archives; excluded from grants + retrieval)

## KB  (Area 3)
- [x] KB-1 Document list + Documents/Archived tabs + filter-by-path + Refresh (`viewKB`)
- [x] KB-2 Upload (11 file types validated) → namespaced by product slug + blob path
- [x] KB-3 Parse→chunk (heading path)→embed (TF-IDF via `js/rag.js`)→index by slug
- [x] KB-4 Path-based idempotent upsert (reuse path = replace, no dup)
- [x] KB-5 Archive ≠ delete (excluded from retrieval; restorable)
- [x] KB-6 Status lifecycle parsing→active (simulated ~2.5s; copy says ~30–90s)

**Vector store:** `js/rag.js` — real TF-IDF + cosine retrieval, scoped by brand
grants in `MerzService.retrieveChunks` (enforcement stays in the service). Seed
corpus built from the demo KB so the Ask pipeline (Area 4) has real text to rank.

## COMP
- [x] COMP-1 Off-label classifier logs a ComplianceFlag
- [x] COMP-2 PV capture + routing
- [x] COMP-3 Prompt-injection classifier (refuse + log + surface)
- [~] COMP-4 Compliance flags log (static)
- [ ] COMP-5 Weekly digest job

## CGAP
- [x] CGAP-1 Gap queue
- [x] CGAP-2 Write-answer resolves
- [ ] CGAP-3 Re-run originals
- [ ] CGAP-4 Notify askers

## PADM
- [~] PADM-1 At-a-glance (scattered)
- [ ] PADM-2 Country/brand filters everywhere
- [~] PADM-3 AI generation w/ review (review only)

## NOTIF
- [x] NOTIF-1 Notification bell/panel
- [ ] NOTIF-2 Event notifications
- [ ] NOTIF-3 Scheduled jobs
