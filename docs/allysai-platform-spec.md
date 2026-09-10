# AllysAI "Product Expert" — Functional Specification

**Source:** 19 mobile screenshots + a screen-recording (91 frames) of `product.expert.allysai.com` (Merz Aesthetics tenant), captured 25 Jul 2026.
**Purpose:** a build-ready description of every screen, control, state and data object visible, so the same functionality can be implemented independently.

**Scope note:** this documents *behaviour and data model only*. Logos, brand colours, product names (Xeomin, Belotero, Radiesse, Ultherapy, Bocouture) and marketing copy belong to their owners and should be replaced with your own.

---

## 1. What the product is

A **RAG-based field-enablement assistant for pharmaceutical / aesthetics sales reps**, wrapped in an admin console.

Three pillars:

| Pillar | Purpose |
|---|---|
| **Ask** | Reps ask product questions; the system answers only from an approved document corpus, with citations, confidence, and an "HCP-ready" phrasing they can read aloud or forward. |
| **Assess** | Reps are periodically certified via question pools; admins monitor pass rates and diagnose weak topics. |
| **Administer** | Admins manage users, per-brand access, the product catalog, the vector store, content gaps, and compliance flags. |

Tenant model: one org (Merz) → many **brands/products** → many **approved sources** → many **reps**. The header shows the tenant logo plus a tier label (`EXPERT`); one screen carries a `PILOT` badge, implying tier/feature gating.

---

## 2. Global shell

**Top bar (all screens):** hamburger (left) · tenant logo · tier label `EXPERT` (right).

**Slide-over left navigation** (screenshot 10), overlays content with a collapse chevron:

```
Home
Dashboard
Chat history
Library
Assessment                      ▲ (expandable)
  ── FOR ME
     Take assessment
     My certification
  ── ADMIN
     Question manager
     Assessment monitor
     Gap analytics
     Rep drill-down
Admin                           ▲ (expandable)
     Team pulse
     Users
     Products
     Knowledge base
```

**Key nav behaviours to replicate**
- Two visible groups (`FOR ME` / `ADMIN`) inside one section — personal vs. managerial views of the same domain.
- The `ADMIN` sub-items and the whole `Admin` section render only for admin role.
- Active item is pill-highlighted with a left accent bar.
- The sidebar contents are **filtered by the rep's brand grants** (stated on the admin screen: *"the change applies across their sidebar, home and library"*).

**Routes observed**
```
/                       Home
/thread?cid={uuid}      Answer thread
/admin/assessment/…     Question manager
/admin/users            User management
/admin/products         Product catalog
/admin/kb               Knowledge base list
/admin/kb/add           Add data to vector store   (inferred)
```

---

## 3. Home (screenshot 9)

1. **Greeting card** — gradient background. Date in letterspaced caps (`SATURDAY, JULY 25`), time-aware greeting (`Good evening, {firstName}`), and corpus summary: `10 brands · 3,012 approved sources in the knowledge base`.
2. **Stat cards** (stacked on mobile, grid on desktop):
   - `QUESTIONS ASKED` — 581, sub-label `307 threads`
   - `ACTIVE REPS` — 18, sub-label `of 18 on the team`
   - `APPROVED SOURCES` — 3,012, sub-label `across 10 brands`
3. **Ask bar** — prominent, high-contrast border. Placeholder `Ask anything, or compare brands…`, microphone button (voice input), circular send button.
4. **Suggested question chips** — tappable, pre-fill and submit. Generated from top team questions.

---

## 4. Answer thread (screenshots 11, 16, 6)

The most important screen. Anatomy top→bottom:

| Element | Detail |
|---|---|
| Header row | Back chevron · `+ New question` button |
| Thread meta | `{Brand} · thread started just now` (relative timestamp) |
| **Memory pill** | `Memory 8` → increments to `9` between screenshots. Count of retained context items for this thread; tinted lilac. |
| Question | Rendered as the page H1 |
| Retrieval trace | Collapsible chip: `Researched 2 sources · 4.4s` with disclosure caret |
| Confidence badge | `● High confidence · directly from monograph` + a source-type pill (`Xeomin monograph`) |
| **HCP answer card** | Label `SAY THIS TO THE HCP`, thick left accent bar, large verbatim text — designed to be read aloud or pasted |
| Audience toggle | Segmented control: **HCP-ready** \| **Rep detail** — same answer, two registers |
| Supporting points | `SUPPORTING POINTS` bullets, each with superscript citation markers ¹ ² |
| Footnotes | Resolved citations with document → section path, e.g. *Xeomin — clinical — Package leaflet: > What XEOMIN contains* |
| Legal line | Italic: *Always verify against the latest approved label before use with HCPs.* |
| Sources | `Show 2 sources` expander |
| Share | `SHARE THIS ANSWER` → **Copy answer**, **WhatsApp**, **Email** |
| Feedback | `Was this useful?` thumbs up / down |
| Composer | `Ask a follow-up about {Brand}…` + mic + send (thread-scoped) |

**Behaviours to build**
- Answer generation is **corpus-only**; if nothing is retrievable it becomes a *content gap* (§10) instead of a hallucinated answer.
- Confidence is derived and displayed, with the provenance class named ("directly from monograph").
- Citations are **section-level**, not just document-level — chunk metadata must carry a heading path.
- Threads persist with a `cid` and appear in Chat history.
- Every answer is logged for analytics (topic volume, feedback, gap detection, compliance screening).

---

## 5. Brand / product detail page (screenshot 12)

Breadcrumb `Brands · Xeomin`, then:

- **Hero card** (tinted): category eyebrow `NEUROTOXIN · NTX`, brand name, one-line indication (`Glabellar lines, upper-face dynamic wrinkles.`), 2 suggested-question chips, primary `Ask about {Brand}` button.
- **KEY DIFFERENTIATORS** — definition list: `CATEGORY`, `BEST FOR`, `APPROVED SOURCES` (`172 indexed in the knowledge base`).
- **COMMON QUESTIONS FROM THE TEAM** — ranked list, each row: brand initial avatar, question text, `59 asks` counter, chevron → opens a thread.
- **KNOWLEDGE BASE** — count of indexed sources + content-type tag chips: `clinical`, `objection handler`, `regulatory`, `sales`, `training`.

---

## 6. Assessment — Question manager (screenshots 2, 7)

Eyebrow `ASSESSMENT`, title **Question manager**, sub: *"Master pool across all products. Questions must be approved before they can appear in an assessment."*

**Controls:** search question stems · `All categories` · `All origins` · `All status` · `Pool config` button · `+ Add question`.

**Table columns:** QUESTION (stem + ID `Q001`), CATEGORY, SUB-SECTION *(and off-screen: status, origin, actions)*.

**Footer:** `{n} of {m} questions · {k} approved` · `0 AI drafts awaiting approval`.

### Taxonomy captured from the rows

**Categories (product buckets)**
- Xeomin / Bocouture (Botulinum Toxin)
- Competitor Objection Handlers — Toxins
- Belotero (HA Fillers)
- Radiesse / CaHA
- Ultherapy / PRIME
- Cross-Portfolio / Combination & Field Use

**Sub-sections (skill buckets)**
Product Education · Clinical / Dosing · Clinical / Technical · Clinical Evidence · Differentiation · Objection Handling · Positioning · Protocol / Technique · Regulatory / Label · Safety · Safety / IFU · Sales Materials · Combination Therapy · Patient Education

**Origin** — `preset` (human-authored) vs `AI` (generated from the corpus). The admin screen shows `25 AI-generated draft questions` awaiting review, and pools labelled `10 preset · 0 AI`.

**Status** — draft → approved. **Unapproved questions can never be served.** This is the core governance rule.

**Pool config** — per-brand pools with a preset/AI mix and a question count per assessment.

---

## 7. Assessment monitor (screenshot 5)

Sub: *"Certification status and cadence across the field team."*

**KPI cards:** `DUE THIS WEEK` 9 (*9 overdue*) · `COMPLETED THIS WEEK` 2 (*official attempts only*) · `PASS RATE` 33% (*across all attempts*) · `AVG SCORE` 56% (*across all products*).

**Bulk action:** *"Select reps to assign an ad-hoc assessment"* + `Refresh`. The `+ Assign assessment` button is **disabled until ≥1 checkbox is ticked**.

**Table:** checkbox · REP (name + email) · CERTIFICATION badge · NEXT DUE.

Badge states: `✕ LAPSED` (outlined, warning red) · `🎖 CERTIFIED` (solid black).
Due column combines an absolute date with a relative phrase — `due today`, `in 8 days`, `14 overdue` — coloured red when overdue.

**Distinction to preserve:** *official attempts* (count toward certification) vs practice attempts (don't). Pass rate spans all attempts; completed-this-week counts official only.

---

## 8. Gap analytics (screenshot 8)

Title **Training gap analytics**, sub: *"Where the team is losing points — fold these into field enablement."* + `Refresh`.

1. **Most-failed questions** — `Top 4 by fail rate`. Rank number, question stem, `{category} · 6 of 9 missed`, large fail % on the right.
2. **Weakest topics** — `Average fail rate across the team`. Topic label, % right-aligned, horizontal progress bar (Product Education 56%, Clinical / Dosing 33%).
3. **Pass rate over cycles** — `Team average, by quarter`, line/scatter chart with quarter labels (`Q3 26`).
4. **Cross-link card** (inverted/black): *"These gaps feed Team Pulse — content-gap detection on Team Pulse routes weak areas to Medical Affairs for the weekly digest."* + `Open Team Pulse`.

---

## 9. Rep drill-down (screenshot 14)

- Searchable rep selector (dropdown of emails).
- **Profile card:** initials avatar, username, `{Role} · {email} · next due {date} · overdue`, certification badge, and an editable `CADENCE` dropdown (`3 months`) — per-rep recertification interval.
- **Score trend** — `Official attempts` chart over time.
- **Assessment history** — date · assessment name (`Baseline assessment`) · `FAIL`/`PASS` badge · score %.

---

## 10. Team pulse (screenshot 17)

Eyebrow `TEAM PULSE · WEEK OF JULY 25`, title `{Manager}'s team`.

**Cards:** `ACTIVE REPS` 18/18 · `QUESTIONS ASKED` 584 · `THREADS OPENED` 310 · `AVG FOLLOW-UPS` 0.9 per thread.

**Top topics this week** — `By question volume`: question text, bar, count.

**Content gaps this week** — *"Questions we couldn't answer"*: question + `1 ask`.

**Weekly gaps digest** (black card): *"Full report with off-label routing, feedback themes, and PV signal summary goes to Medical Affairs every Monday."* + `Open digest`.

> Note `PV` = pharmacovigilance. The digest bundles: unanswerable questions, off-label requests, feedback themes, and possible adverse-event signals — a scheduled weekly job with an email/report output.

---

## 10b. Rep-facing assessment flow *(from the screen-recording)*

The video captured the entire **Take assessment → results → My certification** journey that the stills missed. This is the rep-side counterpart to the admin monitor (§7) and drill-down (§9).

### Start / intro screen
- Eyebrow `ASSESSMENT`, title **Take assessment**, short explainer.
- A pre-flight card stating the shape of the attempt: **number of questions**, **which products/brands** it covers, and the **attempt type**.
- **Official vs practice toggle** shown *before* starting — the rep chooses (or is assigned) an official attempt (counts toward certification) or a practice run (doesn't). This confirms the official/practice split from §7 is surfaced at attempt time.
- Primary `Start assessment` button.

### Question screen (one at a time)
- Progress indicator: `Question {n} of {total}` plus a progress bar.
- Question stem with its ID (`Q0xx`) and a category/sub-section tag.
- **Single-choice answer options** as large tappable cards (radio behaviour — one selectable).
- A **self-rated confidence control** attached to the question (e.g. *how sure are you?*) — captured alongside the answer. This feeds analytics: a wrong answer given with high confidence is a worse signal than a hesitant guess, and lets the platform distinguish knowledge gaps from confidence gaps.
- Navigation: `Next` (and back where allowed). On the last question the primary action becomes `Submit`.
- Selection state is clearly styled (selected option highlighted); no correctness shown mid-attempt for official runs.

### Results screen (immediately after submit)
- **Score headline** — big percentage + `PASS` / `FAIL` badge against the pool's pass threshold.
- Summary stats: correct / total, time taken, official-or-practice label.
- **Per-question review list** — each question expandable to show: the rep's answer, the correct answer, correct/incorrect marker, and an **explanation/rationale** drawn from the source material (ties back to the `explanation` field on the Question object).
- Weak-area callout — which categories/sub-sections were missed, mirroring the admin gap analytics but scoped to this rep/attempt.
- On a passing official attempt, certification is (re)issued and `next_due_at` is recalculated from the rep's cadence.

### My certification screen
- Personal status card: current **certification badge** (`CERTIFIED` / `LAPSED`), **next-due date**, and **cadence**.
- History of past attempts (date · name · pass/fail · score) — the rep's own view of the drill-down history in §9.
- Entry point to start the next assessment.

**Rules confirmed / added from the video**
- Questions are served **one per screen**, single-choice, with per-question **confidence capture**.
- Correct answers + rationales are revealed **only after submission** (for official attempts), not during.
- The results→certification→next-due loop is automatic on a passing official attempt.
- Practice attempts produce a score and review but do **not** change certification state or due date.

### Answer streaming *(observed in the ask flow frames)*
The recording also showed the **answer thread rendering progressively** — the retrieval trace (`Researched … sources`) appears first, then the HCP card populates, then supporting points. Build the answer endpoint as **streaming** (or at least staged) so the retrieval/confidence chrome shows before the full text resolves. The **Rep detail** side of the toggle (frame ~22) carries denser clinical content — reconstitution volumes, dosing per 0.1 ml, storage/stability — i.e. the same answer expanded for internal use rather than HCP delivery.

### Comparison answers *(observed, frame ~38)*
Asking to *"compare"* multiple brands produces a **side-by-side comparison layout** (columns per brand across differentiator rows) rather than prose — a distinct answer template the generator must support, triggered by comparison intent in the query (the home ask bar explicitly invites *"or compare brands"*).

---

## 11. User management (screenshot 4)

Sub: *"Manage who can access AllysAI. New sign-ups appear here as pending — approve to grant access or reject to decline the request."*

**Controls:** search name/email · `All roles` · `All status` · `Invite user`.

**Table:** USER (bold name + grey email; `(you)` suffix on self) · ROLE (inline `<select>`: `admin` / `member`; the current user's own role is a locked read-only pill).

**Footer:** `10 users · 10 active`.

**States:** pending → approve / reject; active; (implied) deactivated.

> Conflict worth resolving in your build: this screen says new sign-ups arrive as *pending*, while the admin screen states *"Admin provisions accounts (email + password) — no self-registration."* Pick one — invite-only is the stricter and more likely-correct model for regulated pharma.

---

## 12. Product catalog (screenshots 13, 1, 18)

Sub: *"The catalog of products/medicines. Each drives the upload dropdown, the blob naming, and the product tag on every chunk. Deactivating hides a product from new uploads and access grants without deleting its history."*

**Controls:** search · `+ Add product`.

**Table:** PRODUCT · SLUG (monospace) · CATEGORY · TYPE badge (`● Merz` green / `● competitor` amber) · STATUS (`● active`) · ACTIONS (`✎ Edit`, `⊘ Deactivate`).

Rows observed:

| Product | Slug | Category | Type |
|---|---|---|---|
| Xeomin | `xeomin` | Botulinum Toxin | own |
| Bocouture | `bocouture` | Botulinum Toxin | own |
| Belotero | `belotero` | HA Filler | own |
| Radiesse | `radiesse` | CaHA Biostimulator | own |
| Ultherapy | `ultherapy` | Energy-Based (Ultrasound) | own |
| Merz Aesthetics (General) | `merz-aesthetics` | Cross-Portfolio | own |
| Botox | `botox` | Botulinum Toxin | competitor |
| Nabota | `nabota` | Botulinum Toxin | competitor |

**Edit product modal** (screenshot 18) — *"The slug is immutable (it's baked into blob names + chunk metadata)."*

Fields: `SLUG` (read-only) · `DISPLAY NAME` · `CATEGORY` · `SORT ORDER` (int) · `ALIASES (comma-separated)` (e.g. `bocouture, xeomeen` — drives query-time entity matching incl. misspellings) · `DESCRIPTION` (textarea) · checkboxes `Competitor product` and `Active` · `Cancel` / `Save changes`.

**Design rules to copy**
- Slug is the immutable primary key; renaming touches display name only.
- Competitor products are first-class catalog entries so objection-handling content can be indexed against them.
- Deactivate ≠ delete: history and existing chunks survive, but the product disappears from upload dropdowns and new access grants.

---

## 13. Knowledge base (screenshots 15, 19)

### 13a. Document list — `/admin/kb`

Sub: *"Every document in the vector store and its parse/embed status, newest first."*

`+ Add data to vector store` · tab counters `Documents 33` / `Archived 0` · `Filter by path…` · result count · `Refresh`.

Table: DOCUMENT (file icon + filename) · STATUS (`● Active`) *(and off-screen: product, chunks, uploaded date, actions)*.

Filenames show real-world variety — `CaHA_Safety_Profile.pptx`, `Xeomin_core_messages.pdf`, `Radiesse_IN00210-00_Insert.pdf`, `LP10421-00.pdf` — so display the path but keep a human label where possible.

### 13b. Upload — `Add data to vector store`

Copy: *"Upload a document to add it to the product knowledge base. Files are parsed, embedded, and indexed automatically — allow ~30–90 seconds before answers can cite it. Re-uploading the same path replaces that document."*

| Field | Rules |
|---|---|
| **Document** | Drag & drop or browse. *"A single document, up to a few hundred pages."* Accepted: **PDF, PPTX, PPT, DOCX, DOC, ODP, ODT, ODS, XLSX, XLS, RTF** (shown as chips) |
| **Product** | Searchable select. **Required.** *"The document is namespaced by product so retrieval can scope it and gate access."* |
| **Blob path** | Optional, defaults to filename. *"The path is the document's identity. Use distinct paths for distinct documents; reuse a path to update one."* |
| Submit | `Upload to knowledge base` — disabled until file + product are set |

**Pipeline implied:** upload → blob storage (named by product slug + path) → parse → chunk (with heading path preserved for citations) → embed → index with `product` tag → status `Active`. Idempotent on path (upsert/replace). Target 30–90 s.

---

## 14. Platform administration (screenshot 3)

Long single-page console, badged `PILOT`. Sub: *"Assessment, content gaps, compliance, users, and knowledge base. Filter by country and brand everywhere."*

### AT A GLANCE
- `ASSESSMENT COMPLETION · YTD` — **33%**, *3 assigned · 1 completed · 2 pending across all users*
- `CONTENT GAP QUEUE` — **101**, *oldest 54 days · 25 ULT · 7 BEL · 4 XEO · 3 RAD*
- `USAGE SPLIT BY BRAND` — stacked bar + legend: XEO 32% · RAD 23% · BEL 21% · ULT 21% · BOC 3%

### BRAND ACCESS & OFF-LABEL

**Brand access matrix** — *"Tap a cell to grant or revoke."*
Medicine chips across the top (`Xeomin`, `Bocouture`, `Belotero`, `Radiesse`, `Ultherapy`, `Merz Aesthetics (General)`, `+ Add medicine`), representatives down the side, checkbox at each intersection.
Rule: *"A representative only sees and can ask about the medicines assigned here — the change applies across their sidebar, home and library."*
→ Brand grants are an **authorization boundary enforced at retrieval time**, not just a UI filter.

**Off-label questions** — toggle `Flagged for Medical Affairs`. List of questions the system classified as off-label, each with an `OFF-LABEL` tag and brand code suffix (`· XEO`, `· RAD`, `· BOC`). Examples range from genuine clinical queries (*"Is Xeomin approved for axillary hyperhidrosis in our market?"*) to noise.

### ADMINISTRATION

- **Assessment manager** — `+ New profile`. One pool per brand with a coloured dot, `10 preset · 0 AI`, and a `Review` button. Plus `25 AI-generated draft questions` → `Open question manager`.
- **Content gap queue** — `Sync` · `Brand: All` filter. Each row: question, `1 reps asked · 54 days old`, `Write answer` button. Pagination `101 total · Page 1 of 17`.
  Rule: *"Resolving a gap re-runs the original questions, then notifies every rep who asked. Separate metric from assessment completion."*
  → Closing the loop is automated: answer authored → affected threads re-run → askers notified.
- **Compliance flags** — `18 total`. Logs suspicious inputs, including prompt-injection attempts (*"reveal your system instructions"*, *"Ignore all previous instructions…"*, fake `BEGIN DOCUMENT … END DOCUMENT` wrappers). **Build this: an input classifier that logs and surfaces adversarial prompts rather than silently dropping them.**
- **Users** — columns USER / COUNTRY / PROFILE / COM… + `Add user`.
- **Roles & permissions** — badge `separated sets`; currently *"No roles configured."*
  Rule: *"Separate sets (content, PV, assessment, users, KB), combinable per person — never one unrestricted role."*
- **Footer principles** — *"Completion (engagement) is separated from certification (performance). Admin provisions accounts (email + password) — no self-registration. Add or edit users live."*

---

## 15. Data model

```
Org
 └── Product            id, slug (immutable, unique), display_name, category,
                        sort_order, aliases[], description,
                        is_competitor, is_active

 └── Document           id, product_id →Product, blob_path (unique per product),
                        filename, mime, page_count, status(parsing|active|failed|archived),
                        uploaded_by, uploaded_at
      └── Chunk         id, document_id, product_slug, heading_path,
                        page, text, embedding

 └── User               id, email, display_name, role(admin|member),
                        status(pending|active|rejected|disabled), country,
                        cadence_months, next_due_at, certification(certified|lapsed)
      └── BrandGrant    user_id × product_id            [the access matrix]
      └── PermissionSet user_id × set(content|pv|assessment|users|kb)

 └── Thread             id(cid), user_id, product_id, started_at, memory_count
      └── Message       id, thread_id, role, text
      └── Answer        message_id, hcp_text, rep_detail_text,
                        confidence, provenance_label, latency_ms,
                        sources[], supporting_points[],
                        template(standard|comparison), compared_products[],
                        feedback(up|down|null), is_off_label, is_content_gap

 └── Question           id(Q001), stem, category, sub_section,
                        origin(preset|ai), status(draft|approved),
                        product_id, options[], correct_option, explanation
 └── Pool               id, product_id, preset_count, ai_count, questions_per_attempt
 └── Assessment         id, user_id, pool_id, name, assigned_at, due_at,
                        is_official, status, score, passed
      └── AttemptAnswer assessment_id, question_id, selected, correct,
                        self_confidence          [rep's pre-reveal confidence rating]

 └── ContentGap         id, question_text, product_id, ask_count, first_asked_at,
                        status(open|answered), answer_text, resolved_by
 └── ComplianceFlag     id, user_id, thread_id, input_text, flag_type, created_at
 └── WeeklyDigest       week_of, org_id, payload(gaps, off_label, feedback, pv), sent_at
```

---

## 16. Core business rules (the non-obvious ones)

1. **Approved-corpus-only answering.** No general-model fallback. Unanswerable → content gap.
2. **Two answer registers.** Every answer stores both an HCP-safe rendering and a rep-detail rendering.
3. **Section-level citations.** Chunk metadata must retain the document's heading path.
4. **Brand grants gate retrieval.** Filter the vector query by the user's granted product slugs — never filter in the UI alone.
5. **Question approval gate.** Draft/AI questions cannot be served until approved.
6. **Completion ≠ certification.** Engagement metric and performance metric are separate and must not be conflated.
7. **Official vs practice attempts.** Only official attempts move certification.
8. **Immutable slug.** Baked into blob names and chunk metadata; renames touch display name only.
9. **Path-based upsert.** Re-uploading the same path replaces the document rather than duplicating it.
10. **Deactivate, never delete.** Products and documents archive; history survives.
11. **Gap resolution loops back.** Answering a gap re-runs the original questions and notifies every rep who asked.
12. **Composable permission sets** — content, PV, assessment, users, KB. No single superuser role.
13. **Off-label and injection detection** run on every input; both are logged and surfaced, not silently blocked.
14. **Per-rep cadence** drives `next_due_at` and the certified/lapsed state.
15. **One question per screen, single-choice, with confidence capture.** Correct answers and rationales reveal only after submission on official attempts.
16. **Passing an official attempt auto-recertifies** and recalculates the next-due date from cadence; practice attempts never change certification.
17. **Streaming answers** — render retrieval/confidence chrome before the full answer resolves.
18. **Comparison intent → comparison template** (columnar, per-brand) instead of prose.

---

## 17. Suggested build order

**Phase 1 — Foundations**
Auth + invite-only provisioning · role/permission sets · product catalog CRUD with immutable slug · user management.

**Phase 2 — Knowledge pipeline**
Blob upload (11 file types) · parse → chunk with heading paths → embed → index · KB list with status · path-based upsert · archive.

**Phase 3 — Ask**
Retrieval scoped by brand grants · dual-register answer generation · citations, confidence, latency trace · thread persistence + memory · share (copy/WhatsApp/email) · feedback · suggested questions · brand detail pages.

**Phase 4 — Assessment**
Question CRUD + taxonomy + approval workflow · pools and pool config · take-assessment flow (one-per-screen, single-choice, confidence capture) · post-submit review with rationales · scoring, official/practice, cadence, auto-recertification, certified/lapsed state · My certification · monitor and rep drill-down.

**Phase 5 — Intelligence**
Content-gap detection and queue · gap resolution + rep notification · gap analytics (most-failed, weakest topics, pass-rate trend) · Team Pulse · weekly digest job.

**Phase 6 — Governance**
Off-label classifier · prompt-injection/compliance flagging · brand access matrix UI · audit trail · country/brand filters everywhere · AI question generation with human review.

---

## 18. Gaps — status after the screen-recording

**Now resolved from the video** (see §10b):
- ✅ **Take assessment** — full flow: intro, per-question single-choice with confidence rating, results, review.
- ✅ **My certification** — status card + attempt history.
- ✅ **Rep detail** answer register and **comparison** answer template.
- ✅ **Streaming/staged** answer rendering.

**Still not captured — confirm before building:**
- **Dashboard**, **Chat history**, **Library** — nav items only, never opened.
- **Add question** and **Pool config** modals (question editor fields, correct-answer marking, AI-draft review UI).
- **Add product** modal (assumed to mirror Edit, with an editable slug).
- **Invite user** modal and the pending approve/reject UI.
- **Open digest** output format (the Monday Medical Affairs report).
- Exact **confidence scale** (2-point? 3-point? labels?) and whether questions allow multi-select anywhere.
- Desktop breakpoints — everything captured is mobile; several tables were horizontally clipped (Products STATUS/ACTIONS, Users COUNTRY/PROFILE, Assessment monitor NEXT DUE).
- Error, empty and loading states throughout.

Grab screenshots or a recording of those and I'll extend this doc.
