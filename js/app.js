/* =========================================================================
   Merz Product Expert — application logic (functional demo)
   Client-side single-page app. No backend: answers are resolved against the
   mock knowledge base in data.js, and state persists in localStorage.
   ========================================================================= */
(function () {
  'use strict';
  const D = window.MerzData;
  const {
    PRODUCTS, CATEGORIES, CATEGORY_QUESTIONS, KB, OBJECTIONS, OFFLABEL, PV_TERMS,
    DOCS, QUICK_ACCESS, TEAM_ASKED, DYN_CARDS, REPS, KNOWLEDGE_SIGNALS,
    COMPETITIVE, CONTENT_GAPS, ADMIN_GAPS, COMPLIANCE, ADMIN_USERS, ASSESSMENT_POOLS
  } = D;

  /* ---------------------------------------------------------------- storage */
  const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch (e) { return def; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const S = {
    view: 'home',
    cat: 'Dosing & reconstitution',
    chat: null,
    saved: load('merz_saved', []),
    dismissed: load('merz_dismissed', []),
    pv: load('merz_pv', []),
    resolvedGaps: load('merz_gaps', []),
    lib: { q: '', product: 'all', type: 'all', hcpOnly: false, quick: null },
    users: load('merz_users', null) || ADMIN_USERS.slice()
  };

  /* ---------------------------------------------------------------- helpers */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = () => document.getElementById('app');

  function toast(msg, type) {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.innerHTML = msg;
    wrap.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s, transform .3s'; t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 300); }, 2600);
  }

  function openModal(html) {
    closeModal();
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
    document.body.appendChild(ov);
    return ov;
  }
  function closeModal() { const o = document.querySelector('.overlay'); if (o) o.remove(); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  const prodDot = (p) => `<span class="d" style="background:${PRODUCTS[p].color}"></span>`;

  /* =====================================================================
     ANSWER ENGINE — resolve a free-text question to the knowledge base
     ===================================================================== */
  const STOP = new Set(['the', 'and', 'for', 'are', 'can', 'what', 'how', 'should', 'does', 'with', 'about', 'used', 'use', 'tell', 'give', 'me', 'is', 'of', 'in', 'a', 'an', 'be', 'to', 'do', 'my', 'you', 'it']);
  const tokens = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t));

  function matchEntry(text) {
    const q = text.toLowerCase().trim();
    const all = KB.concat(OBJECTIONS);
    let best = null, bestScore = 0;
    all.forEach((e) => {
      let s = 0;
      if (e.q.toLowerCase() === q) s += 100;
      (e.keywords || []).forEach((k) => { if (q.indexOf(k) !== -1) s += 12 + k.length * 0.15; });
      const qt = tokens(q), et = tokens(e.q);
      et.forEach((t) => { if (qt.indexOf(t) !== -1) s += 2.2; });
      if (s > bestScore) { bestScore = s; best = e; }
    });
    return bestScore >= 7 ? best : null;
  }

  function detectOffLabel(text) {
    const q = text.toLowerCase();
    for (const o of OFFLABEL) { if (o.match.every((m) => q.indexOf(m) !== -1)) return o; }
    return null;
  }
  function detectPV(text) {
    const q = text.toLowerCase();
    return PV_TERMS.some((t) => q.indexOf(t) !== -1);
  }

  function resolve(text, forcedEntryId) {
    let entry = null;
    if (forcedEntryId) entry = KB.concat(OBJECTIONS).find((e) => e.id === forcedEntryId) || null;
    if (!entry) entry = matchEntry(text);
    return {
      entry,
      pv: detectPV(text),
      offlabel: detectOffLabel(text),
      gap: !entry
    };
  }

  /* =====================================================================
     NAVIGATION
     ===================================================================== */
  function go(view) { S.view = view; render(); window.scrollTo(0, 0); }

  function askQuestion(text, forcedEntryId) {
    text = (text || '').trim();
    if (!text) return;
    if (!S.chat || !S.chat.turns) S.chat = { turns: [] };
    const turn = { question: text, resolved: null, mode: 'hcp', drawerOpen: false, savedKey: null };
    S.chat.turns.push(turn);
    S.view = 'chat';
    render();
    // simulate the assistant working, then reveal the grounded answer
    setTimeout(() => {
      turn.resolved = resolve(text, forcedEntryId);
      if (turn.resolved.entry && turn.resolved.entry.rep) turn.mode = 'hcp';
      render();
      const m = document.querySelector('.main'); if (m) m.scrollTop = m.scrollHeight;
    }, 750);
  }

  function newQuestion() { S.chat = null; S.view = 'home'; render(); setTimeout(() => { const i = $('#askInput'); if (i) i.focus(); }, 30); }

  /* =====================================================================
     SIDEBAR
     ===================================================================== */
  function sidebar(role, active, activeProduct) {
    const rep = {
      badge: ['KA', 'Karim', 'Sales Rep · UAE · Multi-brand'],
      nav: [['home', '&#8962;', 'Home'], ['chat', '&#128172;', 'Chat history'], ['lib', '&#9776;', 'Library']]
    };
    let navHtml = rep.nav.map((n) =>
      `<a data-action="nav" data-view="${n[0]}" class="${active === n[0] ? 'on' : ''}"><span class="ic">${n[1]}</span> ${n[2]}</a>`
    ).join('');

    let badge = rep.badge, prods = true, gate = '';
    if (role === 'mgr') {
      badge = ['BK', 'Bahaa', 'Sales Manager · UAE']; prods = false;
      gate = `<div class="gate"><a data-action="nav" data-view="mgr" class="on"><span class="ic">&#128200;</span> Team Pulse</a></div>`;
      navHtml = rep.nav.map((n) => `<a data-action="nav" data-view="${n[0]}"><span class="ic">${n[1]}</span> ${n[2]}</a>`).join('');
    } else if (role === 'adm') {
      badge = ['FJ', 'Fouad', 'Medical Affairs · Admin']; prods = false;
      gate = `<div class="gate"><a data-action="nav" data-view="mgr"><span class="ic">&#128200;</span> Team Pulse</a><a data-action="nav" data-view="adm" class="on"><span class="ic">&#9881;</span> Admin</a></div>`;
      navHtml = rep.nav.map((n) => `<a data-action="nav" data-view="${n[0]}"><span class="ic">${n[1]}</span> ${n[2]}</a>`).join('');
    }

    const prodHtml = !prods ? '' : `
      <div class="sideprods">
        <div class="h">Products</div>
        ${Object.values(PRODUCTS).map((p) =>
          `<div class="sp ${activeProduct === p.id ? 'active' : ''}" data-action="prod" data-product="${p.id}">${prodDot(p.id)}${p.name}<span class="tag2">${p.code}</span></div>`
        ).join('')}
        <div class="sidehint">Tapping a product starts a new question scoped to it.</div>
      </div>`;

    return `<aside class="side">
      <div class="logo"><span class="mark" data-action="nav" data-view="home">MERZ<br>AESTHETICS</span><span class="exp">EXPERT</span></div>
      <button class="newq" data-action="newq">+ New question</button>
      <div class="nav">${navHtml}${gate}</div>
      ${prodHtml}
      <div class="rolebadge"><div class="av">${badge[0]}</div><div><div class="nm">${badge[1]}</div><div class="rl">${badge[2]}</div></div></div>
    </aside>`;
  }

  /* =====================================================================
     HOME
     ===================================================================== */
  function viewHome() {
    const cats = CATEGORIES.map((c) => `<div class="cat ${S.cat === c ? 'sel' : ''}" data-action="cat" data-cat="${esc(c)}">${esc(c)}</div>`).join('');
    const qs = (CATEGORY_QUESTIONS[S.cat] || []).map((q) => `<span class="q" data-action="ask" data-q="${esc(q)}">${esc(q)}</span>`).join('');

    const dyn = DYN_CARDS.filter((c) => S.dismissed.indexOf(c.id) === -1).map((c) =>
      `<div class="dyn ${c.type}"><span class="tag">${c.tag}</span><span>${c.html}</span>` +
      `<span class="cta" data-action="${c.entry ? 'ask' : 'dyncard'}" ${c.entry ? `data-entry="${c.entry}" data-q="${esc('Is Radiesse suitable for patients over 65?')}"` : `data-doc="${c.doc}"`}>${c.cta} &#8250;</span>` +
      `<span class="x" data-action="dismiss" data-id="${c.id}">&#10005;</span></div>`
    ).join('');

    const asked = TEAM_ASKED.map((t) =>
      `<div class="row" data-action="ask" data-entry="${t.entry}" data-q="${esc(t.q)}"><span class="bic" style="background:${PRODUCTS[t.product].bg};color:${PRODUCTS[t.product].color}">${PRODUCTS[t.product].letter}</span>${esc(t.q)}<span class="n">${t.n} asks</span><span class="ar">&#8250;</span></div>`
    ).join('');

    const savedHtml = S.saved.length
      ? S.saved.map((s) => `<div class="s" data-action="ask" data-entry="${s.entryId}" data-q="${esc(s.q)}">${esc(s.q)} <span>&#8250;</span></div>`).join('')
      : `<div class="empty">No saved answers yet. Save an answer from any chat to pin it here.</div>`;

    const brands = Object.values(PRODUCTS).map((p) =>
      `<div class="bcard"><div class="bar" style="background:${p.color}"></div><div class="in">
        <div class="hd"><div class="ic" style="background:${p.bg};color:${p.color}">${p.letter}</div><div><div class="nm">${p.name}</div><div class="cat2">${p.cat2}</div></div></div>
        <div class="q" data-action="ask" data-q="${esc(p.spark)}">${esc(p.spark)} <span>&#8250;</span></div>
        <div class="appr">&#10003; UAE-approved · Reviewed ${p.reviewed}</div></div></div>`
    ).join('');

    return `<div class="shell">${sidebar('rep', 'home')}<main class="main">
      <div class="topbar"><div class="bell" data-action="bell">&#128276;<span class="b"></span></div></div>
      <div class="hero"><div class="date mono">FRIDAY, JULY 10</div><h1>Good morning, Karim</h1>
        <div class="sub">Ask anything about your products. Every answer comes from approved Merz sources.</div></div>
      <div class="ask"><span>&#128269;</span><input id="askInput" placeholder="Ask anything about your products..." autocomplete="off">
        <span class="kbd">&#8984;K</span><span class="mic" data-action="mic" title="Voice input">&#127908;</span><span class="go" data-action="asksend">&#10148;</span></div>
      <div class="cats">${cats}</div>
      <div style="display:flex;align-items:center;gap:10px;background:var(--red-bg);border:1px solid #EFCFC8;border-radius:12px;padding:10px 14px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:10px;font-weight:800;letter-spacing:.08em;color:var(--red)">SAFETY ACTION</span>
        <span style="font-size:12.5px;font-weight:700;color:var(--red)">&#9888; Report an adverse event or product complaint</span>
        <span style="font-size:10.5px;color:var(--ink-soft);flex:1;min-width:180px">Opens a dedicated PV flow: minimum required details, immediate routing, reference number. Do not delay formal reporting.</span>
        <span style="background:var(--red);color:#fff;border-radius:999px;padding:6px 14px;font-size:11px;font-weight:700;flex-shrink:0;cursor:pointer" data-action="pv">Start &#8250;</span></div>
      <div class="catq"><div class="h">${esc(S.cat)} · suggested questions</div>${qs}</div>
      ${dyn ? `<div class="dyncards">${dyn}</div>` : ''}
      <div class="seclbl mono">TEAM ASKED THIS WEEK</div>
      <div class="asked">${asked}</div>
      <div class="two-col">
        <div class="cont"><div class="bub">&#128172;</div><div class="tx"><div class="q">Belotero layering technique for lip definition</div><div class="meta">Belotero · last active just now</div></div><button class="go" data-action="ask" data-entry="bel-layering-lip" data-q="Belotero layering technique for lip definition">Continue</button></div>
        <div class="saved"><div class="h">&#128278; Saved answers</div>${savedHtml}</div>
      </div>
      <div class="seclbl mono">YOUR PRODUCTS <span><button class="cmpbtn" data-action="compare">&#8646; Compare vs competitor</button></span></div>
      <div class="brands">${brands}</div>
      <div class="callout"><b>Approved-sources promise:</b> every answer is grounded in the mock approved library. Reporting an adverse event opens the dedicated PV flow (minimum capture, immediate routing, reference number). Team-asked items and saved answers are live and clickable.</div>
    </main></div>`;
  }

  /* =====================================================================
     CHAT
     ===================================================================== */
  function pill(cls, html) { return `<span class="pill2 ${cls}">${html}</span>`; }

  function answerBlock(turn) {
    const r = turn.resolved;
    const p = r.entry ? PRODUCTS[r.entry.product] : null;
    const scope = r.entry ? (r.entry.scope || (p ? p.name : 'Merz')) : 'Merz products';
    const scopeColor = p ? p.color : 'var(--ink)';
    const scopeBg = p ? p.bg : '#EFEEE9';

    let out = `<div class="pillrow">
      <span class="pill2 scope" style="background:${scopeBg};color:${scopeColor}">&#9679; ${esc(scope)}</span>
      ${pill('mkt', 'UAE')}
      ${r.entry ? pill('trust', `&#10003; ${r.entry.sources.length} approved source${r.entry.sources.length > 1 ? 's' : ''} · UAE label checked`) : pill('mkt', 'No approved answer yet')}
      ${r.entry ? pill('rev', 'Source set reviewed 3 Jul 2026') : ''}
    </div>
    <div class="qtitle">${esc(turn.question)}</div>`;

    // PV overlay
    if (r.pv) {
      out += `<div class="warnband pv"><div class="wh">&#9888; Possible adverse event / product complaint</div>
        Your wording suggests a possible adverse event or product complaint. This must be reported through the dedicated pharmacovigilance flow — do not rely on a chat answer or delay formal reporting.
        <br><button class="wbtn" data-action="pv">Start adverse event report &#8250;</button></div>`;
    }
    // Off-label overlay
    if (r.offlabel) {
      out += `<div class="warnband ol"><div class="wh">&#9888; Potentially off-label</div>
        A question about <b>${esc(PRODUCTS[r.offlabel.product].name)} — ${esc(r.offlabel.area)}</b> may fall outside the locally approved indication. ${esc(r.offlabel.note)} Present only approved indications; raise to Medical Affairs if the HCP needs more.</div>`;
    }

    if (r.entry) {
      const e = r.entry;
      const useRep = turn.mode === 'rep' && e.rep;
      const content = useRep ? e.rep : e.hcp;
      const modeLabel = useRep ? 'Rep detail' : 'HCP conversation';

      out += `<div class="abox"><div class="gband"><div class="gh">${esc(modeLabel)} guidance</div><div class="lead">${content.lead}</div></div>
        <div class="disc"><span class="i">i</span><span>This is AI-generated ${useRep ? 'internal preparation' : 'conversation guidance'} based on approved Merz content. It is not an approved promotional asset and should not be forwarded as official Merz material.</span></div></div>`;

      out += `<div class="modes">
        <div class="mode ${!useRep ? 'on' : ''}" data-action="mode" data-mode="hcp">HCP conversation</div>
        <div class="mode ${useRep ? 'on' : ''}" data-action="mode" data-mode="rep">Rep detail</div></div>`;

      const pts = (content.points || []).map((pt) =>
        `<div class="pt"><span>&#8226;</span><span>${pt.text} ${pt.src ? `<sup data-action="src" data-n="${pt.src}">${pt.src}</sup>` : ''}</span></div>`
      ).join('');
      const note = content.note ? `<div class="plevel">${content.note}</div>` : '';

      out += `<div class="spbox"><div class="gh">Supporting points</div>${pts}${note}
        <div class="showsrc" data-action="drawer"><span>&#128366; ${turn.drawerOpen ? 'Hide' : 'Show'} ${e.sources.length} source${e.sources.length > 1 ? 's' : ''}</span><span class="r">Country, approval date and supporting excerpt included</span></div></div>`;

      const savedOn = S.saved.some((s) => s.entryId === e.id);
      out += `<div class="actrow">
        <div class="abtn ${savedOn ? 'on' : ''}" data-action="saveans" data-entry="${e.id}" data-q="${esc(turn.question)}">${savedOn ? '&#9733; Saved' : '&#9734; Save answer'}</div>
        <div class="abtn" data-action="fb" data-v="up">&#8593; Helpful</div>
        <div class="abtn" data-action="fb" data-v="down">&#8595; Not helpful</div>
        <div class="abtn" data-action="flag">&#9873; Flag for review</div>
        <div class="abtn ma" data-action="askma" data-q="${esc(turn.question)}">+ Ask Medical Affairs</div></div>`;

      out += `<div class="sharebox"><div class="h"><span class="t">Use or share supporting material</span><span class="restr">External sharing restricted</span></div>
        <div class="d">Generated conversation guidance cannot be sent externally as an official Merz asset. You can copy it for your own notes or share an approved source document instead.</div>
        <div class="sbtns"><span class="sb" data-action="copyguidance">Copy guidance for notes</span>
          <span class="sb green" data-action="shareapproved">Share approved source</span>
          <span class="sb via" data-action="sharechan" data-c="WhatsApp">WhatsApp<span class="vv">approved material only</span></span>
          <span class="sb via" data-action="sharechan" data-c="Email">Email<span class="vv">approved material only</span></span></div></div>`;

      out += `<div class="seclbl mono">SUGGESTED FOLLOW-UPS</div><div class="fups">${(e.followups || []).map((f) => `<div class="fup" data-action="ask" data-q="${esc(f)}">${esc(f)}</div>`).join('')}</div>`;
    } else if (!r.pv) {
      // Content gap
      out += `<div class="abox"><div class="gband" style="border-left-color:var(--amber)"><div class="gh">No approved answer yet</div>
        <div class="lead">There isn't an approved source that answers this specific question in your market. The assistant won't improvise beyond approved Merz content. You can raise it to Medical Affairs and you'll be notified when an approved answer is published.</div></div>
        <div class="disc"><span class="i">i</span><span>Raising a gap logs the exact question so Medical Affairs can write and approve a response. It appears in the manager and admin content-gap queues.</span></div></div>
        <div class="actrow"><div class="abtn ma" data-action="askma" data-q="${esc(turn.question)}">+ Ask Medical Affairs</div>
          <div class="abtn" data-action="nav" data-view="lib">&#9776; Search the Library instead</div></div>`;
    }

    return out;
  }

  function viewChat() {
    if (!S.chat || !S.chat.turns || !S.chat.turns.length) {
      return `<div class="shell">${sidebar('rep', 'chat')}<main class="main">
        <div class="chatlayout"><div class="chatmain">
          <div class="hero"><div class="date mono">CHAT</div><h1>Start a question</h1><div class="sub">Ask anything about Xeomin, Belotero, Radiesse or Ultherapy. Answers are grounded in approved sources.</div></div>
          <div class="ask"><span>&#128269;</span><input id="askInput" placeholder="Ask anything about your products..." autocomplete="off"><span class="mic" data-action="mic">&#127908;</span><span class="go" data-action="asksend">&#10148;</span></div>
          <div class="seclbl mono" style="margin-top:14px">TRY ONE OF THESE</div>
          <div class="fups">${['How should Xeomin be reconstituted?', 'What are the contraindications for Radiesse?', 'Tell me about Belotero', 'How many Ultherapy sessions are needed?'].map((q) => `<div class="fup" data-action="ask" data-q="${esc(q)}">${esc(q)}</div>`).join('')}</div>
        </div></div></main></div>`;
    }

    const turns = S.chat.turns;
    const active = turns[turns.length - 1];
    const activeProduct = active.resolved && active.resolved.entry ? active.resolved.entry.product : null;

    // history (all but last), compact
    let history = '';
    if (turns.length > 1) {
      history = '<div class="thread">' + turns.slice(0, -1).map((t) => {
        const lead = t.resolved && t.resolved.entry ? (t.mode === 'rep' && t.resolved.entry.rep ? t.resolved.entry.rep.lead : t.resolved.entry.hcp.lead) : 'Raised to Medical Affairs — no approved answer yet.';
        return `<div class="tmsg"><div class="uq"><span>${esc(t.question)}</span></div>
          <div class="abox"><div class="gband"><div class="gh">Earlier in this thread</div><div class="lead" style="font-size:13.5px">${lead}</div></div></div></div>`;
      }).join('') + '</div>';
    }

    // active turn body: thinking or answer
    let body;
    if (!active.resolved) {
      body = `<div class="qtitle">${esc(active.question)}</div>
        <div class="thinking"><div class="dots"><i></i><i></i><i></i></div> Searching approved Merz sources…</div>`;
    } else {
      body = answerBlock(active);
    }

    const drawer = (active.resolved && active.resolved.entry && active.drawerOpen)
      ? `<div class="drawer"><div class="dh"><span class="t">Approved sources</span><span class="x" data-action="drawer">&#10005;</span></div>${active.resolved.entry.sources.map((s) =>
          `<div class="dsrc" data-src="${s.n}"><div class="top"><span class="num">${s.n}</span><span class="perm ${s.perm}">${s.perm === 'hcp' ? 'HCP-SHAREABLE' : 'INTERNAL'}</span></div>
            <div class="t2">${esc(s.title)}</div><div class="meta">${esc(s.meta)}</div><div class="ex">"${esc(s.excerpt)}"</div>
            <div class="db"><span class="dbtn dark" data-action="opendoc" data-title="${esc(s.title)}" data-meta="${esc(s.meta)}" data-ex="${esc(s.excerpt)}">${esc(s.doc)}</span><span class="dbtn" data-action="ask" data-q="${esc('Tell me more about ' + s.title)}">&#128172; Ask about this</span><span class="dbtn" data-action="nav" data-view="lib">View in Library</span></div></div>`
        ).join('')}</div>`
      : '';

    return `<div class="shell">${sidebar('rep', 'chat', activeProduct)}<main class="main">
      <div class="chatlayout"><div class="chatmain">
        <button class="backbtn" data-action="newq">&#8592; New question</button>
        ${history}${body}
        <div class="ask"><input id="askInput" placeholder="Ask a follow-up${activeProduct ? ' about ' + PRODUCTS[activeProduct].name : ''}..." autocomplete="off"><span class="mic" data-action="mic">&#127908;</span><span class="go" data-action="asksend">&#10148;</span></div>
        <div style="font-size:10px;color:var(--gray);margin-top:6px">&#127908; Voice transcribes to text for your confirmation before sending.</div>
      </div>${drawer}</div></main></div>`;
  }

  /* =====================================================================
     LIBRARY
     ===================================================================== */
  const QUICK_TO_TYPE = {
    'Local product labels': 'label', 'Dosing & reconstitution': 'dosing',
    'Contraindications & safety': 'safety', 'Clinical evidence': 'evidence',
    'Objection handlers': 'objection', 'HCP-shareable materials': 'hcp'
  };

  function filterDocs() {
    const q = S.lib.q.toLowerCase().trim();
    return DOCS.filter((d) => {
      if (S.lib.product !== 'all' && d.product !== S.lib.product) return false;
      if (S.lib.hcpOnly && d.perm !== 'hcp') return false;
      if (S.lib.type !== 'all') {
        if (S.lib.type === 'hcp' && d.perm !== 'hcp') return false;
        else if (S.lib.type !== 'hcp' && d.type !== S.lib.type) return false;
      }
      if (q && (d.title + ' ' + d.meta + ' ' + PRODUCTS[d.product].name).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function docRow(d) {
    const p = PRODUCTS[d.product];
    return `<div class="docrow"><div class="ficon" style="background:${p.bg};color:${p.color}">&#128196;</div>
      <div class="g"><div class="t">${esc(d.title)} ${d.isNew ? '<span class="newb">NEW</span>' : ''} <span class="perm ${d.perm}">${d.perm === 'hcp' ? 'HCP-SHAREABLE' : 'INTERNAL'}</span></div>
        <div class="m">${esc(d.meta)}</div>${d.change ? `<div class="chg">What changed: ${esc(d.change)}</div>` : ''}</div>
      <div class="acts"><span class="abtn" data-action="opendoc" data-title="${esc(d.title)}" data-meta="${esc(d.meta)}">Open</span>
        <span class="abtn" data-action="ask" data-q="${esc('Tell me about ' + p.name)}">&#128172; Ask</span>
        <span class="abtn" data-action="bookmark" data-title="${esc(d.title)}">&#128278;</span></div></div>`;
  }

  function viewLibrary() {
    const L = S.lib;
    const recent = DOCS.filter((d) => d.isNew);
    const list = filterDocs();
    const filtered = L.q || L.product !== 'all' || L.type !== 'all' || L.hcpOnly || L.quick;

    const filterChips = `<div class="filters">
      <span class="filt ${L.product !== 'all' ? 'on' : ''}" data-action="libprod">Product: ${L.product === 'all' ? 'All' : PRODUCTS[L.product].name} &#9662;</span>
      <span class="filt">Country: UAE &#9662;</span>
      <span class="filt ${L.type !== 'all' && L.type !== 'hcp' ? 'on' : ''}" data-action="libtype">Type: ${L.type === 'all' || L.type === 'hcp' ? 'All' : L.type} &#9662;</span>
      <span class="filt ${L.hcpOnly ? 'on' : ''}" data-action="libhcp">HCP-shareable only</span>
      ${filtered ? '<span class="filt" data-action="libclear">&#10005; Clear filters</span>' : ''}</div>`;

    const qa = QUICK_ACCESS.map((q) => `<div class="qa ${L.quick === q ? 'on' : ''}" data-action="quick" data-q="${esc(q)}">${esc(q)}</div>`).join('');

    let mainList;
    if (filtered) {
      mainList = `<div class="seclbl mono">RESULTS · ${list.length} document${list.length !== 1 ? 's' : ''}</div>` +
        (list.length ? list.map(docRow).join('') : `<div class="lempty">No approved documents match these filters.<br>Try clearing filters or raising a content gap from Chat.</div>`);
    } else {
      mainList = `<div class="seclbl mono">RECENTLY UPDATED</div>${recent.map(docRow).join('')}
        <div class="lib-two">
          <div class="lpanel"><div class="h">&#128293; Frequently used by your team</div>
            ${[['xeomin', 'Xeomin reconstitution table', 'xeo-reconstitution'], ['radiesse', 'Radiesse dilution guide', 'rad-dilution'], ['belotero', 'Belotero portfolio overview', 'bel-overview'], ['ultherapy', 'Ultherapy treatment-depth reference', 'ult-overview']].map((r) =>
              `<div class="lrow" data-action="ask" data-entry="${r[2]}" data-q="${esc(r[1])}"><span class="bic" style="background:${PRODUCTS[r[0]].bg};color:${PRODUCTS[r[0]].color}">${PRODUCTS[r[0]].letter}</span>${esc(r[1])}<span class="n2">&#8250;</span></div>`
            ).join('')}</div>
          <div class="lpanel"><div class="h">&#128278; Your saved resources</div>
            <div class="lrow" data-action="opendoc" data-title="Xeomin UAE label (May 2026)" data-meta="Regulatory · Xeomin · UAE"><span class="bic" style="background:var(--xeomin-bg);color:var(--xeomin)">X</span>Xeomin UAE label (May 2026)<span class="n2">&#8250;</span></div>
            <div class="lrow" data-action="opendoc" data-title="Radiesse hands indication study" data-meta="Clinical evidence · Radiesse"><span class="bic" style="background:var(--radiesse-bg);color:var(--radiesse)">R</span>Radiesse hands indication study<span class="n2">&#8250;</span></div>
            <div class="lrow" style="color:var(--gray)">Saved answers live on Home · documents live here</div></div>
        </div>
        <div class="seclbl mono">BROWSE BY PRODUCT</div>
        <div class="lbrands">${Object.values(PRODUCTS).map((p) => {
          const cnt = DOCS.filter((d) => d.product === p.id).length;
          const nw = DOCS.filter((d) => d.product === p.id && d.isNew).length;
          return `<div class="lb" data-action="libprodset" data-product="${p.id}"><div class="bar" style="background:${p.color}"></div><div class="in">
            <div class="hd"><div class="ic" style="background:${p.bg};color:${p.color}">${p.letter}</div><div class="nm">${p.name} ${nw ? `<span class="newb">${nw} NEW</span>` : ''}</div></div>
            <div class="meta">UAE content · ${cnt} resources<br>Updated ${p.reviewed} · Local label available</div>
            <div class="view">View resources <span>&#8250;</span></div></div></div>`;
        }).join('')}</div>`;
    }

    return `<div class="shell">${sidebar('rep', 'lib')}<main class="main">
      <div class="topbar"><div class="bell" data-action="bell">&#128276;<span class="b"></span></div></div>
      <div class="hero"><div class="date mono">LIBRARY</div><h1>Approved content</h1><div class="sub">Official, current, browsable Merz material. Documents, not AI answers.</div></div>
      <div class="lsearch"><span>&#128269;</span><input id="libInput" placeholder="Search labels, clinical studies, dosing guides, safety information..." value="${esc(L.q)}" autocomplete="off"><span class="go" data-action="libsearch">&#10148;</span></div>
      ${filterChips}
      <div class="seclbl mono">QUICK ACCESS</div><div class="qacc">${qa}</div>
      ${mainList}
    </main></div>`;
  }

  /* =====================================================================
     MANAGER
     ===================================================================== */
  function certGroup(cert) { return `<span class="cg">${cert.map((c) => `<span class="c ${c[0]}">${c[1]}</span>`).join('')}</span>`; }
  function nextCell(n) { return typeof n === 'string' ? n : `<span class="st ${n.st}">${n.label}</span>`; }

  function viewManager() {
    const rows = REPS.map((r, i) =>
      `<tr data-action="rep" data-i="${i}" style="cursor:pointer"><td>${r.name}</td><td><span class="profb ${r.profile}">${r.profile === 'mb' ? 'MULTI-BRAND' : 'ULTHERAPY ONLY'}</span></td><td>${r.q30}</td><td>${r.completion}</td><td>${r.last}</td><td>${certGroup(r.cert)}</td><td>${nextCell(r.next)}</td></tr>`
    ).join('');

    const signals = KNOWLEDGE_SIGNALS.map((s) =>
      `<div class="topic"><span style="width:165px">${esc(s.topic)}${s.focus ? '<span class="focus">TRAINING FOCUS</span>' : ''}</span><div class="bar-wrap"><div class="bar-fill" style="width:${s.pct}%"></div></div><span class="n">${s.n}</span></div>` +
      (s.note ? `<div style="font-size:10.5px;color:var(--red);margin:-3px 0 9px 2px">${esc(s.note)}</div>` : '')
    ).join('');

    const gaps = CONTENT_GAPS.map((g) => `<div class="gap"><span>${esc(g.label)}</span><span class="gst ${g.st}">${g.text}</span></div>`).join('');
    const comp = COMPETITIVE.map((c) => `<div class="comp"><span>${esc(c.label)}</span><span class="n">${c.n}</span></div>`).join('');

    return `<div class="shell">${sidebar('mgr', 'mgr')}<main class="main">
      <div class="hero"><div class="date mono">TEAM PULSE · UAE · FRIDAY, JULY 10</div><h1>Team overview</h1><div class="sub">Adoption, knowledge signals, and assessment across your team.</div></div>
      <div class="filters" style="margin-bottom:11px"><span class="filt" data-action="mgrfilter" data-f="Country">Country: UAE &#9662;</span><span class="filt" data-action="mgrfilter" data-f="Profile">Profile: All &#9662;</span><span class="filt" data-action="mgrfilter" data-f="Brand">Brand: All &#9662;</span><span class="filt" data-action="mgrfilter" data-f="Time">Time: This quarter &#9662;</span></div>
      <div class="actstrip">
        <div class="act bad" data-action="mgract" data-t="inactive">&#9888; 2 reps inactive 7+ days &#8250;</div>
        <div class="act warn" data-action="mgract" data-t="due">&#9202; 2 assessments due this week &#8250;</div>
        <div class="act bad" data-action="mgract" data-t="failed">&#10007; 1 failed assessment to review &#8250;</div></div>
      <div class="stats">
        <div class="stat"><div class="lbl mono">QUESTIONS (30D)</div><div class="big">581</div><div class="sub">283 threads</div></div>
        <div class="stat"><div class="lbl mono">ACTIVE REPS</div><div class="big">15 / 17</div><div class="sub">named below</div></div>
        <div class="stat"><div class="lbl mono">ASSESSMENT COMPLETION · YTD</div><div class="big">72%</div><div class="sub">1,685 of 2,340 assigned completed · 655 pending</div></div>
        <div class="stat"><div class="lbl mono">CERTIFICATION PASS RATE</div><div class="big">11 / 17</div><div class="sub">80% required per applicable brand</div></div></div>
      <div class="panel"><h3>Reps <span class="flt" data-action="mgrfilter" data-f="Country">Country: UAE &#9662;</span></h3>
        <table><tr><th>Rep</th><th>Profile</th><th>Questions (30d)</th><th>Completion (this quarter)</th><th>Last active</th><th>Certification</th><th>Next assessment</th></tr>${rows}</table></div>
      <div class="mgr-grid">
        <div class="panel"><h3>Team knowledge signals</h3>${signals}</div>
        <div><div class="panel" style="margin-bottom:13px"><h3>Competitive pressure (30d)</h3>${comp}</div>
          <div class="panel"><h3>Content gaps (visibility)</h3>${gaps}</div></div></div>
      <div class="callout"><b>Completion vs certification:</b> completion = assigned vs completed (engagement); certification = pass rate against the 80% per-brand bar (performance). Click any rep row for detail. Action strips and filters are interactive.</div>
    </main></div>`;
  }

  /* =====================================================================
     ADMIN
     ===================================================================== */
  function viewAdmin() {
    const pools = ASSESSMENT_POOLS.map((p) =>
      `<div class="arow"><span>${esc(p.name)}</span><span><span style="color:var(--gray);font-size:11px;margin-right:8px">${p.preset} preset · ${p.ai} AI</span><button class="btn-sm" data-action="reviewpool" data-name="${esc(p.name)}">Review</button></span></div>`
    ).join('');

    const gaps = ADMIN_GAPS.map((g) => {
      const resolved = g.action === 'resolved' || S.resolvedGaps.indexOf(g.title) !== -1;
      let right;
      if (resolved) right = '<span class="gst done">RESOLVED</span>';
      else if (g.action === 'write') right = `<button class="btn-dark" data-action="writeanswer" data-title="${esc(g.title)}">Write answer</button>`;
      else right = `<button class="btn-sm" data-action="uploaddoc" data-title="${esc(g.title)}">Upload doc</button>`;
      return `<div class="arow"><span><b>${esc(g.title)}</b> · ${esc(g.meta)}</span>${right}</div>`;
    }).join('');

    const compliance = COMPLIANCE.map((c) =>
      `<div class="arow" data-action="compliance" data-text="${esc(c.text)}" data-flag="${c.flag}" style="cursor:pointer"><span>${esc(c.text)}</span><span class="flag ${c.flag}">${c.label}</span></div>`
    ).join('');

    const users = S.users.map((u, i) =>
      `<tr><td>${esc(u.name)}</td><td>${esc(u.country)}</td><td><span class="profb ${u.profile}">${u.profile === 'mb' ? 'MULTI' : 'ULT'}</span></td><td>${esc(u.completion)}</td><td>${certGroup(u.cert)}</td><td><button class="btn-sm" data-action="edituser" data-i="${i}">Edit</button></td></tr>`
    ).join('');

    return `<div class="shell">${sidebar('adm', 'adm')}<main class="main">
      <div class="hero"><div class="date mono">ADMIN · ALL COUNTRIES · FRIDAY, JULY 10</div><h1>Platform administration</h1><div class="sub">Assessment, content gaps, compliance, users, and knowledge base. Filter by country and brand everywhere.</div></div>
      <div class="pending-hero">
        <div class="ph-stat"><div class="lbl mono">ASSESSMENT COMPLETION · YTD</div><div class="big">72%</div><div class="sub">2,340 assigned · 1,685 completed · 655 pending across all users</div></div>
        <div class="ph-stat"><div class="lbl mono">CONTENT GAP QUEUE</div><div class="big">${34 - S.resolvedGaps.length}</div><div class="sub">oldest 11 days · 12 RAD · 9 XEO · 8 BEL · 5 ULT</div></div>
        <div class="ph-stat"><div class="lbl mono">USAGE SPLIT BY BRAND</div>
          <div class="usage-bar"><span style="flex:38;background:var(--radiesse)"></span><span style="flex:27;background:var(--xeomin)"></span><span style="flex:22;background:var(--belotero)"></span><span style="flex:13;background:var(--ultherapy)"></span></div>
          <div class="usage-lg"><span><span class="dot" style="background:var(--radiesse)"></span>RAD 38%</span><span><span class="dot" style="background:var(--xeomin)"></span>XEO 27%</span><span><span class="dot" style="background:var(--belotero)"></span>BEL 22%</span><span><span class="dot" style="background:var(--ultherapy)"></span>ULT 13%</span></div></div></div>
      <div class="adm-grid">
        <div class="panel"><h3>Assessment manager <span class="flt">80% pass per brand · quarterly</span></h3>
          <div class="arow"><span><b>Multi-brand profile</b> · 50 Q/quarter · 20 RAD / 15 XEO / 15 BEL</span><span class="profb mb">14 USERS</span></div>
          <div class="arow"><span><b>Ultherapy-only profile</b> · 50 Q/quarter · all Ultherapy</span><span class="profb uo">3 USERS</span></div>
          ${pools}
          <div class="arow"><span>12 AI-generated draft questions</span><button class="btn-dark" data-action="reviewdrafts">Review 12 drafts</button></div></div>
        <div class="panel"><h3>Content gap queue <span class="flt">Brand: All &#9662;</span></h3>${gaps}
          <div class="arow"><span style="color:var(--gray);font-size:11px">Resolving a gap re-runs the original questions, then notifies every rep who asked. Separate metric from assessment completion.</span></div></div>
        <div class="panel"><h3>Compliance flags <span class="flt">Per brand &#9662;</span></h3>${compliance}</div>
        <div class="panel"><h3>Users <span class="flt">Country: All &#9662;</span></h3>
          <table><tr><th>User</th><th>Country</th><th>Profile</th><th>Completion (quarter)</th><th>Certification</th><th></th></tr>${users}</table>
          <div style="margin-top:10px"><button class="btn-dark" data-action="adduser">+ Add user</button></div></div></div>
      <div class="callout"><b>Admin v5:</b> completion (engagement) separated from certification (performance). Draft questions go through Review, never bulk approval. Write an answer to resolve a content gap and watch the queue count drop. Add or edit users live.</div>
    </main></div>`;
  }

  /* =====================================================================
     MODALS / FLOWS
     ===================================================================== */
  function pvFlow() {
    openModal(`<div class="mhd"><div><div class="mt">&#9888; Report an adverse event or product complaint</div><div class="msub">Pharmacovigilance flow · routed immediately</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody">
        <div class="mbanner red">This report is routed to Pharmacovigilance immediately. Provide the minimum required details below. <b>Do not delay formal reporting</b> — this does not replace your local PV obligations.</div>
        <div class="merr" id="pvErr">Please complete the required fields marked with *.</div>
        <div class="fld"><label>Product involved <span class="req">*</span></label>
          <select id="pvProduct"><option value="">Select a product…</option>${Object.values(PRODUCTS).map((p) => `<option>${p.name}</option>`).join('')}<option>Other / not sure</option></select></div>
        <div class="mrow">
          <div class="fld"><label>Event type <span class="req">*</span></label><select id="pvType"><option value="">Select…</option><option>Adverse event (patient reaction)</option><option>Product quality complaint</option><option>Both</option></select></div>
          <div class="fld"><label>Approximate onset</label><input id="pvOnset" placeholder="e.g. 3 weeks after treatment"></div></div>
        <div class="fld"><label>Brief description <span class="req">*</span></label><textarea id="pvDesc" placeholder="What happened? Include what was observed and any action taken. Do not include patient-identifying information."></textarea>
          <div class="hint">Minimum capture only. A PV specialist will follow up for full case details.</div></div>
        <div class="fld"><label>Your contact for follow-up <span class="req">*</span></label><input id="pvContact" placeholder="Email or phone" value="anubhav@allysai.com"></div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn danger" data-action="pvsubmit">Submit report</button></div>
      </div>`);
  }

  function pvSubmit() {
    const v = (id) => (document.getElementById(id) || {}).value || '';
    if (!v('pvProduct') || !v('pvType') || !v('pvDesc').trim() || !v('pvContact').trim()) {
      const e = document.getElementById('pvErr'); if (e) e.classList.add('show'); return;
    }
    const ref = 'PV-2026-' + Math.floor(100000 + Math.random() * 899999);
    const rec = { ref, product: v('pvProduct'), type: v('pvType'), when: new Date().toISOString() };
    S.pv.unshift(rec); save('merz_pv', S.pv);
    openModal(`<div class="mhd"><div><div class="mt">&#10003; Report submitted</div><div class="msub">Routed to Pharmacovigilance</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody"><div class="refbox"><div class="mono" style="color:var(--gray)">REFERENCE NUMBER</div><div class="rn">${ref}</div><div style="font-size:11.5px;color:var(--ink-soft)">Keep this reference for your records.</div></div>
        <ul class="mlist">
          <li><span class="ck">&#10003;</span> Routed to the Pharmacovigilance team immediately.</li>
          <li><span class="ck">&#10003;</span> A PV specialist will contact you at <b>${esc(v('pvContact'))}</b> for full case details.</li>
          <li><span class="ck">&#10003;</span> Logged against <b>${esc(v('pvProduct'))}</b> and visible in the admin compliance queue.</li>
        </ul>
        <div class="mbanner blue" style="margin-top:14px">Reminder: this in-app report does not replace your local regulatory reporting obligations.</div>
        <div class="mactions"><button class="mbtn primary" data-action="close">Done</button></div></div>`);
    toast('Adverse event report ' + ref + ' routed to PV', 'bad');
  }

  function askMA(q) {
    openModal(`<div class="mhd"><div><div class="mt">Ask Medical Affairs</div><div class="msub">Raise this question for an approved written answer</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody"><div class="fld"><label>Your question</label><textarea id="maQ">${esc(q || '')}</textarea></div>
        <div class="fld"><label>Why you need it (optional)</label><input id="maWhy" placeholder="e.g. HCP asked in clinic, no approved source found"></div>
        <div class="mbanner blue">This logs the exact question in the Medical Affairs content-gap queue. Every rep who asked the same thing is notified when an approved answer is published.</div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn primary" data-action="masubmit">Send to Medical Affairs</button></div></div>`);
  }
  function maSubmit() {
    closeModal();
    toast('&#10003; Sent to Medical Affairs · added to the content-gap queue', 'good');
  }

  function openDoc(title, meta, ex) {
    openModal(`<div class="mhd"><div><div class="mt">${esc(title)}</div><div class="msub">${esc(meta || 'Approved Merz source')}</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody"><div class="mbanner green">&#10003; Approved source · current version. This is a demo document viewer.</div>
        ${ex ? `<div style="font-size:13px;line-height:1.65;border-left:3px solid var(--line);padding:4px 0 4px 14px;margin-bottom:14px;color:var(--ink-soft)">"${esc(ex)}"</div>` : ''}
        <p style="font-size:13px;line-height:1.7;color:var(--ink-soft)">In the production build this opens the full approved PDF/label with page anchoring to the cited excerpt, permission-aware sharing, and version history. Content shown here is fictional demo data.</p>
        <div class="mactions"><button class="mbtn" data-action="bookmark" data-title="${esc(title)}">&#128278; Bookmark</button><button class="mbtn primary" data-action="close">Close</button></div></div>`);
  }

  function repDetail(i) {
    const r = REPS[i];
    openModal(`<div class="mhd"><div><div class="mt">${esc(r.name)}</div><div class="msub">${r.profile === 'mb' ? 'Multi-brand' : 'Ultherapy-only'} · ${esc(r.country)}</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody">
        <div class="stats" style="margin-bottom:14px"><div class="stat"><div class="lbl mono">QUESTIONS · 30D</div><div class="big">${r.q30}</div></div>
          <div class="stat"><div class="lbl mono">COMPLETION</div><div class="big" style="font-size:15px;font-weight:700;padding-top:5px">${esc(r.completion)}</div></div>
          <div class="stat"><div class="lbl mono">LAST ACTIVE</div><div class="big" style="font-size:15px;font-weight:700;padding-top:5px">${esc(r.last)}</div></div></div>
        <div class="fld"><label>Certification by brand</label><div>${certGroup(r.cert)} &nbsp; <span style="font-size:11.5px;color:var(--gray)">P = passed · F = failed · — = not assessed</span></div></div>
        <div class="fld"><label>Next assessment</label><div>${nextCell(r.next)}</div></div>
        <div class="mactions"><button class="mbtn" data-action="close">Close</button><button class="mbtn primary" data-action="nudge" data-name="${esc(r.name)}">Send reminder</button></div></div>`);
  }

  function writeAnswer(title) {
    openModal(`<div class="mhd"><div><div class="mt">Write approved answer</div><div class="msub">${esc(title)}</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody"><div class="mbanner blue">Publishing re-runs the original questions and notifies every rep who asked. This resolves the content gap.</div>
        <div class="fld"><label>Approved answer <span class="req">*</span></label><textarea id="waText" placeholder="Write the approved, source-backed answer…"></textarea></div>
        <div class="mrow"><div class="fld"><label>Source document</label><input id="waSrc" placeholder="e.g. Xeomin UAE PI · Page 8"></div>
          <div class="fld"><label>Effective market</label><select><option>UAE</option><option>KSA</option><option>MENA</option></select></div></div>
        <div class="merr" id="waErr">Please write the approved answer before publishing.</div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn primary" data-action="wapublish" data-title="${esc(title)}">Publish &amp; notify reps</button></div></div>`);
  }
  function waPublish(title) {
    const t = (document.getElementById('waText') || {}).value || '';
    if (!t.trim()) { const e = document.getElementById('waErr'); if (e) e.classList.add('show'); return; }
    if (S.resolvedGaps.indexOf(title) === -1) S.resolvedGaps.push(title);
    save('merz_gaps', S.resolvedGaps);
    closeModal();
    toast('&#10003; Answer published · reps who asked have been notified', 'good');
    render();
  }

  function addUser() {
    openModal(`<div class="mhd"><div><div class="mt">Add user</div><div class="msub">Create a rep account with a profile</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody"><div class="mrow"><div class="fld"><label>Name <span class="req">*</span></label><input id="auName" placeholder="Full name"></div>
        <div class="fld"><label>Country</label><select id="auCountry"><option>UAE</option><option>KSA</option><option>Kuwait</option><option>Qatar</option></select></div></div>
        <div class="fld"><label>Profile</label><select id="auProfile"><option value="mb">Multi-brand</option><option value="uo">Ultherapy-only</option></select></div>
        <div class="merr" id="auErr">Please enter a name.</div>
        <div class="mbanner blue">New users start with a baseline assessment assigned. Permissions are separate sets (content review, PV, assessment admin, user admin, KB admin) and combined per person.</div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn primary" data-action="ausave">Create user</button></div></div>`);
  }
  function auSave() {
    const name = (document.getElementById('auName') || {}).value || '';
    if (!name.trim()) { const e = document.getElementById('auErr'); if (e) e.classList.add('show'); return; }
    const profile = (document.getElementById('auProfile') || {}).value || 'mb';
    const country = (document.getElementById('auCountry') || {}).value || 'UAE';
    S.users.push({ name: name.trim(), country, profile, completion: '0 of 10 assigned', cert: profile === 'mb' ? [['n', 'R'], ['n', 'X'], ['n', 'B']] : [['n', 'U']] });
    save('merz_users', S.users);
    closeModal(); toast('&#10003; User created · baseline assessment assigned', 'good'); render();
  }

  function editUser(i) {
    const u = S.users[i];
    openModal(`<div class="mhd"><div><div class="mt">Edit user</div><div class="msub">${esc(u.name)}</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody"><div class="mrow"><div class="fld"><label>Country</label><select id="euCountry"><option ${u.country === 'UAE' ? 'selected' : ''}>UAE</option><option ${u.country === 'KSA' ? 'selected' : ''}>KSA</option><option ${u.country === 'Kuwait' ? 'selected' : ''}>Kuwait</option><option ${u.country === 'Qatar' ? 'selected' : ''}>Qatar</option></select></div>
        <div class="fld"><label>Profile</label><select id="euProfile"><option value="mb" ${u.profile === 'mb' ? 'selected' : ''}>Multi-brand</option><option value="uo" ${u.profile === 'uo' ? 'selected' : ''}>Ultherapy-only</option></select></div></div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn primary" data-action="eusave" data-i="${i}">Save changes</button></div></div>`);
  }
  function euSave(i) {
    const u = S.users[i];
    u.country = (document.getElementById('euCountry') || {}).value || u.country;
    u.profile = (document.getElementById('euProfile') || {}).value || u.profile;
    save('merz_users', S.users);
    closeModal(); toast('&#10003; Changes saved for ' + esc(u.name), 'good'); render();
  }

  function reviewDrafts() {
    const drafts = [
      ['Radiesse', 'Which contraindication applies to active skin infection at the treatment site?', 'Medium'],
      ['Xeomin', 'What diluent is used to reconstitute Xeomin?', 'Easy'],
      ['Belotero', 'Belotero Soft is intended for which line depth?', 'Easy'],
      ['Ultherapy', 'Ultherapy delivers which type of energy?', 'Medium']
    ];
    openModal(`<div class="mhd"><div><div class="mt">Review AI-generated draft questions</div><div class="msub">12 drafts · each reviewed with source, correct answer, difficulty</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody"><div class="mbanner blue">Drafts are reviewed one by one, never bulk-approved. Approving adds the question to the brand pool.</div>
        ${drafts.map((d, i) => `<div class="arow"><span><span class="profb mb" style="margin-right:6px">${d[0].toUpperCase()}</span>${esc(d[1])} <span style="color:var(--gray);font-size:10.5px">· ${d[2]}</span></span><span><button class="btn-sm" data-action="draftrej" data-i="${i}">Reject</button> <button class="btn-dark" data-action="draftapp" data-i="${i}">Approve</button></span></div>`).join('')}
        <div style="font-size:11px;color:var(--gray);margin-top:8px">Showing 4 of 12 · demo</div>
        <div class="mactions"><button class="mbtn primary" data-action="close">Close</button></div></div>`);
  }

  function compliance(text, flag) {
    const isPv = flag === 'pv';
    openModal(`<div class="mhd"><div><div class="mt">${isPv ? 'Pharmacovigilance flag' : 'Off-label flag'}</div><div class="msub">Compliance review</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody"><div class="mbanner ${isPv ? 'red' : 'blue'}" style="${isPv ? '' : 'background:var(--amber-bg);border-color:#EBD9B4;color:var(--amber)'}">Flagged query: <b>${esc(text)}</b></div>
        <p style="font-size:13px;line-height:1.7;color:var(--ink-soft)">${isPv
          ? 'A possible adverse event was detected in a rep query and auto-routed to Pharmacovigilance within 24 hours. The rep was directed to the dedicated PV reporting flow. Review the routed case and confirm follow-up.'
          : 'A potentially off-label question was detected. The assistant returned only approved indications and surfaced an off-label caution. No off-label claim was generated. Confirm whether an approved boundary message is sufficient or MA follow-up is needed.'}</p>
        <div class="mactions"><button class="mbtn" data-action="close">Close</button><button class="mbtn primary" data-action="close">Mark reviewed</button></div></div>`);
  }

  function compareModal() {
    openModal(`<div class="mhd"><div><div class="mt">Compare vs competitor</div><div class="msub">Approved claims only</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody"><div class="mbanner blue">Comparisons use only claims that appear in approved Merz materials. The assistant will not generate head-to-head claims that aren't approved.</div>
        <div class="fld"><label>Pick a comparison</label></div>
        <div class="fups">${['Xeomin vs other neurotoxins', 'Radiesse vs other biostimulators', 'Ultherapy vs RF devices'].map((q) => `<div class="fup" data-action="askclose" data-q="${esc(q)}">${esc(q)}</div>`).join('')}</div>
        <div class="mactions" style="margin-top:14px"><button class="mbtn" data-action="close">Cancel</button></div></div>`);
  }

  function notifications() {
    openModal(`<div class="mhd"><div><div class="mt">Notifications</div><div class="msub">Updates for you</div></div><button class="x" data-action="close">&times;</button></div>
      <div class="mbody"><ul class="mlist">
        <li><span class="ck">&#10003;</span> Your question <b>Radiesse in patients over 65</b> has an approved answer.</li>
        <li><span class="ck">&#9873;</span> <b>Belotero Balance PI</b> updated — approved treatment-area wording revised.</li>
        <li><span class="ck">&#128276;</span> Assessment reminder: next certification window opens soon.</li>
      </ul><div class="mactions"><button class="mbtn primary" data-action="close">Close</button></div></div>`);
  }

  /* =====================================================================
     ACTIONS DISPATCH
     ===================================================================== */
  const ACTIONS = {
    nav: (d) => go(d.view),
    newq: () => newQuestion(),
    cat: (d) => { S.cat = d.cat; render(); },
    ask: (d) => askQuestion(d.q || (d.entry && (KB.concat(OBJECTIONS).find((e) => e.id === d.entry) || {}).q), d.entry),
    askclose: (d) => { closeModal(); askQuestion(d.q); },
    asksend: () => { const i = $('#askInput'); if (i) askQuestion(i.value); },
    prod: (d) => askQuestion('Tell me about ' + PRODUCTS[d.product].name),
    dismiss: (d) => { if (S.dismissed.indexOf(d.id) === -1) S.dismissed.push(d.id); save('merz_dismissed', S.dismissed); render(); },
    dyncard: (d) => { go('lib'); toast('Opened the updated document in the Library', 'good'); },
    bell: () => notifications(),
    pv: () => pvFlow(),
    pvsubmit: () => pvSubmit(),
    mic: (ev, el) => {
      el.classList.add('rec');
      toast('&#127908; Listening… (demo) transcribing to text', 'warn');
      setTimeout(() => { el.classList.remove('rec'); const i = $('#askInput'); if (i) { i.value = 'How should Xeomin be reconstituted?'; i.focus(); } toast('Transcribed — review, then send', 'good'); }, 1400);
    },
    compare: () => compareModal(),
    // chat
    mode: (d) => { const t = S.chat.turns[S.chat.turns.length - 1]; t.mode = d.mode; render(); },
    drawer: () => { const t = S.chat.turns[S.chat.turns.length - 1]; t.drawerOpen = !t.drawerOpen; render(); },
    src: (d) => { const t = S.chat.turns[S.chat.turns.length - 1]; t.drawerOpen = true; render(); setTimeout(() => { const el = document.querySelector(`.dsrc[data-src="${d.n}"]`); if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 60); },
    saveans: (d) => {
      const idx = S.saved.findIndex((s) => s.entryId === d.entry);
      if (idx === -1) { S.saved.unshift({ entryId: d.entry, q: d.q }); toast('&#9733; Saved to Home', 'good'); }
      else { S.saved.splice(idx, 1); toast('Removed from saved', 'warn'); }
      save('merz_saved', S.saved); render();
    },
    fb: (d) => toast(d.v === 'up' ? '&#10003; Thanks — marked helpful' : 'Noted — flagged as not helpful for review', d.v === 'up' ? 'good' : 'warn'),
    flag: () => toast('&#9873; Flagged for Medical Affairs review', 'warn'),
    askma: (d) => askMA(d.q),
    masubmit: () => maSubmit(),
    copyguidance: () => {
      const t = S.chat.turns[S.chat.turns.length - 1];
      const e = t.resolved && t.resolved.entry;
      const text = e ? (t.mode === 'rep' && e.rep ? e.rep.lead : e.hcp.lead) : '';
      if (navigator.clipboard && text) navigator.clipboard.writeText(text).catch(() => {});
      toast('Copied guidance for your notes (not an approved asset)', 'good');
    },
    shareapproved: () => { const t = S.chat.turns[S.chat.turns.length - 1]; t.drawerOpen = true; render(); toast('Pick an HCP-shareable source to share', 'good'); },
    sharechan: (d) => toast(esc(d.c) + ': approved material only — pick an HCP-shareable source', 'warn'),
    opendoc: (d) => openDoc(d.title, d.meta, d.ex),
    // library
    libsearch: () => { const i = $('#libInput'); if (i) { S.lib.q = i.value; render(); } },
    libprod: () => {
      const order = ['all'].concat(Object.keys(PRODUCTS));
      S.lib.product = order[(order.indexOf(S.lib.product) + 1) % order.length]; render();
    },
    libprodset: (d) => { S.lib.product = d.product; S.lib.quick = null; render(); },
    libtype: () => {
      const order = ['all', 'label', 'dosing', 'safety', 'evidence', 'objection'];
      S.lib.type = order[(order.indexOf(S.lib.type) + 1) % order.length]; S.lib.quick = null; render();
    },
    libhcp: () => { S.lib.hcpOnly = !S.lib.hcpOnly; render(); },
    libclear: () => { S.lib = { q: '', product: 'all', type: 'all', hcpOnly: false, quick: null }; render(); },
    quick: (d) => { S.lib.quick = S.lib.quick === d.q ? null : d.q; S.lib.type = S.lib.quick ? (QUICK_TO_TYPE[d.q] || 'all') : 'all'; render(); },
    bookmark: (d) => toast('&#128278; Bookmarked: ' + esc(d.title), 'good'),
    // manager
    rep: (d) => repDetail(+d.i),
    mgract: (d) => {
      const msg = { inactive: 'Lina K. and Yousef R. flagged inactive — reminders can be sent', due: 'Omar H. (Jul 12) and Sara M. (Jul 14) due this week', failed: 'Sara M. failed Xeomin certification — retake scheduled Jul 14' }[d.t];
      toast(msg, 'warn');
    },
    mgrfilter: (d) => toast('Filter: ' + esc(d.f) + ' — applies to the whole page (demo)', 'good'),
    nudge: (d) => { closeModal(); toast('&#10003; Reminder sent to ' + esc(d.name), 'good'); },
    // admin
    reviewpool: (d) => toast('Opening ' + esc(d.name) + ' — preset & AI questions with sources (demo)', 'good'),
    reviewdrafts: () => reviewDrafts(),
    draftapp: (d) => toast('&#10003; Draft approved and added to the brand pool', 'good'),
    draftrej: (d) => toast('Draft rejected', 'warn'),
    writeanswer: (d) => writeAnswer(d.title),
    wapublish: (d) => waPublish(d.title),
    uploaddoc: (d) => toast('Upload flow for: ' + esc(d.title) + ' (demo)', 'good'),
    compliance: (d) => compliance(d.text, d.flag),
    adduser: () => addUser(),
    ausave: () => auSave(),
    edituser: (d) => editUser(+d.i),
    eusave: (d) => euSave(+d.i),
    close: () => closeModal()
  };

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el) return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) { ev.preventDefault(); fn(el.dataset, el, ev); }
  });

  // Enter key on inputs
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    if (ev.target.id === 'askInput') { ev.preventDefault(); askQuestion(ev.target.value); }
    if (ev.target.id === 'libInput') { ev.preventDefault(); S.lib.q = ev.target.value; render(); }
  });

  // top switcher
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('.tab[data-view]');
    if (!t) return;
    if (t.dataset.view === 'chat') { /* keep existing chat */ }
    go(t.dataset.view);
  });

  /* =====================================================================
     RENDER
     ===================================================================== */
  function render() {
    const views = { home: viewHome, chat: viewChat, lib: viewLibrary, mgr: viewManager, adm: viewAdmin };
    app().innerHTML = (views[S.view] || viewHome)();
    // sync top switcher active state
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === S.view));
    // preserve focus on library input when typing-search
    if (S.view === 'lib') { const i = $('#libInput'); if (i && S.lib.q) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }

  render();
})();
