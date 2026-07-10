/* =========================================================================
   Merz Product Expert — application logic (functional demo)
   Full-screen SPA. Monochrome light/dark theme, Lucide icons, persona switch.
   Answers resolve against the mock knowledge base in data.js; state persists
   in localStorage. No backend.
   ========================================================================= */
(function () {
  'use strict';
  const D = window.MerzData;
  const ic = (n, s) => window.MerzIcons.icon(n, { size: s || 18 });
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
    theme: document.documentElement.getAttribute('data-theme') || 'light',
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
  const dot = (color, sz) => `<span style="width:${sz || 8}px;height:${sz || 8}px;border-radius:3px;background:${color};flex-shrink:0;display:inline-block"></span>`;

  function toast(msg, type) {
    const iconName = { good: 'checkCircle', warn: 'alertTriangle', bad: 'shieldAlert' }[type] || 'info';
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = ic(iconName, 16) + '<span>' + msg + '</span>';
    wrap.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s, transform .3s'; t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 300); }, 2600);
  }

  function openModal(html, wide) {
    closeModal();
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
    document.body.appendChild(ov);
    return ov;
  }
  function closeModal() { const o = document.querySelector('.overlay'); if (o) o.remove(); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  const prodDot = (p) => dot(PRODUCTS[p].color, 9);

  function toggleTheme() {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', S.theme);
    try { localStorage.setItem('merz_theme', S.theme); } catch (e) {}
    render();
  }

  /* =====================================================================
     ANSWER ENGINE
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
  const detectPV = (text) => { const q = text.toLowerCase(); return PV_TERMS.some((t) => q.indexOf(t) !== -1); };

  function resolve(text, forcedEntryId) {
    let entry = null;
    if (forcedEntryId) entry = KB.concat(OBJECTIONS).find((e) => e.id === forcedEntryId) || null;
    if (!entry) entry = matchEntry(text);
    return { entry, pv: detectPV(text), offlabel: detectOffLabel(text), gap: !entry };
  }

  /* =====================================================================
     NAVIGATION
     ===================================================================== */
  function go(view) { S.view = view; render(); window.scrollTo(0, 0); const m = $('.main'); if (m) m.scrollTop = 0; }

  function askQuestion(text, forcedEntryId) {
    text = (text || '').trim();
    if (!text) return;
    if (!S.chat || !S.chat.turns) S.chat = { turns: [] };
    const turn = { question: text, resolved: null, mode: 'hcp', drawerOpen: false };
    S.chat.turns.push(turn);
    S.view = 'chat';
    render();
    setTimeout(() => {
      turn.resolved = resolve(text, forcedEntryId);
      render();
      const m = $('.main'); if (m) m.scrollTop = m.scrollHeight;
    }, 750);
  }
  function newQuestion() { S.chat = null; S.view = 'home'; render(); setTimeout(() => { const i = $('#askInput'); if (i) i.focus(); }, 30); }

  const roleOfView = (v) => (v === 'mgr' ? 'mgr' : v === 'adm' ? 'adm' : 'rep');

  /* =====================================================================
     SHELL: sidebar + appbar
     ===================================================================== */
  function sidebar(role, active, activeProduct) {
    const repNav = [['home', 'home', 'Home'], ['chat', 'chat', 'Chat history'], ['lib', 'library', 'Library']];
    let badge = ['KA', 'Karim', 'Sales Rep · UAE · Multi-brand'], showProds = true, gate = '';
    if (role === 'mgr') { badge = ['BK', 'Bahaa', 'Sales Manager · UAE']; showProds = false; gate = `<div class="gate"><a data-action="nav" data-view="mgr" class="on"><span class="ic">${ic('barChart', 17)}</span> Team Pulse</a></div>`; }
    else if (role === 'adm') { badge = ['FJ', 'Fouad', 'Medical Affairs · Admin']; showProds = false; gate = `<div class="gate"><a data-action="nav" data-view="mgr"><span class="ic">${ic('barChart', 17)}</span> Team Pulse</a><a data-action="nav" data-view="adm" class="on"><span class="ic">${ic('settings', 17)}</span> Admin</a></div>`; }

    const navHtml = repNav.map((n) =>
      `<a data-action="nav" data-view="${n[0]}" class="${active === n[0] ? 'on' : ''}"><span class="ic">${ic(n[1], 17)}</span> ${n[2]}</a>`
    ).join('');

    const prodHtml = !showProds ? '' : `
      <div class="sideprods"><div class="h">Products</div>
        ${Object.values(PRODUCTS).map((p) =>
          `<div class="sp ${activeProduct === p.id ? 'active' : ''}" data-action="prod" data-product="${p.id}">${prodDot(p.id)}${p.name}<span class="tag2">${p.code}</span></div>`
        ).join('')}
        <div class="sidehint">Tapping a product starts a new question scoped to it.</div></div>`;

    return `<aside class="side">
      <div class="logo"><div class="wordmark" data-action="nav" data-view="home"><span class="l1">MERZ</span><span class="l2">AESTHETICS<span class="reg">&reg;</span></span></div><span class="exp">EXPERT</span></div>
      <button class="newq" data-action="newq">${ic('plus', 16)} New question</button>
      <div class="nav">${navHtml}${gate}</div>
      ${prodHtml}
      <div class="rolebadge"><div class="av">${badge[0]}</div><div><div class="nm">${badge[1]}</div><div class="rl">${badge[2]}</div></div></div>
    </aside>`;
  }

  function appbar(role) {
    const seg = [['rep', 'users', 'Rep'], ['mgr', 'barChart', 'Manager'], ['adm', 'settings', 'Admin']];
    return `<header class="appbar">
      <div class="persona">${seg.map((s) => `<button class="pbtn ${role === s[0] ? 'on' : ''}" data-action="persona" data-p="${s[0]}">${ic(s[1], 16)}<span>${s[2]}</span></button>`).join('')}</div>
      <div class="appbar-right">
        <span class="appbar-env">UAE · Pilot</span>
        <button class="tbtn" data-action="theme" title="Toggle light / dark">${ic(S.theme === 'dark' ? 'sun' : 'moon', 18)}</button>
        <button class="tbtn" data-action="bell" title="Notifications">${ic('bell', 18)}<span class="b"></span></button>
      </div></header>`;
  }

  /* =====================================================================
     HOME
     ===================================================================== */
  function viewHome() {
    const cats = CATEGORIES.map((c) => `<div class="cat ${S.cat === c ? 'sel' : ''}" data-action="cat" data-cat="${esc(c)}">${esc(c)}</div>`).join('');
    const qs = (CATEGORY_QUESTIONS[S.cat] || []).map((q) => `<span class="q" data-action="ask" data-q="${esc(q)}">${esc(q)}</span>`).join('');

    const dyn = DYN_CARDS.filter((c) => S.dismissed.indexOf(c.id) === -1).map((c) =>
      `<div class="dyn ${c.type}"><span class="tag">${ic(c.type === 'answer' ? 'checkCircle' : 'sparkles', 12)} ${c.tag}</span><span>${c.html}</span>` +
      `<span class="cta" data-action="${c.entry ? 'ask' : 'dyncard'}" ${c.entry ? `data-entry="${c.entry}" data-q="${esc('Is Radiesse suitable for patients over 65?')}"` : `data-doc="${c.doc}"`}>${c.cta} ${ic('chevronRight', 14)}</span>` +
      `<span class="x" data-action="dismiss" data-id="${c.id}">${ic('x', 14)}</span></div>`
    ).join('');

    const asked = TEAM_ASKED.map((t) =>
      `<div class="row" data-action="ask" data-entry="${t.entry}" data-q="${esc(t.q)}"><span class="bic" style="background:${PRODUCTS[t.product].bg};color:${PRODUCTS[t.product].color}">${PRODUCTS[t.product].letter}</span>${esc(t.q)}<span class="n">${t.n} asks</span><span class="ar">${ic('chevronRight', 16)}</span></div>`
    ).join('');

    const savedHtml = S.saved.length
      ? S.saved.map((s) => `<div class="s" data-action="ask" data-entry="${s.entryId}" data-q="${esc(s.q)}"><span>${esc(s.q)}</span> ${ic('chevronRight', 15)}</div>`).join('')
      : `<div class="empty">No saved answers yet. Save an answer from any chat to pin it here.</div>`;

    const brands = Object.values(PRODUCTS).map((p) =>
      `<div class="bcard"><div class="bar" style="background:${p.color}"></div><div class="in">
        <div class="hd"><div class="ic" style="background:${p.bg};color:${p.color}">${p.letter}</div><div><div class="nm">${p.name}</div><div class="cat2">${p.cat2}</div></div></div>
        <div class="q" data-action="ask" data-q="${esc(p.spark)}">${esc(p.spark)} ${ic('chevronRight', 15)}</div>
        <div class="appr">${ic('check', 13)} UAE-approved · Reviewed ${p.reviewed}</div></div></div>`
    ).join('');

    return `
      <div class="hero"><div class="date mono">FRIDAY, JULY 10</div><h1>Good morning, Karim</h1>
        <div class="sub">Ask anything about your products. Every answer comes from approved Merz sources.</div></div>
      <div class="ask">${ic('search', 18)}<input id="askInput" placeholder="Ask anything about your products..." autocomplete="off">
        <span class="kbd">&#8984;K</span><span class="mic" data-action="mic" title="Voice input">${ic('mic', 18)}</span><span class="go" data-action="asksend">${ic('send', 18)}</span></div>
      <div class="cats">${cats}</div>
      <div class="safety">
        <span class="sa-tag">${ic('shieldAlert', 14)} SAFETY ACTION</span>
        <span class="sa-main">Report an adverse event or product complaint</span>
        <span class="sa-sub">Opens a dedicated PV flow: minimum required details, immediate routing, reference number. Do not delay formal reporting.</span>
        <button class="sa-btn" data-action="pv">Start ${ic('chevronRight', 15)}</button></div>
      <div class="catq"><div class="h">${esc(S.cat)} · suggested questions</div>${qs}</div>
      ${dyn ? `<div class="dyncards">${dyn}</div>` : ''}
      <div class="seclbl mono">TEAM ASKED THIS WEEK</div>
      <div class="asked">${asked}</div>
      <div class="two-col">
        <div class="cont"><div class="bub">${ic('messageSquare', 18)}</div><div class="tx"><div class="q">Belotero layering technique for lip definition</div><div class="meta">Belotero · last active just now</div></div><button class="go" data-action="ask" data-entry="bel-layering-lip" data-q="Belotero layering technique for lip definition">Continue</button></div>
        <div class="saved"><div class="h">${ic('bookmark', 15)} Saved answers</div>${savedHtml}</div></div>
      <div class="seclbl mono">YOUR PRODUCTS <span><button class="cmpbtn" data-action="compare">${ic('compare', 15)} Compare vs competitor</button></span></div>
      <div class="brands">${brands}</div>
      <div class="callout"><b>Approved-sources promise:</b> every answer is grounded in the approved library — no document upload anywhere. Reporting an adverse event opens the dedicated PV flow (minimum capture, immediate routing, reference number). Team-asked items are filtered by profile, country and approved-answer status.</div>`;
  }

  /* =====================================================================
     CHAT
     ===================================================================== */
  const pill = (cls, html) => `<span class="pill2 ${cls}">${html}</span>`;

  function answerBlock(turn) {
    const r = turn.resolved;
    const p = r.entry ? PRODUCTS[r.entry.product] : null;
    const scope = r.entry ? (r.entry.scope || (p ? p.name : 'Merz')) : 'Merz products';
    const scopeColor = p ? p.color : 'var(--ink)';

    let out = `<div class="pillrow">
      <span class="pill2 scope">${dot(scopeColor, 8)} ${esc(scope)}</span>
      ${pill('mkt', 'UAE')}
      ${r.entry ? pill('trust', `${ic('check', 13)} ${r.entry.sources.length} approved source${r.entry.sources.length > 1 ? 's' : ''} · UAE label checked`) : pill('mkt', 'No approved answer yet')}
      ${r.entry ? pill('rev', `${ic('clock', 12)} Source set reviewed 3 Jul 2026`) : ''}
    </div>
    <div class="qtitle">${esc(turn.question)}</div>`;

    if (r.pv) {
      out += `<div class="warnband pv"><div class="wh">${ic('shieldAlert', 14)} Possible adverse event / product complaint</div>
        Your wording suggests a possible adverse event or product complaint. This must be reported through the dedicated pharmacovigilance flow — do not rely on a chat answer or delay formal reporting.
        <br><button class="wbtn" data-action="pv">${ic('shieldAlert', 14)} Start adverse event report</button></div>`;
    }
    if (r.offlabel) {
      out += `<div class="warnband ol"><div class="wh">${ic('alertTriangle', 14)} Potentially off-label</div>
        A question about <b>${esc(PRODUCTS[r.offlabel.product].name)} — ${esc(r.offlabel.area)}</b> may fall outside the locally approved indication. ${esc(r.offlabel.note)} Present only approved indications; raise to Medical Affairs if the HCP needs more.</div>`;
    }

    if (r.entry) {
      const e = r.entry;
      const useRep = turn.mode === 'rep' && e.rep;
      const content = useRep ? e.rep : e.hcp;
      const modeLabel = useRep ? 'Rep detail' : 'HCP conversation';

      out += `<div class="abox"><div class="gband"><div class="gh">${ic(useRep ? 'fileText' : 'messageSquare', 13)} ${esc(modeLabel)} guidance</div><div class="lead">${content.lead}</div></div>
        <div class="disc">${ic('info', 15)}<span>This is AI-generated ${useRep ? 'internal preparation' : 'conversation guidance'} based on approved Merz content. It is not an approved promotional asset and should not be forwarded as official Merz material.</span></div></div>`;

      out += `<div class="modes">
        <div class="mode ${!useRep ? 'on' : ''}" data-action="mode" data-mode="hcp">HCP conversation</div>
        <div class="mode ${useRep ? 'on' : ''}" data-action="mode" data-mode="rep">Rep detail</div></div>`;

      const pts = (content.points || []).map((pt) =>
        `<div class="pt">${dot('var(--gray)', 5)}<span>${pt.text} ${pt.src ? `<sup data-action="src" data-n="${pt.src}">${pt.src}</sup>` : ''}</span></div>`
      ).join('');
      const note = content.note ? `<div class="plevel">${content.note}</div>` : '';

      out += `<div class="spbox"><div class="gh">Supporting points</div>${pts}${note}
        <div class="showsrc" data-action="drawer"><span>${ic('bookOpen', 15)} ${turn.drawerOpen ? 'Hide' : 'Show'} ${e.sources.length} source${e.sources.length > 1 ? 's' : ''}</span><span class="r">Country, approval date and supporting excerpt included</span></div></div>`;

      const savedOn = S.saved.some((s) => s.entryId === e.id);
      out += `<div class="actrow">
        <div class="abtn ${savedOn ? 'on' : ''}" data-action="saveans" data-entry="${e.id}" data-q="${esc(turn.question)}">${ic(savedOn ? 'checkCircle' : 'star', 14)} ${savedOn ? 'Saved' : 'Save answer'}</div>
        <div class="abtn" data-action="fb" data-v="up">${ic('thumbsUp', 14)} Helpful</div>
        <div class="abtn" data-action="fb" data-v="down">${ic('thumbsDown', 14)} Not helpful</div>
        <div class="abtn" data-action="flag">${ic('flag', 14)} Flag for review</div>
        <div class="abtn ma" data-action="askma" data-q="${esc(turn.question)}">${ic('plus', 14)} Ask Medical Affairs</div></div>`;

      out += `<div class="sharebox"><div class="h"><span class="t">Use or share supporting material</span><span class="restr">${ic('lock', 12)} External sharing restricted</span></div>
        <div class="d">Generated conversation guidance cannot be sent externally as an official Merz asset. You can copy it for your own notes or share an approved source document instead.</div>
        <div class="sbtns"><span class="sb" data-action="copyguidance">${ic('copy', 14)} Copy guidance for notes</span>
          <span class="sb green" data-action="shareapproved">${ic('fileText', 14)} Share approved source</span>
          <span class="sb via" data-action="sharechan" data-c="WhatsApp"><span class="vtop">${ic('messageSquare', 14)} WhatsApp</span><span class="vv">approved material only</span></span>
          <span class="sb via" data-action="sharechan" data-c="Email"><span class="vtop">${ic('mail', 14)} Email</span><span class="vv">approved material only</span></span></div></div>`;

      out += `<div class="seclbl mono">SUGGESTED FOLLOW-UPS</div><div class="fups">${(e.followups || []).map((f) => `<div class="fup" data-action="ask" data-q="${esc(f)}">${esc(f)}</div>`).join('')}</div>`;
    } else if (!r.pv) {
      out += `<div class="abox"><div class="gband" style="border-left-color:var(--warn-ink)"><div class="gh">${ic('alertTriangle', 13)} No approved answer yet</div>
        <div class="lead">There isn't an approved source that answers this specific question in your market. The assistant won't improvise beyond approved Merz content. You can raise it to Medical Affairs and you'll be notified when an approved answer is published.</div></div>
        <div class="disc">${ic('info', 15)}<span>Raising a gap logs the exact question so Medical Affairs can write and approve a response. It appears in the manager and admin content-gap queues.</span></div></div>
        <div class="actrow"><div class="abtn ma" data-action="askma" data-q="${esc(turn.question)}">${ic('plus', 14)} Ask Medical Affairs</div>
          <div class="abtn" data-action="nav" data-view="lib">${ic('library', 14)} Search the Library instead</div></div>`;
    }
    return out;
  }

  function viewChat() {
    if (!S.chat || !S.chat.turns || !S.chat.turns.length) {
      return `<div class="chatlayout"><div class="chatmain">
          <div class="hero"><div class="date mono">CHAT</div><h1>Start a question</h1><div class="sub">Ask anything about Xeomin, Belotero, Radiesse or Ultherapy. Answers are grounded in approved sources.</div></div>
          <div class="ask">${ic('search', 18)}<input id="askInput" placeholder="Ask anything about your products..." autocomplete="off"><span class="mic" data-action="mic">${ic('mic', 18)}</span><span class="go" data-action="asksend">${ic('send', 18)}</span></div>
          <div class="seclbl mono" style="margin-top:14px">TRY ONE OF THESE</div>
          <div class="fups">${['How should Xeomin be reconstituted?', 'What are the contraindications for Radiesse?', 'Tell me about Belotero', 'How many Ultherapy sessions are needed?'].map((q) => `<div class="fup" data-action="ask" data-q="${esc(q)}">${esc(q)}</div>`).join('')}</div>
        </div></div>`;
    }
    const turns = S.chat.turns;
    const active = turns[turns.length - 1];

    let history = '';
    if (turns.length > 1) {
      history = '<div class="thread">' + turns.slice(0, -1).map((t) => {
        const lead = t.resolved && t.resolved.entry ? (t.mode === 'rep' && t.resolved.entry.rep ? t.resolved.entry.rep.lead : t.resolved.entry.hcp.lead) : 'Raised to Medical Affairs — no approved answer yet.';
        return `<div class="tmsg"><div class="uq"><span>${esc(t.question)}</span></div>
          <div class="abox"><div class="gband"><div class="gh">${ic('messageSquare', 13)} Earlier in this thread</div><div class="lead" style="font-size:13.5px">${lead}</div></div></div></div>`;
      }).join('') + '</div>';
    }

    let body;
    if (!active.resolved) {
      body = `<div class="qtitle">${esc(active.question)}</div>
        <div class="thinking"><div class="dots"><i></i><i></i><i></i></div> Searching approved Merz sources…</div>`;
    } else { body = answerBlock(active); }

    const drawer = (active.resolved && active.resolved.entry && active.drawerOpen)
      ? `<div class="drawer"><div class="dh"><span class="t">Approved sources</span><span class="x" data-action="drawer">${ic('x', 16)}</span></div>${active.resolved.entry.sources.map((s) =>
          `<div class="dsrc" data-src="${s.n}"><div class="top"><span class="num">${s.n}</span><span class="perm ${s.perm}">${s.perm === 'hcp' ? 'HCP-SHAREABLE' : 'INTERNAL'}</span></div>
            <div class="t2">${esc(s.title)}</div><div class="meta">${esc(s.meta)}</div><div class="ex">"${esc(s.excerpt)}"</div>
            <div class="db"><span class="dbtn dark" data-action="opendoc" data-title="${esc(s.title)}" data-meta="${esc(s.meta)}" data-ex="${esc(s.excerpt)}">${ic('externalLink', 12)} ${esc(s.doc)}</span><span class="dbtn" data-action="ask" data-q="${esc('Tell me more about ' + s.title)}">${ic('messageSquare', 12)} Ask about this</span><span class="dbtn" data-action="nav" data-view="lib">${ic('bookOpen', 12)} View in Library</span></div></div>`
        ).join('')}</div>`
      : '';

    return `<div class="chatlayout"><div class="chatmain">
        <button class="backbtn" data-action="newq">${ic('arrowLeft', 15)} New question</button>
        ${history}${body}
        <div class="ask"><input id="askInput" placeholder="Ask a follow-up${active.resolved && active.resolved.entry ? ' about ' + PRODUCTS[active.resolved.entry.product].name : ''}..." autocomplete="off"><span class="mic" data-action="mic">${ic('mic', 18)}</span><span class="go" data-action="asksend">${ic('send', 18)}</span></div>
        <div class="voicehint">${ic('volume', 12)} Voice transcribes to text for your confirmation before sending.</div>
      </div>${drawer}</div>`;
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
    return `<div class="docrow"><div class="ficon" style="background:${p.bg};color:${p.color}">${ic('fileText', 16)}</div>
      <div class="g"><div class="t">${esc(d.title)} ${d.isNew ? '<span class="newb">NEW</span>' : ''} <span class="perm ${d.perm}">${d.perm === 'hcp' ? 'HCP-SHAREABLE' : 'INTERNAL'}</span></div>
        <div class="m">${esc(d.meta)}</div>${d.change ? `<div class="chg">What changed: ${esc(d.change)}</div>` : ''}</div>
      <div class="acts"><span class="abtn" data-action="opendoc" data-title="${esc(d.title)}" data-meta="${esc(d.meta)}">${ic('externalLink', 13)} Open</span>
        <span class="abtn" data-action="ask" data-q="${esc('Tell me about ' + p.name)}">${ic('messageSquare', 13)} Ask</span>
        <span class="abtn" data-action="bookmark" data-title="${esc(d.title)}">${ic('bookmark', 13)}</span></div></div>`;
  }
  function viewLibrary() {
    const L = S.lib;
    const recent = DOCS.filter((d) => d.isNew);
    const list = filterDocs();
    const filtered = L.q || L.product !== 'all' || L.type !== 'all' || L.hcpOnly || L.quick;

    const filterChips = `<div class="filters">
      <span class="filt ${L.product !== 'all' ? 'on' : ''}" data-action="libprod">Product: ${L.product === 'all' ? 'All' : PRODUCTS[L.product].name} ${ic('chevronDown', 13)}</span>
      <span class="filt">Country: UAE ${ic('chevronDown', 13)}</span>
      <span class="filt ${L.type !== 'all' && L.type !== 'hcp' ? 'on' : ''}" data-action="libtype">Type: ${L.type === 'all' || L.type === 'hcp' ? 'All' : L.type} ${ic('chevronDown', 13)}</span>
      <span class="filt ${L.hcpOnly ? 'on' : ''}" data-action="libhcp">${ic('check', 12)} HCP-shareable only</span>
      ${filtered ? `<span class="filt" data-action="libclear">${ic('x', 12)} Clear filters</span>` : ''}</div>`;

    const qa = QUICK_ACCESS.map((q) => `<div class="qa ${L.quick === q ? 'on' : ''}" data-action="quick" data-q="${esc(q)}">${esc(q)}</div>`).join('');

    let mainList;
    if (filtered) {
      mainList = `<div class="seclbl mono">RESULTS · ${list.length} document${list.length !== 1 ? 's' : ''}</div>` +
        (list.length ? list.map(docRow).join('') : `<div class="lempty">No approved documents match these filters.<br>Try clearing filters or raising a content gap from Chat.</div>`);
    } else {
      mainList = `<div class="seclbl mono">RECENTLY UPDATED</div>${recent.map(docRow).join('')}
        <div class="lib-two">
          <div class="lpanel"><div class="h">${ic('trendingUp', 14)} Frequently used by your team</div>
            ${[['xeomin', 'Xeomin reconstitution table', 'xeo-reconstitution'], ['radiesse', 'Radiesse dilution guide', 'rad-dilution'], ['belotero', 'Belotero portfolio overview', 'bel-overview'], ['ultherapy', 'Ultherapy treatment-depth reference', 'ult-overview']].map((r) =>
              `<div class="lrow" data-action="ask" data-entry="${r[2]}" data-q="${esc(r[1])}"><span class="bic" style="background:${PRODUCTS[r[0]].bg};color:${PRODUCTS[r[0]].color}">${PRODUCTS[r[0]].letter}</span>${esc(r[1])}<span class="n2">${ic('chevronRight', 15)}</span></div>`
            ).join('')}</div>
          <div class="lpanel"><div class="h">${ic('bookmark', 14)} Your saved resources</div>
            <div class="lrow" data-action="opendoc" data-title="Xeomin UAE label (May 2026)" data-meta="Regulatory · Xeomin · UAE"><span class="bic" style="background:var(--p1-bg);color:var(--p1)">X</span>Xeomin UAE label (May 2026)<span class="n2">${ic('chevronRight', 15)}</span></div>
            <div class="lrow" data-action="opendoc" data-title="Radiesse hands indication study" data-meta="Clinical evidence · Radiesse"><span class="bic" style="background:var(--p3-bg);color:var(--p3)">R</span>Radiesse hands indication study<span class="n2">${ic('chevronRight', 15)}</span></div>
            <div class="lrow" style="color:var(--gray)">Saved answers live on Home · documents live here</div></div>
        </div>
        <div class="seclbl mono">BROWSE BY PRODUCT</div>
        <div class="lbrands">${Object.values(PRODUCTS).map((p) => {
          const cnt = DOCS.filter((d) => d.product === p.id).length;
          const nw = DOCS.filter((d) => d.product === p.id && d.isNew).length;
          return `<div class="lb" data-action="libprodset" data-product="${p.id}"><div class="bar" style="background:${p.color}"></div><div class="in">
            <div class="hd"><div class="ic" style="background:${p.bg};color:${p.color}">${p.letter}</div><div class="nm">${p.name} ${nw ? `<span class="newb">${nw} NEW</span>` : ''}</div></div>
            <div class="meta">UAE content · ${cnt} resources<br>Updated ${p.reviewed} · Local label available</div>
            <div class="view">View resources ${ic('chevronRight', 15)}</div></div></div>`;
        }).join('')}</div>`;
    }

    return `
      <div class="hero"><div class="date mono">LIBRARY</div><h1>Approved content</h1><div class="sub">Official, current, browsable Merz material. Documents, not AI answers.</div></div>
      <div class="lsearch">${ic('search', 18)}<input id="libInput" placeholder="Search labels, clinical studies, dosing guides, safety information..." value="${esc(L.q)}" autocomplete="off"><span class="go" data-action="libsearch">${ic('send', 18)}</span></div>
      ${filterChips}
      <div class="seclbl mono">QUICK ACCESS</div><div class="qacc">${qa}</div>
      ${mainList}`;
  }

  /* =====================================================================
     MANAGER
     ===================================================================== */
  const certGroup = (cert) => `<span class="cg">${cert.map((c) => `<span class="c ${c[0]}">${c[1]}</span>`).join('')}</span>`;
  const nextCell = (n) => (typeof n === 'string' ? n : `<span class="st ${n.st}">${n.label}</span>`);

  function viewManager() {
    const rows = REPS.map((r, i) =>
      `<tr data-action="rep" data-i="${i}" style="cursor:pointer"><td>${r.name}</td><td><span class="profb ${r.profile}">${r.profile === 'mb' ? 'MULTI-BRAND' : 'ULTHERAPY ONLY'}</span></td><td>${r.q30}</td><td>${r.completion}</td><td>${r.last}</td><td>${certGroup(r.cert)}</td><td>${nextCell(r.next)}</td></tr>`
    ).join('');
    const signals = KNOWLEDGE_SIGNALS.map((s) =>
      `<div class="topic"><span style="width:165px">${esc(s.topic)}${s.focus ? '<span class="focus">TRAINING FOCUS</span>' : ''}</span><div class="bar-wrap"><div class="bar-fill" style="width:${s.pct}%"></div></div><span class="n">${s.n}</span></div>` +
      (s.note ? `<div style="font-size:10.5px;color:var(--ink-soft);margin:-3px 0 9px 2px">${esc(s.note)}</div>` : '')
    ).join('');
    const gaps = CONTENT_GAPS.map((g) => `<div class="gap"><span>${esc(g.label)}</span><span class="gst ${g.st}">${g.text}</span></div>`).join('');
    const comp = COMPETITIVE.map((c) => `<div class="comp"><span>${esc(c.label)}</span><span class="n">${c.n}</span></div>`).join('');

    return `
      <div class="hero"><div class="date mono">TEAM PULSE · UAE · FRIDAY, JULY 10</div><h1>Team overview</h1><div class="sub">Adoption, knowledge signals, and assessment across your team.</div></div>
      <div class="filters" style="margin-bottom:11px">${['Country: UAE', 'Profile: All', 'Brand: All', 'Time: This quarter'].map((f) => `<span class="filt" data-action="mgrfilter" data-f="${esc(f.split(':')[0])}">${esc(f)} ${ic('chevronDown', 13)}</span>`).join('')}</div>
      <div class="actstrip">
        <div class="act bad" data-action="mgract" data-t="inactive">${ic('alertTriangle', 15)} 2 reps inactive 7+ days ${ic('chevronRight', 14)}</div>
        <div class="act warn" data-action="mgract" data-t="due">${ic('clock', 15)} 2 assessments due this week ${ic('chevronRight', 14)}</div>
        <div class="act bad" data-action="mgract" data-t="failed">${ic('xCircle', 15)} 1 failed assessment to review ${ic('chevronRight', 14)}</div></div>
      <div class="stats">
        <div class="stat"><div class="lbl mono">QUESTIONS (30D)</div><div class="big">581</div><div class="sub">283 threads</div></div>
        <div class="stat"><div class="lbl mono">ACTIVE REPS</div><div class="big">15 / 17</div><div class="sub">named below</div></div>
        <div class="stat"><div class="lbl mono">ASSESSMENT COMPLETION · YTD</div><div class="big">72%</div><div class="sub">1,685 of 2,340 assigned completed · 655 pending</div></div>
        <div class="stat"><div class="lbl mono">CERTIFICATION PASS RATE</div><div class="big">11 / 17</div><div class="sub">80% required per applicable brand</div></div></div>
      <div class="panel"><h3>Reps <span class="flt" data-action="mgrfilter" data-f="Country">Country: UAE ${ic('chevronDown', 12)}</span></h3>
        <table><tr><th>Rep</th><th>Profile</th><th>Questions (30d)</th><th>Completion (this quarter)</th><th>Last active</th><th>Certification</th><th>Next assessment</th></tr>${rows}</table></div>
      <div class="mgr-grid">
        <div class="panel"><h3>Team knowledge signals</h3>${signals}</div>
        <div><div class="panel" style="margin-bottom:13px"><h3>Competitive pressure (30d)</h3>${comp}</div>
          <div class="panel"><h3>Content gaps (visibility)</h3>${gaps}</div></div></div>
      <div class="callout"><b>Completion vs certification:</b> completion = assigned vs completed (engagement); certification = pass rate against the 80% per-brand bar (performance). Click any rep row for detail. Action strips and filters are interactive.</div>`;
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
      else right = `<button class="btn-sm" data-action="uploaddoc" data-title="${esc(g.title)}">Add source</button>`;
      return `<div class="arow"><span><b>${esc(g.title)}</b> · ${esc(g.meta)}</span>${right}</div>`;
    }).join('');
    const compliance = COMPLIANCE.map((c) =>
      `<div class="arow" data-action="compliance" data-text="${esc(c.text)}" data-flag="${c.flag}" style="cursor:pointer"><span>${esc(c.text)}</span><span class="flag ${c.flag}">${c.label}</span></div>`
    ).join('');
    const users = S.users.map((u, i) =>
      `<tr><td>${esc(u.name)}</td><td>${esc(u.country)}</td><td><span class="profb ${u.profile}">${u.profile === 'mb' ? 'MULTI' : 'ULT'}</span></td><td>${esc(u.completion)}</td><td>${certGroup(u.cert)}</td><td><button class="btn-sm" data-action="edituser" data-i="${i}">${ic('pencil', 12)} Edit</button></td></tr>`
    ).join('');
    const tones = ['var(--p3)', 'var(--p1)', 'var(--p2)', 'var(--p4)']; // RAD, XEO, BEL, ULT
    const usagePct = [38, 27, 22, 13], usageLbl = ['RAD', 'XEO', 'BEL', 'ULT'];

    return `
      <div class="hero"><div class="date mono">ADMIN · ALL COUNTRIES · FRIDAY, JULY 10</div><h1>Platform administration</h1><div class="sub">Assessment, content gaps, compliance, users, and knowledge base. Filter by country and brand everywhere.</div></div>
      <div class="pending-hero">
        <div class="ph-stat"><div class="lbl mono">ASSESSMENT COMPLETION · YTD</div><div class="big">72%</div><div class="sub">2,340 assigned · 1,685 completed · 655 pending across all users</div></div>
        <div class="ph-stat"><div class="lbl mono">CONTENT GAP QUEUE</div><div class="big">${34 - S.resolvedGaps.length}</div><div class="sub">oldest 11 days · 12 RAD · 9 XEO · 8 BEL · 5 ULT</div></div>
        <div class="ph-stat"><div class="lbl mono">USAGE SPLIT BY BRAND</div>
          <div class="usage-bar">${usagePct.map((v, i) => `<span style="flex:${v};background:${tones[i]}"></span>`).join('')}</div>
          <div class="usage-lg">${usageLbl.map((l, i) => `<span>${dot(tones[i], 8)}${l} ${usagePct[i]}%</span>`).join('')}</div></div></div>
      <div class="adm-grid">
        <div class="panel"><h3>Assessment manager <span class="flt">80% pass per brand · quarterly</span></h3>
          <div class="arow"><span><b>Multi-brand profile</b> · 50 Q/quarter · 20 RAD / 15 XEO / 15 BEL</span><span class="profb mb">14 USERS</span></div>
          <div class="arow"><span><b>Ultherapy-only profile</b> · 50 Q/quarter · all Ultherapy</span><span class="profb uo">3 USERS</span></div>
          ${pools}
          <div class="arow"><span>${ic('sparkles', 14)} 12 AI-generated draft questions</span><button class="btn-dark" data-action="reviewdrafts">Review 12 drafts</button></div></div>
        <div class="panel"><h3>Content gap queue <span class="flt">Brand: All ${ic('chevronDown', 12)}</span></h3>${gaps}
          <div class="arow"><span style="color:var(--gray);font-size:11px">Resolving a gap re-runs the original questions, then notifies every rep who asked. Separate metric from assessment completion.</span></div></div>
        <div class="panel"><h3>Compliance flags <span class="flt">Per brand ${ic('chevronDown', 12)}</span></h3>${compliance}</div>
        <div class="panel"><h3>Users <span class="flt">Country: All ${ic('chevronDown', 12)}</span></h3>
          <table><tr><th>User</th><th>Country</th><th>Profile</th><th>Completion (quarter)</th><th>Certification</th><th></th></tr>${users}</table>
          <div style="margin-top:10px"><button class="btn-dark" data-action="adduser">${ic('userPlus', 13)} Add user</button></div></div></div>
      <div class="callout"><b>Admin:</b> completion (engagement) separated from certification (performance). AI draft questions go through Review, never bulk approval. Write an answer to resolve a content gap and watch the queue count drop. Add or edit users live.</div>`;
  }

  /* =====================================================================
     MODALS / FLOWS
     ===================================================================== */
  function pvFlow() {
    openModal(`<div class="mhd"><div><div class="mt">${ic('shieldAlert', 20)} Report an adverse event or product complaint</div><div class="msub">Pharmacovigilance flow · routed immediately</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody">
        <div class="mbanner red">${ic('shieldAlert', 16)}<span>This report is routed to Pharmacovigilance immediately. Provide the minimum required details below. <b>Do not delay formal reporting</b> — this does not replace your local PV obligations.</span></div>
        <div class="merr" id="pvErr">Please complete the required fields marked with *.</div>
        <div class="fld"><label>Product involved <span class="req">*</span></label>
          <select id="pvProduct"><option value="">Select a product…</option>${Object.values(PRODUCTS).map((p) => `<option>${p.name}</option>`).join('')}<option>Other / not sure</option></select></div>
        <div class="mrow">
          <div class="fld"><label>Event type <span class="req">*</span></label><select id="pvType"><option value="">Select…</option><option>Adverse event (patient reaction)</option><option>Product quality complaint</option><option>Both</option></select></div>
          <div class="fld"><label>Approximate onset</label><input id="pvOnset" placeholder="e.g. 3 weeks after treatment"></div></div>
        <div class="fld"><label>Brief description <span class="req">*</span></label><textarea id="pvDesc" placeholder="What happened? Include what was observed and any action taken. Do not include patient-identifying information."></textarea>
          <div class="hint">Minimum capture only. A PV specialist will follow up for full case details.</div></div>
        <div class="fld"><label>Your contact for follow-up <span class="req">*</span></label><input id="pvContact" placeholder="Email or phone" value="anubhav@allysai.com"></div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn danger" data-action="pvsubmit">${ic('shieldAlert', 15)} Submit report</button></div>
      </div>`);
  }
  function pvSubmit() {
    const v = (id) => (document.getElementById(id) || {}).value || '';
    if (!v('pvProduct') || !v('pvType') || !v('pvDesc').trim() || !v('pvContact').trim()) { const e = document.getElementById('pvErr'); if (e) e.classList.add('show'); return; }
    const ref = 'PV-2026-' + Math.floor(100000 + Math.random() * 899999);
    S.pv.unshift({ ref, product: v('pvProduct'), type: v('pvType'), when: new Date().toISOString() }); save('merz_pv', S.pv);
    openModal(`<div class="mhd"><div><div class="mt">${ic('checkCircle', 20)} Report submitted</div><div class="msub">Routed to Pharmacovigilance</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="refbox"><div class="mono" style="color:var(--gray)">REFERENCE NUMBER</div><div class="rn">${ref}</div><div style="font-size:11.5px;color:var(--ink-soft)">Keep this reference for your records.</div></div>
        <ul class="mlist">
          <li>${ic('check', 15)}<span>Routed to the Pharmacovigilance team immediately.</span></li>
          <li>${ic('check', 15)}<span>A PV specialist will contact you at <b>${esc(v('pvContact'))}</b> for full case details.</span></li>
          <li>${ic('check', 15)}<span>Logged against <b>${esc(v('pvProduct'))}</b> and visible in the admin compliance queue.</span></li>
        </ul>
        <div class="mbanner blue" style="margin-top:14px">${ic('info', 16)}<span>Reminder: this in-app report does not replace your local regulatory reporting obligations.</span></div>
        <div class="mactions"><button class="mbtn primary" data-action="close">Done</button></div></div>`);
    toast('Adverse event report ' + ref + ' routed to PV', 'bad');
  }

  function askMA(q) {
    openModal(`<div class="mhd"><div><div class="mt">${ic('plus', 20)} Ask Medical Affairs</div><div class="msub">Raise this question for an approved written answer</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="fld"><label>Your question</label><textarea id="maQ">${esc(q || '')}</textarea></div>
        <div class="fld"><label>Why you need it (optional)</label><input id="maWhy" placeholder="e.g. HCP asked in clinic, no approved source found"></div>
        <div class="mbanner blue">${ic('info', 16)}<span>This logs the exact question in the Medical Affairs content-gap queue. Every rep who asked the same thing is notified when an approved answer is published.</span></div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn primary" data-action="masubmit">Send to Medical Affairs</button></div></div>`);
  }
  function maSubmit() { closeModal(); toast('Sent to Medical Affairs · added to the content-gap queue', 'good'); }

  function openDoc(title, meta, ex) {
    openModal(`<div class="mhd"><div><div class="mt">${ic('fileText', 20)} ${esc(title)}</div><div class="msub">${esc(meta || 'Approved Merz source')}</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="mbanner green">${ic('checkCircle', 16)}<span>Approved source · current version. This is a demo document viewer.</span></div>
        ${ex ? `<div style="font-size:13px;line-height:1.65;border-left:3px solid var(--line);padding:4px 0 4px 14px;margin-bottom:14px;color:var(--ink-soft)">"${esc(ex)}"</div>` : ''}
        <p style="font-size:13px;line-height:1.7;color:var(--ink-soft)">In the production build this opens the full approved PDF/label with page anchoring to the cited excerpt, permission-aware sharing, and version history. Content shown here is fictional demo data.</p>
        <div class="mactions"><button class="mbtn" data-action="bookmark" data-title="${esc(title)}">${ic('bookmark', 15)} Bookmark</button><button class="mbtn primary" data-action="close">Close</button></div></div>`);
  }

  function repDetail(i) {
    const r = REPS[i];
    openModal(`<div class="mhd"><div><div class="mt">${r.name}</div><div class="msub">${r.profile === 'mb' ? 'Multi-brand' : 'Ultherapy-only'} · ${esc(r.country)}</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody">
        <div class="stats" style="margin-bottom:14px"><div class="stat"><div class="lbl mono">QUESTIONS · 30D</div><div class="big">${r.q30}</div></div>
          <div class="stat"><div class="lbl mono">COMPLETION</div><div class="big" style="font-size:15px;padding-top:5px">${esc(r.completion)}</div></div>
          <div class="stat"><div class="lbl mono">LAST ACTIVE</div><div class="big" style="font-size:15px;padding-top:5px">${esc(r.last)}</div></div></div>
        <div class="fld"><label>Certification by brand</label><div>${certGroup(r.cert)} &nbsp; <span style="font-size:11.5px;color:var(--gray)">P = passed · F = failed · — = not assessed</span></div></div>
        <div class="fld"><label>Next assessment</label><div>${nextCell(r.next)}</div></div>
        <div class="mactions"><button class="mbtn" data-action="close">Close</button><button class="mbtn primary" data-action="nudge" data-name="${esc(r.name)}">${ic('bell', 15)} Send reminder</button></div></div>`);
  }

  function writeAnswer(title) {
    openModal(`<div class="mhd"><div><div class="mt">${ic('pencil', 20)} Write approved answer</div><div class="msub">${esc(title)}</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="mbanner blue">${ic('info', 16)}<span>Publishing re-runs the original questions and notifies every rep who asked. This resolves the content gap.</span></div>
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
    save('merz_gaps', S.resolvedGaps); closeModal();
    toast('Answer published · reps who asked have been notified', 'good'); render();
  }

  function addUser() {
    openModal(`<div class="mhd"><div><div class="mt">${ic('userPlus', 20)} Add user</div><div class="msub">Create a rep account with a profile</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="mrow"><div class="fld"><label>Name <span class="req">*</span></label><input id="auName" placeholder="Full name"></div>
        <div class="fld"><label>Country</label><select id="auCountry"><option>UAE</option><option>KSA</option><option>Kuwait</option><option>Qatar</option></select></div></div>
        <div class="fld"><label>Profile</label><select id="auProfile"><option value="mb">Multi-brand</option><option value="uo">Ultherapy-only</option></select></div>
        <div class="merr" id="auErr">Please enter a name.</div>
        <div class="mbanner blue">${ic('info', 16)}<span>New users start with a baseline assessment assigned. Permissions are separate sets (content review, PV, assessment admin, user admin, KB admin), combined per person.</span></div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn primary" data-action="ausave">Create user</button></div></div>`);
  }
  function auSave() {
    const name = (document.getElementById('auName') || {}).value || '';
    if (!name.trim()) { const e = document.getElementById('auErr'); if (e) e.classList.add('show'); return; }
    const profile = (document.getElementById('auProfile') || {}).value || 'mb';
    const country = (document.getElementById('auCountry') || {}).value || 'UAE';
    S.users.push({ name: name.trim(), country, profile, completion: '0 of 10 assigned', cert: profile === 'mb' ? [['n', 'R'], ['n', 'X'], ['n', 'B']] : [['n', 'U']] });
    save('merz_users', S.users); closeModal(); toast('User created · baseline assessment assigned', 'good'); render();
  }
  function editUser(i) {
    const u = S.users[i];
    openModal(`<div class="mhd"><div><div class="mt">${ic('pencil', 20)} Edit user</div><div class="msub">${esc(u.name)}</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="mrow"><div class="fld"><label>Country</label><select id="euCountry"><option ${u.country === 'UAE' ? 'selected' : ''}>UAE</option><option ${u.country === 'KSA' ? 'selected' : ''}>KSA</option><option ${u.country === 'Kuwait' ? 'selected' : ''}>Kuwait</option><option ${u.country === 'Qatar' ? 'selected' : ''}>Qatar</option></select></div>
        <div class="fld"><label>Profile</label><select id="euProfile"><option value="mb" ${u.profile === 'mb' ? 'selected' : ''}>Multi-brand</option><option value="uo" ${u.profile === 'uo' ? 'selected' : ''}>Ultherapy-only</option></select></div></div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn primary" data-action="eusave" data-i="${i}">Save changes</button></div></div>`);
  }
  function euSave(i) {
    const u = S.users[i];
    u.country = (document.getElementById('euCountry') || {}).value || u.country;
    u.profile = (document.getElementById('euProfile') || {}).value || u.profile;
    save('merz_users', S.users); closeModal(); toast('Changes saved for ' + esc(u.name), 'good'); render();
  }

  function reviewDrafts() {
    const drafts = [
      ['Radiesse', 'Which contraindication applies to active skin infection at the treatment site?', 'Medium'],
      ['Xeomin', 'What diluent is used to reconstitute Xeomin?', 'Easy'],
      ['Belotero', 'Belotero Soft is intended for which line depth?', 'Easy'],
      ['Ultherapy', 'Ultherapy delivers which type of energy?', 'Medium']
    ];
    openModal(`<div class="mhd"><div><div class="mt">${ic('sparkles', 20)} Review AI-generated draft questions</div><div class="msub">12 drafts · each reviewed with source, correct answer, difficulty</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="mbanner blue">${ic('info', 16)}<span>Drafts are reviewed one by one, never bulk-approved. Approving adds the question to the brand pool.</span></div>
        ${drafts.map((d, i) => `<div class="arow"><span><span class="profb mb" style="margin-right:6px">${d[0].toUpperCase()}</span>${esc(d[1])} <span style="color:var(--gray);font-size:10.5px">· ${d[2]}</span></span><span style="display:flex;gap:6px"><button class="btn-sm" data-action="draftrej" data-i="${i}">Reject</button><button class="btn-dark" data-action="draftapp" data-i="${i}">Approve</button></span></div>`).join('')}
        <div style="font-size:11px;color:var(--gray);margin-top:8px">Showing 4 of 12 · demo</div>
        <div class="mactions"><button class="mbtn primary" data-action="close">Close</button></div></div>`, true);
  }

  function compliance(text, flag) {
    const isPv = flag === 'pv';
    openModal(`<div class="mhd"><div><div class="mt">${ic(isPv ? 'shieldAlert' : 'alertTriangle', 20)} ${isPv ? 'Pharmacovigilance flag' : 'Off-label flag'}</div><div class="msub">Compliance review</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="mbanner ${isPv ? 'red' : 'amber'}">${ic(isPv ? 'shieldAlert' : 'alertTriangle', 16)}<span>Flagged query: <b>${esc(text)}</b></span></div>
        <p style="font-size:13px;line-height:1.7;color:var(--ink-soft)">${isPv
          ? 'A possible adverse event was detected in a rep query and auto-routed to Pharmacovigilance within 24 hours. The rep was directed to the dedicated PV reporting flow. Review the routed case and confirm follow-up.'
          : 'A potentially off-label question was detected. The assistant returned only approved indications and surfaced an off-label caution. No off-label claim was generated. Confirm whether an approved boundary message is sufficient or MA follow-up is needed.'}</p>
        <div class="mactions"><button class="mbtn" data-action="close">Close</button><button class="mbtn primary" data-action="close">Mark reviewed</button></div></div>`);
  }

  function compareModal() {
    openModal(`<div class="mhd"><div><div class="mt">${ic('compare', 20)} Compare vs competitor</div><div class="msub">Approved claims only</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="mbanner blue">${ic('info', 16)}<span>Comparisons use only claims that appear in approved Merz materials. The assistant will not generate head-to-head claims that aren't approved.</span></div>
        <div class="fld"><label>Pick a comparison</label></div>
        <div class="fups">${['Xeomin vs other neurotoxins', 'Radiesse vs other biostimulators', 'Ultherapy vs RF devices'].map((q) => `<div class="fup" data-action="askclose" data-q="${esc(q)}">${esc(q)}</div>`).join('')}</div>
        <div class="mactions" style="margin-top:14px"><button class="mbtn" data-action="close">Cancel</button></div></div>`);
  }

  function notifications() {
    openModal(`<div class="mhd"><div><div class="mt">${ic('bell', 20)} Notifications</div><div class="msub">Updates for you</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><ul class="mlist">
        <li>${ic('checkCircle', 15)}<span>Your question <b>Radiesse in patients over 65</b> has an approved answer.</span></li>
        <li>${ic('fileText', 15)}<span><b>Belotero Balance PI</b> updated — approved treatment-area wording revised.</span></li>
        <li>${ic('clock', 15)}<span>Assessment reminder: next certification window opens soon.</span></li>
      </ul><div class="mactions"><button class="mbtn primary" data-action="close">Close</button></div></div>`);
  }

  /* =====================================================================
     ACTIONS
     ===================================================================== */
  const ACTIONS = {
    nav: (d) => go(d.view),
    persona: (d) => go({ rep: 'home', mgr: 'mgr', adm: 'adm' }[d.p]),
    theme: () => toggleTheme(),
    newq: () => newQuestion(),
    cat: (d) => { S.cat = d.cat; render(); },
    ask: (d) => askQuestion(d.q || (d.entry && (KB.concat(OBJECTIONS).find((e) => e.id === d.entry) || {}).q), d.entry),
    askclose: (d) => { closeModal(); askQuestion(d.q); },
    asksend: () => { const i = $('#askInput'); if (i) askQuestion(i.value); },
    prod: (d) => askQuestion('Tell me about ' + PRODUCTS[d.product].name),
    dismiss: (d) => { if (S.dismissed.indexOf(d.id) === -1) S.dismissed.push(d.id); save('merz_dismissed', S.dismissed); render(); },
    dyncard: () => { go('lib'); toast('Opened the updated document in the Library', 'good'); },
    bell: () => notifications(),
    pv: () => pvFlow(),
    pvsubmit: () => pvSubmit(),
    mic: (d, el) => {
      el.classList.add('rec'); toast('Listening… (demo) transcribing to text', 'warn');
      setTimeout(() => { el.classList.remove('rec'); const i = $('#askInput'); if (i) { i.value = 'How should Xeomin be reconstituted?'; i.focus(); } toast('Transcribed — review, then send', 'good'); }, 1400);
    },
    compare: () => compareModal(),
    mode: (d) => { S.chat.turns[S.chat.turns.length - 1].mode = d.mode; render(); },
    drawer: () => { const t = S.chat.turns[S.chat.turns.length - 1]; t.drawerOpen = !t.drawerOpen; render(); },
    src: (d) => { const t = S.chat.turns[S.chat.turns.length - 1]; t.drawerOpen = true; render(); setTimeout(() => { const el = document.querySelector(`.dsrc[data-src="${d.n}"]`); if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 60); },
    saveans: (d) => {
      const idx = S.saved.findIndex((s) => s.entryId === d.entry);
      if (idx === -1) { S.saved.unshift({ entryId: d.entry, q: d.q }); toast('Saved to Home', 'good'); }
      else { S.saved.splice(idx, 1); toast('Removed from saved', 'warn'); }
      save('merz_saved', S.saved); render();
    },
    fb: (d) => toast(d.v === 'up' ? 'Thanks — marked helpful' : 'Noted — flagged as not helpful for review', d.v === 'up' ? 'good' : 'warn'),
    flag: () => toast('Flagged for Medical Affairs review', 'warn'),
    askma: (d) => askMA(d.q),
    masubmit: () => maSubmit(),
    copyguidance: () => {
      const t = S.chat.turns[S.chat.turns.length - 1]; const e = t.resolved && t.resolved.entry;
      const text = e ? (t.mode === 'rep' && e.rep ? e.rep.lead : e.hcp.lead) : '';
      if (navigator.clipboard && text) navigator.clipboard.writeText(text).catch(() => {});
      toast('Copied guidance for your notes (not an approved asset)', 'good');
    },
    shareapproved: () => { S.chat.turns[S.chat.turns.length - 1].drawerOpen = true; render(); toast('Pick an HCP-shareable source to share', 'good'); },
    sharechan: (d) => toast(esc(d.c) + ': approved material only — pick an HCP-shareable source', 'warn'),
    opendoc: (d) => openDoc(d.title, d.meta, d.ex),
    libsearch: () => { const i = $('#libInput'); if (i) { S.lib.q = i.value; render(); } },
    libprod: () => { const order = ['all'].concat(Object.keys(PRODUCTS)); S.lib.product = order[(order.indexOf(S.lib.product) + 1) % order.length]; render(); },
    libprodset: (d) => { S.lib.product = d.product; S.lib.quick = null; render(); },
    libtype: () => { const order = ['all', 'label', 'dosing', 'safety', 'evidence', 'objection']; S.lib.type = order[(order.indexOf(S.lib.type) + 1) % order.length]; S.lib.quick = null; render(); },
    libhcp: () => { S.lib.hcpOnly = !S.lib.hcpOnly; render(); },
    libclear: () => { S.lib = { q: '', product: 'all', type: 'all', hcpOnly: false, quick: null }; render(); },
    quick: (d) => { S.lib.quick = S.lib.quick === d.q ? null : d.q; S.lib.type = S.lib.quick ? (QUICK_TO_TYPE[d.q] || 'all') : 'all'; render(); },
    bookmark: (d) => toast('Bookmarked: ' + esc(d.title), 'good'),
    rep: (d) => repDetail(+d.i),
    mgract: (d) => { const msg = { inactive: 'Lina K. and Yousef R. flagged inactive — reminders can be sent', due: 'Omar H. (Jul 12) and Sara M. (Jul 14) due this week', failed: 'Sara M. failed Xeomin certification — retake scheduled Jul 14' }[d.t]; toast(msg, 'warn'); },
    mgrfilter: (d) => toast('Filter: ' + esc(d.f) + ' — applies to the whole page (demo)', 'good'),
    nudge: (d) => { closeModal(); toast('Reminder sent to ' + esc(d.name), 'good'); },
    reviewpool: (d) => toast('Opening ' + esc(d.name) + ' — preset & AI questions with sources (demo)', 'good'),
    reviewdrafts: () => reviewDrafts(),
    draftapp: () => toast('Draft approved and added to the brand pool', 'good'),
    draftrej: () => toast('Draft rejected', 'warn'),
    writeanswer: (d) => writeAnswer(d.title),
    wapublish: (d) => waPublish(d.title),
    uploaddoc: (d) => toast('Add-source flow for: ' + esc(d.title) + ' (demo)', 'good'),
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
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    if (ev.target.id === 'askInput') { ev.preventDefault(); askQuestion(ev.target.value); }
    if (ev.target.id === 'libInput') { ev.preventDefault(); S.lib.q = ev.target.value; render(); }
  });

  /* =====================================================================
     RENDER
     ===================================================================== */
  const VIEWS = { home: viewHome, chat: viewChat, lib: viewLibrary, mgr: viewManager, adm: viewAdmin };
  function render() {
    const role = roleOfView(S.view);
    const active = S.view;
    let activeProduct = null;
    if (S.view === 'chat' && S.chat && S.chat.turns && S.chat.turns.length) {
      const last = S.chat.turns[S.chat.turns.length - 1];
      if (last.resolved && last.resolved.entry) activeProduct = last.resolved.entry.product;
    }
    const content = (VIEWS[S.view] || viewHome)();
    app().innerHTML = `<div class="shell">${sidebar(role, active, activeProduct)}<div class="workarea">${appbar(role)}<main class="main">${content}</main></div></div>`;
    if (S.view === 'lib') { const i = $('#libInput'); if (i && S.lib.q) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }

  render();
})();
