# Allys Console — Desktop Console (design)

A high-fidelity, interactive design of the **Desktop Console** for the *AllysAI Sales
Companion* (per the PRD, §2.2 — the back-office surface). It is the deliberate opposite
of the field PWA: dense, multi-panel, data-heavy, keyboard-driven. Capture lives on
mobile; **oversight, analysis, governance and configuration live here.**

Runs entirely in the browser — no backend, no build step. Open `console/index.html`.

> All content is **fictional demo data** (a UAE tenant, invented products/HCPs). It is
> not real medical, dosing, or promotional information.

## Who it's for

First-line Sales Manager · Marketing / Medical Affairs · Pharmacovigilance · Compliance / Admin.

## Modules (7)

| Module | What it covers |
|---|---|
| **Manager Dashboard** | Team activity, coverage, call adherence, coaching readiness, CRM completion, team overview |
| **Analytics & Reporting** | 12 scheduled reports (sales weekly, commercial, HCP engagement, scorecards, competitive intel, off-label queries, PV alerts/summaries, training-gap, audit log, adoption), KPI computation, routed intelligence, exports + a report-detail view |
| **Coaching Review** | Readiness, coaching history, debrief review, trends, pattern detection, role-play insights |
| **Marketing / Medical** | Routed field intelligence — material feedback, medical questions, competitive mentions |
| **Pharmacovigilance** | Drafted PV reports, human review workflow, approve-before-send, audit trail, reference IDs |
| **Compliance & Audit** | AI interaction log, query history, compliance status, off-label refusals, competitive mentions, export logs, search, filters |
| **Configuration** | 13 per-client surfaces — product catalogue, therapeutic areas, approved materials, doctor tiers, HCP profiles, CRM target, messaging channels, consent rules, history retention, languages, compliance rules, reports & recipients, branding |

Plus an **Information Architecture** overview (IA map, navigation model, screen flow) and a
**Design System** screen (tokens, typography, component library, empty/loading/error states).

## Deliverables covered

Desktop IA · navigation · screen flow · wireframes → high-fidelity UI · dashboard design ·
data tables (sticky headers, sort, bulk actions, pagination) · reporting screens ·
configuration screens · empty / error / loading states · component library · design system.

## Design language

- **Slate neutrals with a petrol-teal accent.** Reserved semantic colours
  (compliant / off-label / critical / competitive / PV) never double as chart-series hues.
- **Validated categorical chart palette** — fixed six-slot order, assigned by entity, always
  shipped with legend + labels so identity is never colour-alone.
- **Theme-aware** (light/dark), tabular numerics, a monospace face for reference IDs,
  timestamps and confidence scores.
- Persistent compliance indicator, global search, reporting-period selector and isolated
  tenant switcher in the top chrome (§4.4 / §4.5).

## Notes on fidelity to the PRD

- The **PV flow is the non-negotiable** flag → draft → human-send → audit sequence (§4.2),
  shown explicitly in the review drawer with a reference ID.
- Readiness is presented as a **coaching signal, not a performance score** (§3.5).
- Consent is the messaging guardrail (§3.4); records lock after finalization with visible,
  timestamped amendments (§3.7); outcome correlation is shown as roadmap-gated (§7.3).
- No workflows outside the PRD were invented, and no new modules were added.
