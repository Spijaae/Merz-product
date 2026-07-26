# AllysAI "Product Expert" — Feature Catalog (source of truth)

> **Status:** Reconstructed from the screen-by-screen platform spec
> (`allysai-platform-spec.md`) plus the feature-ID families in the parity task,
> because the original catalog was not present in the repo. This document is the
> authoritative feature registry; `PARITY-CHECKLIST.md` tracks build progress
> against every ID here.
>
> **Branding rule:** product names in the spec (Xeomin, Belotero, etc.) are
> placeholders. We keep neutral/own seed data and match *functionality only*.
>
> **Build mode (decided):** **client-only simulation.** There is no backend. A
> centralized in-browser **service layer** (`js/services.js`) plays the role of
> the server: it owns the data store (Part E model) and performs **all** access-
> control and retrieval enforcement. The UI must never filter for security — it
> calls the service, and the service enforces brand grants, roles, permission
> sets, and the approval gate. This is how constraints #2/#3 are honoured within
> a static app: enforcement is *centralized and non-bypassable from the view
> layer*, even though it is not a real network boundary.

---

## Part A — Product overview

A RAG-style field-enablement assistant for sales reps, wrapped in an admin
console. Three pillars: **Ask** (corpus-only answers with citations, confidence,
HCP-ready phrasing), **Assess** (question pools, certification, gap analytics),
**Administer** (users, per-brand access, product catalog, vector store, content
gaps, compliance).

Tenant model: one Org → many Products/brands → many approved Documents → many
Chunks; Users hold BrandGrants and PermissionSets.

**Global business rules** (see platform-spec §16 for the canonical list):
corpus-only answering; dual HCP/Rep registers; section-level citations; brand
grants gate retrieval; question-approval gate; completion ≠ certification;
official vs practice attempts; immutable slug; path-based upsert; deactivate not
delete; gap resolution loops back; composable permission sets; off-label +
injection detection logged not blocked; per-rep cadence; one-question-per-screen
with confidence capture; auto-recertify on passing official; streaming answers;
comparison intent → comparison template.

---

## Part B — Feature registry

Each feature has an ID, a one-line behaviour, and its acceptance signal. Status
is tracked in `PARITY-CHECKLIST.md`.

### AUTH — Authentication & provisioning
- **AUTH-1** Sign-in with provisioned email + password.
- **AUTH-2** Hybrid provisioning (OQ-1 = hybrid): admin invite **and** a pending
  self-signup queue with approve/reject. New self-signups land as `pending`.
- **AUTH-3** First-run onboarding, replayable from the profile menu.
- **AUTH-4** Sign out.
- **AUTH-5** Simulated session in the service layer (current-user identity that
  every service call is evaluated against).

### NAV — Global shell
- **NAV-1** Top bar: hamburger · logo · tier label (`EXPERT`, one screen `PILOT`).
- **NAV-2** Slide-over left nav with `FOR ME` / `ADMIN` groups under Assessment,
  plus an `Admin` section (Team pulse, Users, Products, Knowledge base).
- **NAV-3** Admin items + Admin section render only for admin role.
- **NAV-4** Sidebar/home/library filtered by the rep's brand grants (via service).
- **NAV-5** Active item pill-highlight + left accent bar.
- **NAV-6** Route model with `cid`-addressable threads and `/admin/*` views.

### HOME
- **HOME-1** Greeting card: date (letterspaced caps), time-aware greeting, corpus
  summary (`N brands · N approved sources`).
- **HOME-2** Stat cards: Questions asked (+threads), Active reps (of team),
  Approved sources (across brands).
- **HOME-3** Ask bar with voice + send.
- **HOME-4** Suggested question chips from top team questions.
- **HOME-5** Brand list, grant-filtered.

### ASK — Answer thread
- **ASK-1** Corpus-only answer; unanswerable → content gap (never hallucinate).
- **ASK-2** Retrieval trace chip: `Researched N sources · Xs`, collapsible.
- **ASK-3** Confidence badge + named provenance class + source-type pill.
- **ASK-4** HCP-ready card ("SAY THIS TO THE HCP").
- **ASK-5** HCP-ready ⟷ Rep-detail register toggle.
- **ASK-6** Supporting points with superscript citation markers.
- **ASK-7** Section-level footnotes (document → heading path).
- **ASK-8** Mandatory disclaimer / legal line on every answer.
- **ASK-9** Show-sources expander/drawer with permission badges.
- **ASK-10** Share: Copy / WhatsApp / Email.
- **ASK-11** Feedback 👍/👎 (logged).
- **ASK-12** Memory pill (retained-context counter, increments per turn).
- **ASK-13** Follow-up composer (thread-scoped) + New question.
- **ASK-14** Low-confidence / no-source state → raise gap.
- **ASK-15** Comparison template (columnar per-brand) on comparison intent.
- **ASK-16** Streaming/staged render: trace → confidence → HCP card → points.
- **ASK-17** Every Q/A logged for analytics (volume, feedback, gap, compliance).

### BRAND — Brand/product detail
- **BRAND-1** Hero: category eyebrow, indication, suggested chips, Ask button.
- **BRAND-2** Key differentiators definition list (category, best-for, sources).
- **BRAND-3** Common questions from the team (ranked, ask counts → thread).
- **BRAND-4** KB section: indexed count + content-type chips.

### HIST / LIB
- **HIST-1** Chat history: persisted threads by `cid`, newest first.
- **LIB-1** Library search + product/type/HCP-shareable filters + count.
- **LIB-2** Quick-access chips mapped to content categories.
- **LIB-3** Document viewer, bookmark, and Ask-jump.

### ATAKE / CERT — Assessment (rep side)
- **ATAKE-1** Intro/pre-flight: question count, brands covered, official/practice.
- **ATAKE-2** One question per screen, single-choice card radios.
- **ATAKE-3** Per-question self-confidence capture (pre-reveal).
- **ATAKE-4** Autosave / resume mid-attempt.
- **ATAKE-5** Results: score vs pool threshold, PASS/FAIL, correct/total, time.
- **ATAKE-6** Per-question review with rationale (from source), only post-submit.
- **ATAKE-7** Weak-area callout (missed categories/sub-sections).
- **ATAKE-8** Auto-recertify + recompute `next_due_at` on passing **official**;
  practice never changes cert; no-lockout retake on fail.
- **CERT-1** My certification: badge, next-due, cadence, attempt history.

### QMAN / AMON / GAP / RDD — Assessment admin
- **QMAN-1** Question CRUD with taxonomy (category, sub-section), difficulty.
- **QMAN-2** Origin preset/AI; draft→approved gate — unapproved never served.
- **QMAN-3** Retire; source-link (`source_ref`) on every question.
- **QMAN-4** Pool config: per-brand preset/AI mix + questions-per-attempt.
- **AMON-1** Monitor KPIs (due, completed, pass rate, avg score) + roster +
  ad-hoc assign (disabled until ≥1 selected).
- **AMON-2** Official vs practice metric split preserved.
- **GAP-1** Gap analytics: most-failed, weakest topics, pass-rate-over-cycles.
- **RDD-1** Rep drill-down: profile, cadence editor, score trend, history.

### PULSE — Team Pulse
- **PULSE-1** Cards: active reps, questions asked, threads opened, avg follow-ups.
- **PULSE-2** Top topics this week (by volume).
- **PULSE-3** Content gaps this week (unanswerable questions + ask counts).
- **PULSE-4** Weekly gaps digest job (Monday) → Medical Affairs payload.

### USER / ACCESS / ROLE — Users & access
- **USER-1** User list: search + role/status filters + count.
- **USER-2** Invite user; pending approve/reject lifecycle.
- **USER-3** Role select (admin/member); own role locked read-only.
- **ACCESS-1** Brand-access matrix (user × product); tap to grant/revoke;
  enforced at retrieval in the service.
- **ROLE-1** Composable permission sets (content, pv, assessment, users, kb);
  no single super-role; enforced in the service.
- **ROLE-2** Country dimension + country filters.

### PROD — Product catalog
- **PROD-1** Catalog list: product, slug (mono), category, type badge
  (own/competitor), status, actions.
- **PROD-2** Add/Edit: immutable slug, display name, category, sort order,
  aliases (comma-sep), description, competitor + active flags.
- **PROD-3** Competitor products first-class (for objection content).
- **PROD-4** Deactivate ≠ delete (hides from uploads/grants; history survives).

### KB — Knowledge base / ingestion
- **KB-1** Document list with parse/embed status, newest first + archived tab.
- **KB-2** Upload: 11 file types; namespaced by product slug + blob path.
- **KB-3** Pipeline: parse → chunk (heading path) → embed → index (`product` tag)
  → status; simulated 30–90s.
- **KB-4** Path-based idempotent upsert (reuse path = replace).
- **KB-5** Archive (not delete).
- **KB-6** Status lifecycle: parsing → active → failed/archived.

### COMP — Compliance
- **COMP-1** Off-label classifier: log + surface (not blocked).
- **COMP-2** PV / adverse-event capture + immediate routing + reference number.
- **COMP-3** Prompt-injection classifier: log adversarial inputs, surface them.
- **COMP-4** Compliance flags log fed by the live classifiers; MA routing view.
- **COMP-5** Weekly Monday digest job (gaps, off-label, feedback, PV).

### CGAP — Content-gap loop
- **CGAP-1** Gap queue with age/ask-count, brand filter, pagination.
- **CGAP-2** Write-answer resolves a gap.
- **CGAP-3** Resolving re-runs the original questions.
- **CGAP-4** Notify every rep who asked.

### PADM — Platform admin overview
- **PADM-1** At-a-glance: assessment completion, content-gap queue, usage split.
- **PADM-2** Country + brand filters everywhere.
- **PADM-3** AI question generation with mandatory human review.

### NOTIF — Notifications & jobs
- **NOTIF-1** Notification bell/panel.
- **NOTIF-2** Event notifications: gap-resolved, due/overdue, invites.
- **NOTIF-3** Scheduled jobs (simulated): digest, due/overdue sweep, invites.

---

## Part C — Routes & nav model

```
/                    Home
/thread?cid={uuid}   Answer thread (addressable, appears in Chat history)
/dashboard           Dashboard              (OQ — see Part H)
/history             Chat history
/library             Library
/assessment/take     Take assessment
/assessment/cert     My certification
/admin/questions     Question manager
/admin/monitor       Assessment monitor
/admin/gap           Gap analytics
/admin/rep           Rep drill-down
/admin/pulse         Team pulse
/admin/users         User management
/admin/products      Product catalog
/admin/kb            Knowledge base list
/admin/kb/add        Add data to vector store
/admin/platform      Platform administration (PILOT console)
```

---

## Part D — Pipelines

### D1 — Answer pipeline (corpus-only RAG)
1. **Guardrail classifier** on the raw input: off-label, prompt-injection, PV.
   All three log a `ComplianceFlag`; none silently drop the query.
2. **Alias resolution + brand-grant scoping**: resolve product entities (incl.
   aliases/misspellings) → restrict the retrievable set to the user's granted
   product slugs. Enforced in the service, not the UI.
3. **Vector retrieve**: embed the query, cosine-rank chunks within scope.
4. **Generate** HCP-ready + Rep-detail registers; derive confidence + provenance
   class; pick template (standard vs comparison on compare intent).
5. **Section-level citations** from chunk `heading_path`.
6. **Stream** staged chrome to the client; **log** the Q/A + answer.
   Empty retrieval → content gap, not an answer.

### D4 — Reusable filtered-list pattern
A single component for the recurring **search box + dropdown filters + result
count** pattern (Question manager, Users, Products, KB, Library, Content-gap
queue). Build once, reuse everywhere.

---

## Part E — Data model

See platform-spec §15. Tables: Org, Product, Document, Chunk, User, BrandGrant,
PermissionSet, Thread, Message, Answer, Question, Pool, Assessment,
AttemptAnswer, ContentGap, ComplianceFlag, WeeklyDigest. Modelled in the service
layer's in-browser store, reconciled with the existing `js/data.js` seed data.

---

## Part H — Open questions

- **OQ-1** Provisioning model — **RESOLVED: hybrid** (invite + pending queue).
- **OQ-2** Dashboard contents — *not captured; pause & ask before building.*
- **OQ-3** Chat history row anatomy — infer from thread meta; confirm.
- **OQ-4** Library detail vs KB list separation — confirm which is HCP-facing.
- **OQ-5** Confidence scale (2- vs 3-point? labels?) — confirm.
- **OQ-6** Multi-select questions anywhere? — assume single-choice; confirm.
- **OQ-7** Add-question / Pool-config modal fields — confirm editor shape.
- **OQ-8** Add-product modal (editable slug on create) — confirm.
- **OQ-9** Invite-user modal + approve/reject UI — confirm.
- **OQ-10** "Open digest" output format — confirm the Monday report.
- **OQ-11** Desktop breakpoints (all captures were mobile) — confirm.
- **OQ-12** Error/empty/loading states — confirm per screen.
- **OQ-13** Off-label routing: current code says "not auto-routed to MA"; spec
  admin screen implies MA review. Confirm intended behaviour.
- **OQ-14** Tier gating (EXPERT vs PILOT) — confirm what PILOT gates.

---

## Part I — Screens not captured (pause before building)

Dashboard, Chat history row design, Library detail, all modals (add-question,
pool-config, add-product, invite-user), digest output, and error/empty/loading
states. Build placeholders and confirm before finalizing.
