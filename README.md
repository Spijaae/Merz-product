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
- **Persona switch** (Rep / Manager / Admin) in the top bar replaces the old demo tabs,
  reflecting the plan's role-gated access.

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

## Structure

```
index.html        # full-screen shell + theme boot
css/styles.css    # monochrome light/dark design system
js/icons.js       # inlined Lucide icon subset + icon() helper
js/data.js        # mock knowledge base, documents, reps, admin data
js/app.js         # state, routing, answer engine, views, modals, theme/persona
```

Persisted keys (`localStorage`): `merz_theme`, `merz_saved`, `merz_dismissed`,
`merz_pv`, `merz_gaps`, `merz_users`. Clear them to reset the demo.
