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
    COMPETITIVE, CONTENT_GAPS, ADMIN_GAPS, COMPLIANCE, ADMIN_USERS, ASSESSMENT_POOLS,
    PROFILES, POOL_CONFIG, QUESTIONS, REP_CERT, ASSESS_MONITOR, MOST_FAILED, WEAK_TOPICS,
    PERMISSION_SETS, ADMIN_ROLES
  } = D;

  /* ---------------------------------------------------------------- storage */
  const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch (e) { return def; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const TODAY = '10 Jul 2026';

  const PERSONA = {
    rep: ['KA', 'Karim', 'Sales Rep · UAE · Multi-brand'],
    mgr: ['BK', 'Bahaa', 'Sales Manager · UAE'],
    adm: ['FJ', 'Fouad', 'Medical Affairs · Admin']
  };

  const storedAssess = load('merz_assess', null) || {};
  const ALL_PRODUCTS = Object.keys(PRODUCTS); // xeomin, belotero, radiesse, ultherapy
  const CURRENT_REP = 'Karim A.'; // the signed-in rep persona (Karim)
  const S = {
    view: 'home',
    navOpen: false,
    authed: (function () { try { return localStorage.getItem('merz_authed') === '1'; } catch (e) { return false; } })(),
    onboarded: (function () { try { return localStorage.getItem('merz_onboarded') === '1'; } catch (e) { return false; } })(),
    onboardStep: 0,
    theme: document.documentElement.getAttribute('data-theme') || 'light',
    cat: 'Dosing & reconstitution',
    chat: null,
    saved: load('merz_saved', []),
    dismissed: load('merz_dismissed', []),
    pv: load('merz_pv', []),
    resolvedGaps: load('merz_gaps', []),
    lib: { q: '', product: 'all', type: 'all', hcpOnly: false, quick: null },
    users: (load('merz_users', null) || ADMIN_USERS.slice()).map((u) => Object.assign({ products: ALL_PRODUCTS.slice() }, u)),
    access: load('merz_access', null) || ALL_PRODUCTS.slice(), // medicines the signed-in rep may handle
    adminTab: 'questions',
    activityDays: 7,
    mgrCols: load('merz_mgrcols', null) || { q30: true, completion: true, last: true, cert: true, next: true },
    qFilter: { product: 'all', origin: 'all', status: 'all' },
    prodFilter: { q: '', type: 'all', status: 'all' },
    kb: { tab: 'active', q: '', parsingDocId: null, fileName: '', product: '' },
    assess: {
      threshold: storedAssess.threshold != null ? storedAssess.threshold : 80,
      cert: storedAssess.cert || clone(REP_CERT),
      pools: storedAssess.pools || clone(POOL_CONFIG),
      approved: storedAssess.approved || [],
      retired: storedAssess.retired || [],
      custom: storedAssess.custom || [],
      run: null
    }
  };
  function saveAssess() {
    save('merz_assess', { threshold: S.assess.threshold, cert: S.assess.cert, pools: S.assess.pools, approved: S.assess.approved, retired: S.assess.retired, custom: S.assess.custom });
  }
  /* --------------------------------------------------------- product access
     Role-based entitlement: an admin assigns which medicines each rep may
     handle. The signed-in rep only sees products in S.access. */
  /* Access decisions are delegated to the service layer (the single enforcement
     point). Views read from it; they never re-implement the security filter. */
  const SVC = window.MerzService;
  const canAccess = (pid) => SVC.canAccessProduct(pid);
  const accessProducts = () => { const g = SVC.grantedProductSlugs(); return ALL_PRODUCTS.filter((p) => g.indexOf(p) !== -1); };
  function syncAccessFromUsers() {
    const me = S.users.find((u) => u.name === CURRENT_REP);
    const slugs = (me && me.products && me.products.length ? me.products : ALL_PRODUCTS).slice();
    S.access = slugs; save('merz_access', S.access);
    const karim = SVC.userByName(CURRENT_REP);
    if (karim) SVC.setBrandGrants(karim.id, slugs); // write grants through the service
  }
  /* Keep the service session aligned with the active persona so role and
     permission-set checks resolve against the right user. */
  let _lastSessionRole = null;
  function syncSession() {
    const role = roleOfView(S.view);
    if (role === _lastSessionRole) return;
    _lastSessionRole = role;
    SVC.setSession({ rep: CURRENT_REP, mgr: 'Bahaa K.', adm: 'Fouad J.' }[role] || CURRENT_REP);
  }

  const allQuestions = () => QUESTIONS.concat(S.assess.custom);
  function qStatus(q) {
    if (S.assess.retired.indexOf(q.id) !== -1) return 'retired';
    if (q.origin === 'ai' && q.status === 'draft') return S.assess.approved.indexOf(q.id) !== -1 ? 'active' : 'draft';
    return q.status;
  }

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
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeProfile(); } });

  const prodDot = (p) => dot(PRODUCTS[p].color, 9);

  function setTheme(t) {
    S.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('merz_theme', t); } catch (e) {}
    render();
    if (document.getElementById('popov')) openProfile(); // keep menu in sync
  }

  /* ------------------------------------------------------------ profile menu */
  function profileMenuHtml() {
    const role = roleOfView(S.view), p = PERSONA[role];
    const seg = [['rep', 'users', 'Rep'], ['mgr', 'barChart', 'Manager'], ['adm', 'settings', 'Admin']];
    return `
      <div class="pm-head"><div class="av">${p[0]}</div><div><div class="nm">${p[1]}</div><div class="rl">${p[2]}</div></div></div>
      <div class="pm-div"></div>
      <div class="pm-sec"><div class="pm-lbl">View as</div><div class="pm-opts">
        ${seg.map((s) => `<button class="pm-opt ${role === s[0] ? 'on' : ''}" data-action="persona" data-p="${s[0]}">${ic(s[1], 16)} ${s[2]}${role === s[0] ? `<span class="chk">${ic('check', 15)}</span>` : ''}</button>`).join('')}
      </div></div>
      <div class="pm-div"></div>
      <div class="pm-sec"><div class="pm-lbl">Appearance</div><div class="seg">
        <button class="segbtn ${S.theme === 'light' ? 'on' : ''}" data-action="settheme" data-t="light">${ic('sun', 15)} Light</button>
        <button class="segbtn ${S.theme === 'dark' ? 'on' : ''}" data-action="settheme" data-t="dark">${ic('moon', 15)} Dark</button>
      </div></div>
      <div class="pm-div"></div>
      <div class="pm-sec"><button class="pm-opt" data-action="tour">${ic('sparkles', 16)} Replay product tour</button></div>
      <div class="pm-div"></div>
      <div class="pm-sec"><button class="pm-opt" data-action="logout">${ic('logOut', 16)} Sign out</button></div>`;
  }
  function openProfile() {
    closeProfile();
    const ov = document.createElement('div');
    ov.className = 'pop-overlay'; ov.id = 'popov';
    ov.innerHTML = '<div class="profile-menu">' + profileMenuHtml() + '</div>';
    ov.addEventListener('click', (e) => { if (e.target === ov) closeProfile(); });
    document.body.appendChild(ov);
  }
  function closeProfile() { const o = document.getElementById('popov'); if (o) o.remove(); }

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

  const isCompare = (t) => /\bcompare\b|\bversus\b|\bvs\.?\b/i.test(t || '');
  function provenanceLabel(entry) {
    const titles = (entry.sources || []).map((s) => (s.title || '').toLowerCase());
    if (titles.some((t) => /product information|label|leaflet|monograph/.test(t))) return 'directly from the approved label';
    if (titles.some((t) => /medical affairs|approved answer/.test(t))) return 'from a Medical Affairs answer';
    if (titles.some((t) => /training|guide/.test(t))) return 'from approved training material';
    return 'from approved sources';
  }
  const headingPath = (entry, s) => [PRODUCTS[entry.product] ? PRODUCTS[entry.product].name : entry.product, entry.category || 'general', s.title].join(' › ');
  const trimSnippet = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > (n || 130) ? t.slice(0, n || 130).replace(/\s\S*$/, '') + '…' : t; };

  /* Comparison intent → columnar per-brand template (Part D1, ASK-15). Only
     products the rep is granted are eligible as columns (scoped in service). */
  function referencedProducts(text) {
    const q = ' ' + text.toLowerCase() + ' ';
    const granted = SVC.grantedProductSlugs();
    const prods = SVC.products().filter((p) => granted.indexOf(p.slug) !== -1);
    const hit = prods.filter((p) => q.indexOf(' ' + p.display_name.toLowerCase()) !== -1 || (p.aliases || []).some((a) => a && q.indexOf(a) !== -1));
    if (hit.length >= 2) return hit;
    if (/\bbrands?\b|portfolio|competitor|neurotoxin|filler|biostimulator/.test(q)) return prods.filter((p) => !p.is_competitor).slice(0, 4);
    return hit;
  }
  function buildComparison(text) {
    const prods = referencedProducts(text);
    if (prods.length < 2) return null;
    const cols = prods.slice(0, 4).map((p) => {
      const hits = SVC.retrieveChunks(text, { productSlug: p.slug, topK: 1 });
      const sources = SVC.chunks().filter((c) => c.product_slug === p.slug).length;
      return { slug: p.slug, name: p.display_name, category: p.category || '—', bestFor: p.description || '—', sources: sources, point: hits[0] ? trimSnippet(hits[0].chunk.text) : 'No approved detail retrieved.' };
    });
    return { cols: cols };
  }
  function comparisonHtml(cmp) {
    const cols = cmp.cols;
    const th = cols.map((c) => `<th>${esc(c.name)}</th>`).join('');
    const rowvals = (fn) => cols.map((c) => `<td>${fn(c)}</td>`).join('');
    return `<div class="cmpwrap"><div class="gh">${ic('compare', 14)} Side-by-side comparison</div>
      <div class="cmpscroll"><table class="cmptable">
        <tr><th class="rl">Approved dimension</th>${th}</tr>
        <tr><td class="rl">Category</td>${rowvals((c) => esc(c.category))}</tr>
        <tr><td class="rl">Best for</td>${rowvals((c) => esc(c.bestFor))}</tr>
        <tr><td class="rl">Approved sources</td>${rowvals((c) => c.sources + ' indexed')}</tr>
        <tr><td class="rl">Key approved point</td>${rowvals((c) => esc(c.point))}</tr>
      </table></div>
      <div class="disc">${ic('info', 15)}<span>Comparison is assembled from each product's approved sources, scoped to the medicines assigned to you. Present only claims that appear in the locally approved label.</span></div></div>`;
  }

  function resolve(text, forcedEntryId) {
    /* Part D1 step 1 — guardrail classifier. Off-label / PV / injection are all
       LOGGED (ComplianceFlag), never silently dropped. */
    const injection = SVC.detectInjection(text);
    const pv = detectPV(text);
    const offlabel = detectOffLabel(text);
    if (injection) SVC.logComplianceFlag({ input_text: text, flag_type: 'injection', threadId: S.chat && S.chat.cid });
    if (offlabel) SVC.logComplianceFlag({ input_text: text, flag_type: 'off_label', threadId: S.chat && S.chat.cid });
    if (pv) SVC.logComplianceFlag({ input_text: text, flag_type: 'pv', threadId: S.chat && S.chat.cid });
    // Injection attempts are refused (no retrieval, no generation) but surfaced.
    if (injection) return { entry: null, injection: true, pv: pv, offlabel: offlabel, gap: false, denied: null, trace: null };

    // Comparison intent → columnar template (short-circuits the prose answer).
    if (isCompare(text)) {
      const comparison = buildComparison(text);
      if (comparison) {
        SVC.logAnswer({ question: text, product: comparison.cols.map((c) => c.slug).join('+'), confidence: 'High', template: 'comparison' });
        const totalSources = comparison.cols.reduce((s, c) => s + c.sources, 0);
        const trace = { count: totalSources, secs: ((3600 + Math.random() * 1400) / 1000).toFixed(1), confidence: 'High', provenance: 'across approved sources', top: 0 };
        return { entry: null, comparison: comparison, pv: pv, offlabel: offlabel, injection: false, gap: false, denied: null, trace: trace, compare: true };
      }
    }

    let entry = null;
    if (forcedEntryId) entry = KB.concat(OBJECTIONS).find((e) => e.id === forcedEntryId) || null;
    if (!entry) entry = matchEntry(text);
    /* Part D1 step 2 — brand-grant scoping enforced at retrieval by the service.
       A denied product is an authorization boundary, NOT a content gap. */
    let denied = null;
    if (entry) {
      const auth = SVC.authorizeRetrieval(entry.product);
      if (!auth.allowed) { denied = { product: entry.product, reason: auth.reason }; entry = null; }
    }
    /* Part D1 steps 3–6 — vector retrieve (scoped), confidence, provenance, log. */
    let trace = null;
    if (entry) {
      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const hits = SVC.retrieveChunks(text, { productSlug: entry.product, topK: 4 });
      const elapsed = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0;
      const top = hits[0] ? hits[0].score : 0;
      const confidence = top >= 0.2 ? 'High' : top >= 0.09 ? 'Medium' : 'Low';
      trace = {
        count: Math.max(entry.sources.length, hits.length),
        secs: ((elapsed + 3600 + Math.random() * 1400) / 1000).toFixed(1),
        confidence: confidence, top: top, provenance: provenanceLabel(entry)
      };
      SVC.logAnswer({ question: text, product: entry.product, confidence: confidence, template: isCompare(text) ? 'comparison' : 'standard' });
    }
    return { entry, pv, offlabel, injection: false, gap: !entry && !denied, denied, trace, compare: isCompare(text) };
  }

  /* =====================================================================
     NAVIGATION
     ===================================================================== */
  function go(view) { S.view = view; S.navOpen = false; render(); window.scrollTo(0, 0); const m = $('.main'); if (m) m.scrollTop = 0; }

  function askQuestion(text, forcedEntryId) {
    text = (text || '').trim();
    if (!text) return;
    if (!S.chat || !S.chat.turns) S.chat = { cid: 'c-' + Math.random().toString(36).slice(2, 9), turns: [] };
    const turn = { question: text, resolved: null, stage: 'searching', mode: 'hcp', drawerOpen: false };
    S.chat.turns.push(turn);
    S.view = 'chat'; S.navOpen = false;
    render();
    setTimeout(() => {
      turn.resolved = resolve(text, forcedEntryId);
      // Part D1 step 6 — stage the reveal: retrieval trace + confidence first,
      // then the answer body resolves (mimics streaming).
      if (turn.resolved.entry || turn.resolved.comparison) {
        turn.stage = 'trace'; render();
        setTimeout(() => { turn.stage = 'full'; render(); const m = $('.main'); if (m) m.scrollTop = m.scrollHeight; }, 650);
      } else {
        turn.stage = 'full'; render();
        const m = $('.main'); if (m) m.scrollTop = m.scrollHeight;
      }
    }, 650);
  }
  function newQuestion() { S.chat = null; S.view = 'home'; S.navOpen = false; render(); setTimeout(() => { const i = $('#askInput'); if (i) i.focus(); }, 30); }

  const ADMIN_VIEWS = ['adm', 'assess', 'products', 'kb', 'kbadd'];
  const roleOfView = (v) => (v === 'mgr' ? 'mgr' : ADMIN_VIEWS.indexOf(v) !== -1 ? 'adm' : 'rep');

  /* =====================================================================
     SHELL: sidebar + appbar
     ===================================================================== */
  function sidebar(role, active, activeProduct) {
    const repNav = [['home', 'home', 'Home'], ['chat', 'chat', 'Chat history'], ['lib', 'library', 'Library'], ['cert', 'award', 'Certification']];
    const badge = PERSONA[role];
    let showProds = true, gate = '';
    if (role === 'mgr') { showProds = false; gate = `<div class="gate"><a data-action="nav" data-view="mgr" class="on"><span class="ic">${ic('barChart', 17)}</span> Team Pulse</a></div>`; }
    else if (role === 'adm') { showProds = false; gate = `<div class="gate"><a data-action="nav" data-view="mgr"><span class="ic">${ic('barChart', 17)}</span> Team Pulse</a><a data-action="nav" data-view="assess" class="${active === 'assess' ? 'on' : ''}"><span class="ic">${ic('graduationCap', 17)}</span> Assessments</a><a data-action="nav" data-view="products" class="${active === 'products' ? 'on' : ''}"><span class="ic">${ic('clipboardList', 17)}</span> Products</a><a data-action="nav" data-view="kb" class="${active === 'kb' || active === 'kbadd' ? 'on' : ''}"><span class="ic">${ic('layers', 17)}</span> Knowledge base</a><a data-action="nav" data-view="adm" class="${active === 'adm' ? 'on' : ''}"><span class="ic">${ic('settings', 17)}</span> Admin</a></div>`; }

    const navHtml = repNav.map((n) =>
      `<a data-action="nav" data-view="${n[0]}" class="${active === n[0] ? 'on' : ''}"><span class="ic">${ic(n[1], 17)}</span> ${n[2]}</a>`
    ).join('');

    const myProds = accessProducts();
    const prodHtml = !showProds ? '' : `
      <div class="sideprods"><div class="h">Products</div>
        ${myProds.map((pid) => { const p = PRODUCTS[pid];
          return `<div class="sp ${activeProduct === p.id ? 'active' : ''}" data-action="prod" data-product="${p.id}">${prodDot(p.id)}${p.name}<span class="tag2">${p.code}</span></div>`;
        }).join('')}
        <div class="sidehint">${myProds.length < ALL_PRODUCTS.length ? `You're assigned ${myProds.length} of ${ALL_PRODUCTS.length} products by your admin. ` : ''}Tapping a product starts a new question scoped to it.</div></div>`;

    return `<aside class="side">
      <div class="logo"><div class="wordmark" data-action="nav" data-view="home"><span class="l1">MERZ</span><span class="l2">AESTHETICS<span class="reg">&reg;</span></span></div><span class="exp">EXPERT</span></div>
      <button class="newq" data-action="newq">${ic('plus', 16)} New question</button>
      <div class="nav">${navHtml}${gate}</div>
      ${prodHtml}
      <div class="rolebadge" data-action="profile" style="cursor:pointer"><div class="av">${badge[0]}</div><div><div class="nm">${badge[1]}</div><div class="rl">${badge[2]}</div></div></div>
    </aside>`;
  }

  function appbar(role) {
    return `<header class="appbar">
      <div class="appbar-left">
        <button class="tbtn hamburger" data-action="togglenav" title="Menu">${ic('panelLeft', 18)}</button>
        <span class="appbar-brand">MERZ</span>
      </div>
      <div class="appbar-right">
        <span class="appbar-env">UAE · Pilot</span>
        <button class="tbtn" data-action="bell" title="Notifications">${ic('bell', 18)}<span class="b"></span></button>
        <button class="avatarbtn" data-action="profile" title="Profile &amp; settings">${PERSONA[role][0]}</button>
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

    const asked = TEAM_ASKED.filter((t) => canAccess(t.product)).map((t) =>
      `<div class="row" data-action="ask" data-entry="${t.entry}" data-q="${esc(t.q)}"><span class="bic" style="background:${PRODUCTS[t.product].bg};color:${PRODUCTS[t.product].color}">${PRODUCTS[t.product].letter}</span>${esc(t.q)}<span class="n">${t.n} asks</span><span class="ar">${ic('chevronRight', 16)}</span></div>`
    ).join('');

    const savedHtml = S.saved.length
      ? S.saved.map((s) => `<div class="s" data-action="ask" data-entry="${s.entryId}" data-q="${esc(s.q)}"><span>${esc(s.q)}</span> ${ic('chevronRight', 15)}</div>`).join('')
      : `<div class="empty">No saved answers yet. Save an answer from any chat to pin it here.</div>`;

    const brands = accessProducts().map((pid) => { const p = PRODUCTS[pid];
      return `<div class="bcard"><div class="bar" style="background:${p.color}"></div><div class="in">
        <div class="hd"><div class="ic" style="background:${p.bg};color:${p.color}">${p.letter}</div><div><div class="nm">${p.name}</div><div class="cat2">${p.cat2}</div></div></div>
        <div class="q" data-action="ask" data-q="${esc(p.spark)}">${esc(p.spark)} ${ic('chevronRight', 15)}</div>
        <div class="appr">${ic('check', 13)} UAE-approved · Reviewed ${p.reviewed}</div></div></div>`;
    }).join('');

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
      ${asked ? `<div class="seclbl mono">TEAM ASKED THIS WEEK</div><div class="asked">${asked}</div>` : ''}
      <div class="two-col">
        ${canAccess('belotero') ? `<div class="cont"><div class="bub">${ic('messageSquare', 18)}</div><div class="tx"><div class="q">Belotero layering technique for lip definition</div><div class="meta">Belotero · last active just now</div></div><button class="go" data-action="ask" data-entry="bel-layering-lip" data-q="Belotero layering technique for lip definition">Continue</button></div>` : ''}
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
      ${r.entry ? pill('trust', `${ic('check', 13)} ${r.entry.sources.length} approved source${r.entry.sources.length > 1 ? 's' : ''} · UAE label checked`) : (r.denied ? pill('mkt', `${ic('lock', 12)} Restricted`) : pill('mkt', 'No approved answer yet'))}
      ${r.entry ? pill('rev', `${ic('clock', 12)} Source set reviewed 3 Jul 2026`) : ''}
    </div>
    <div class="qtitle">${esc(turn.question)}</div>`;

    if (r.denied) {
      const dp = PRODUCTS[r.denied.product];
      out += `<div class="abox"><div class="gband" style="border-left-color:var(--warn-ink)"><div class="gh">${ic('lock', 13)} Not in your assigned products</div>
        <div class="lead"><b>${esc(dp ? dp.name : 'This product')}</b> isn't among the medicines your admin has assigned to you, so its approved sources aren't retrievable from your account. Contact your admin if you need this access.</div></div>
        <div class="disc">${ic('info', 15)}<span>Access is enforced when sources are <b>retrieved</b> — not just hidden in the menu. This request was blocked at the retrieval layer.</span></div></div>
        <div class="actrow"><div class="abtn" data-action="nav" data-view="lib">${ic('library', 14)} Browse your assigned Library</div></div>`;
      return out;
    }

    if (r.injection) {
      out += `<div class="warnband ol"><div class="wh">${ic('shield', 14)} Input flagged — not run as a question</div>
        Your message looks like an attempt to change the assistant's instructions or extract its configuration. It was <b>not</b> run against the knowledge base. The input has been logged for compliance review.</div>
        <div class="disc">${ic('info', 15)}<span>Adversarial inputs (prompt injection) are detected, logged and surfaced to admins — never silently dropped.</span></div>`;
      return out;
    }

    // Retrieval trace + confidence chrome (renders before the body resolves).
    if (r.trace) {
      out += `<div class="tracewrap">
        <span class="tracechip" data-action="drawer" title="Show the sources this drew on">${ic('search', 13)} Researched ${r.trace.count} source${r.trace.count > 1 ? 's' : ''} · ${r.trace.secs}s ${ic('chevronDown', 12)}</span>
        <span class="confbadge ${r.trace.confidence.toLowerCase()}"><span class="cdot"></span> ${r.trace.confidence} confidence · ${esc(r.trace.provenance)}</span>
      </div>`;
    }
    // Staged reveal: after the trace shows, the answer body composes.
    if (turn.stage === 'trace' && (r.entry || r.comparison)) {
      out += `<div class="composing"><div class="dots"><i></i><i></i><i></i></div> Composing the approved answer…</div>`;
      return out;
    }

    if (r.pv) {
      out += `<div class="warnband pv"><div class="wh">${ic('shieldAlert', 14)} Possible adverse event / product complaint</div>
        Your wording suggests a possible adverse event or product complaint. This must be reported through the dedicated pharmacovigilance flow — do not rely on a chat answer or delay formal reporting.
        <br><button class="wbtn" data-action="pv">${ic('shieldAlert', 14)} Start adverse event report</button></div>`;
    }
    if (r.offlabel) {
      out += `<div class="warnband ol"><div class="wh">${ic('alertTriangle', 14)} Potentially off-label</div>
        A question about <b>${esc(PRODUCTS[r.offlabel.product].name)} — ${esc(r.offlabel.area)}</b> may fall outside the locally approved indication. ${esc(r.offlabel.note)} Present only approved indications. This question is <b>not auto-routed to Medical Affairs</b> — it's logged in the admin panel so Medical Affairs can review it there. Raise it yourself if the HCP needs more.</div>`;
    }

    if (r.comparison) {
      out += comparisonHtml(r.comparison);
      out += `<div class="seclbl mono">SUGGESTED FOLLOW-UPS</div><div class="fups">${['What are the contraindications?', 'Show approved indications by product', 'Which is best for a specific area?'].map((f) => `<div class="fup" data-action="ask" data-q="${esc(f)}">${esc(f)}</div>`).join('')}</div>`;
      return out;
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

      const foots = (e.sources || []).map((s) => `<div class="foot"><sup>${s.n}</sup><span>${esc(headingPath(e, s))}</span></div>`).join('');
      out += `<div class="spbox"><div class="gh">Supporting points</div>${pts}${note}
        <div class="footnotes"><div class="fh mono">Citations</div>${foots}</div>
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
            <div class="t2">${esc(s.title)}</div><div class="meta">${esc(s.meta)}</div>
            <div class="hpath">${ic('layers', 11)} ${esc(headingPath(active.resolved.entry, s))}</div><div class="ex">"${esc(s.excerpt)}"</div>
            <div class="db"><span class="dbtn dark" data-action="opendoc" data-title="${esc(s.title)}" data-meta="${esc(s.meta)}" data-ex="${esc(s.excerpt)}">${ic('externalLink', 12)} ${esc(s.doc)}</span><span class="dbtn" data-action="ask" data-q="${esc('Tell me more about ' + s.title)}">${ic('messageSquare', 12)} Ask about this</span><span class="dbtn" data-action="nav" data-view="lib">${ic('bookOpen', 12)} View in Library</span></div></div>`
        ).join('')}</div>`
      : '';

    const backdrop = (active.resolved && active.resolved.entry && active.drawerOpen) ? '<div class="drawer-backdrop" data-action="drawer"></div>' : '';
    const brandName = active.resolved && active.resolved.entry ? PRODUCTS[active.resolved.entry.product].name
      : (active.resolved && active.resolved.comparison ? 'Comparison' : 'Your products');
    const memory = turns.length;
    return `<div class="chatlayout"><div class="chatmain">
        <div class="threadhead">
          <button class="backbtn" data-action="newq">${ic('arrowLeft', 15)} New question</button>
          <span class="threadmeta">${esc(brandName)} · thread started just now</span>
          <span class="mempill" title="Retained context items in this thread">${ic('layers', 12)} Memory ${memory}</span>
        </div>
        ${history}${body}
        <div class="ask"><input id="askInput" placeholder="Ask a follow-up${active.resolved && active.resolved.entry ? ' about ' + PRODUCTS[active.resolved.entry.product].name : ''}..." autocomplete="off"><span class="mic" data-action="mic">${ic('mic', 18)}</span><span class="go" data-action="asksend">${ic('send', 18)}</span></div>
        <div class="voicehint">${ic('volume', 12)} Voice transcribes to text for your confirmation before sending.</div>
      </div>${backdrop}${drawer}</div>`;
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
      if (!canAccess(d.product)) return false;
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
    const recent = DOCS.filter((d) => d.isNew && canAccess(d.product));
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
            ${[['xeomin', 'Xeomin reconstitution table', 'xeo-reconstitution'], ['radiesse', 'Radiesse dilution guide', 'rad-dilution'], ['belotero', 'Belotero portfolio overview', 'bel-overview'], ['ultherapy', 'Ultherapy treatment-depth reference', 'ult-overview']].filter((r) => canAccess(r[0])).map((r) =>
              `<div class="lrow" data-action="ask" data-entry="${r[2]}" data-q="${esc(r[1])}"><span class="bic" style="background:${PRODUCTS[r[0]].bg};color:${PRODUCTS[r[0]].color}">${PRODUCTS[r[0]].letter}</span>${esc(r[1])}<span class="n2">${ic('chevronRight', 15)}</span></div>`
            ).join('')}</div>
          <div class="lpanel"><div class="h">${ic('bookmark', 14)} Your saved resources</div>
            <div class="lrow" data-action="opendoc" data-title="Xeomin UAE label (May 2026)" data-meta="Regulatory · Xeomin · UAE"><span class="bic" style="background:var(--p1-bg);color:var(--p1)">X</span>Xeomin UAE label (May 2026)<span class="n2">${ic('chevronRight', 15)}</span></div>
            <div class="lrow" data-action="opendoc" data-title="Radiesse hands indication study" data-meta="Clinical evidence · Radiesse"><span class="bic" style="background:var(--p3-bg);color:var(--p3)">R</span>Radiesse hands indication study<span class="n2">${ic('chevronRight', 15)}</span></div>
            <div class="lrow" style="color:var(--gray)">Saved answers live on Home · documents live here</div></div>
        </div>
        <div class="seclbl mono">BROWSE BY PRODUCT</div>
        <div class="lbrands">${accessProducts().map((pid) => { const p = PRODUCTS[pid];
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

  const MGR_COLS = [
    { k: 'q30', th: 'Questions (30d)', td: (r) => r.q30 },
    { k: 'completion', th: 'Completion (this quarter)', td: (r) => r.completion },
    { k: 'last', th: 'Last active', td: (r) => r.last },
    { k: 'cert', th: 'Certification', td: (r) => certGroup(r.cert) },
    { k: 'next', th: 'Next assessment', td: (r) => nextCell(r.next) }
  ];
  const parseDays = (s) => { s = s.toLowerCase(); if (s.indexOf('never') >= 0) return 999; if (s.indexOf('just now') >= 0 || s === 'today') return 0; if (s.indexOf('yesterday') >= 0) return 1; const m = s.match(/(\d+)\s*day/); return m ? +m[1] : 0; };

  function viewManager() {
    const cols = MGR_COLS.filter((c) => S.mgrCols[c.k]);
    const head = `<tr><th>Rep</th><th>Profile</th>${cols.map((c) => `<th>${c.th}</th>`).join('')}</tr>`;
    const rows = REPS.map((r, i) =>
      `<tr data-action="rep" data-i="${i}" style="cursor:pointer"><td>${r.name}</td><td><span class="profb ${r.profile}">${r.profile === 'mb' ? 'MULTI-BRAND' : 'ULTHERAPY ONLY'}</span></td>${cols.map((c) => `<td>${c.td(r)}</td>`).join('')}</tr>`
    ).join('');
    const signals = KNOWLEDGE_SIGNALS.map((s) =>
      `<div class="topic"><span style="width:165px">${esc(s.topic)}${s.focus ? '<span class="focus">TRAINING FOCUS</span>' : ''}</span><div class="bar-wrap"><div class="bar-fill" style="width:${s.pct}%"></div></div><span class="n">${s.n}</span></div>` +
      (s.note ? `<div style="font-size:10.5px;color:var(--ink-soft);margin:-3px 0 9px 2px">${esc(s.note)}</div>` : '')
    ).join('');
    const gaps = CONTENT_GAPS.map((g) => `<div class="gap"><span>${esc(g.label)}</span><span class="gst ${g.st}">${g.text}</span></div>`).join('');
    const comp = COMPETITIVE.map((c) => `<div class="comp"><span>${esc(c.label)}</span><span class="n">${c.n}</span></div>`).join('');

    const active = REPS.filter((r) => r.q30 > 0 && parseDays(r.last) <= S.activityDays);
    const inactive = REPS.filter((r) => !(r.q30 > 0 && parseDays(r.last) <= S.activityDays));
    const adoption = `<div class="panel"><h3>Adoption — named active vs non-active
        <span class="cfg-inline">Active = asked &ge; 1 question in last <button class="btn-sm sq" data-action="actdays" data-d="-1">&minus;</button> <b>${S.activityDays}</b> <button class="btn-sm sq" data-action="actdays" data-d="1">+</button> days</span></h3>
      <div class="adopt-grid">
        <div><div class="adopt-h good">${ic('checkCircle', 14)} Active (${active.length})</div>${active.map((r) => `<div class="adopt-row"><span>${r.name}</span><span class="muted">${r.last}</span></div>`).join('')}</div>
        <div><div class="adopt-h bad">${ic('alertTriangle', 14)} Needs follow-up (${inactive.length})</div>${inactive.map((r) => `<div class="adopt-row"><span>${r.name}</span><span class="muted">${r.last}</span><button class="btn-sm" data-action="nudge" data-name="${esc(r.name)}">Remind</button></div>`).join('')}</div></div>
      <div style="font-size:10.5px;color:var(--gray);margin-top:8px">Tracked fields and the activity window are configurable, not hard-coded. Managers follow up with non-users by name.</div></div>`;

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
      <div class="panel"><h3>Reps <span class="flt" data-action="mgrfields">${ic('columns', 12)} Configure fields</span></h3>
        <div class="tablewrap"><table>${head}${rows}</table></div></div>
      ${adoption}
      <div class="mgr-grid">
        <div class="panel"><h3>Team knowledge signals</h3>${signals}</div>
        <div><div class="panel" style="margin-bottom:13px"><h3>Competitive pressure (30d)</h3>${comp}</div>
          <div class="panel"><h3>Content gaps (visibility)</h3>${gaps}</div></div></div>
      <div class="callout"><b>Completion vs certification:</b> completion = assigned vs completed (engagement); certification = pass rate against the 80% per-brand bar (performance). Click any rep row for detail. Fields and the activity window are configurable.</div>`;
  }
  function fieldsModal() {
    openModal(`<div class="mhd"><div><div class="mt">${ic('columns', 20)} Configure tracked fields</div><div class="msub">Show or hide columns — config, not a code change</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="pm-opts">${MGR_COLS.map((c) => `<button class="pm-opt ${S.mgrCols[c.k] ? 'on' : ''}" data-action="togcol" data-k="${c.k}">${ic(S.mgrCols[c.k] ? 'eye' : 'eyeOff', 15)} ${c.th}${S.mgrCols[c.k] ? `<span class="chk">${ic('check', 15)}</span>` : ''}</button>`).join('')}</div>
        <div class="mbanner blue" style="margin-top:12px">${ic('info', 16)}<span>Rep and Profile are always shown. Additional data points Ahmed sends can be added here without a code change.</span></div>
        <div class="mactions"><button class="mbtn primary" data-action="close">Done</button></div></div>`);
  }

  /* =====================================================================
     PRODUCTS — catalog (PROD-1..4)
     ===================================================================== */
  function prodRow(p) {
    const typeBadge = p.is_competitor ? '<span class="tbadge comp">competitor</span>' : '<span class="tbadge own">own</span>';
    const statusBadge = p.is_active ? '<span class="sbadge on">active</span>' : '<span class="sbadge off">archived</span>';
    const act = p.is_active
      ? `<button class="btn-sm" data-action="editprod" data-slug="${esc(p.slug)}">${ic('pencil', 12)} Edit</button><button class="btn-sm warn" data-action="deactprod" data-slug="${esc(p.slug)}">${ic('ban', 12)} Deactivate</button>`
      : `<button class="btn-sm" data-action="editprod" data-slug="${esc(p.slug)}">${ic('pencil', 12)} Edit</button><button class="btn-sm" data-action="reactprod" data-slug="${esc(p.slug)}">${ic('refreshCw', 12)} Reactivate</button>`;
    return `<div class="prow${p.is_active ? '' : ' archived'}">
      <span class="pn">${esc(p.display_name)}${p.aliases && p.aliases.length ? `<span class="palias">aka ${esc(p.aliases.join(', '))}</span>` : ''}</span>
      <span class="ps code">${esc(p.slug)}</span>
      <span class="pc">${esc(p.category || '—')}</span>
      <span>${typeBadge}</span>
      <span>${statusBadge}</span>
      <span class="pa">${act}</span></div>`;
  }

  function viewProducts() {
    const f = S.prodFilter;
    const items = SVC.products();
    const list = MerzUI.filteredListHtml({
      items: items, query: f.q,
      searchKeys: ['display_name', 'slug', (p) => (p.aliases || []).join(' ')],
      searchAction: 'prodsearch', searchId: 'prodInput', icon: ic('search', 16),
      searchPlaceholder: 'Search products, slugs, aliases…',
      filters: [
        { value: f.type, action: 'prodftype', label: f.type === 'all' ? 'All types' : (f.type === 'own' ? 'Own' : 'Competitor'),
          match: (p, v) => v === 'all' ? true : (v === 'own' ? !p.is_competitor : p.is_competitor) },
        { value: f.status, action: 'prodfstat', label: f.status === 'all' ? 'All status' : (f.status === 'active' ? 'Active' : 'Archived'),
          match: (p, v) => v === 'all' ? true : (v === 'active' ? p.is_active : !p.is_active) }
      ],
      countLabel: (n, total) => n + ' of ' + total + ' products',
      rowRenderer: prodRow,
      emptyHtml: '<div class="fl-empty">No products match.</div>'
    });
    return `
      <div class="hero"><div class="date mono">ADMIN · PRODUCTS</div><h1>Product catalog</h1>
        <div class="sub">The catalog of products/medicines. Each drives the upload dropdown, the blob naming, and the product tag on every chunk. Deactivating hides a product from new uploads and access grants without deleting its history.</div></div>
      <div class="prodtop"><button class="btn-dark" data-action="addprod">${ic('plus', 14)} Add product</button></div>
      <div class="prodhead"><span>Product</span><span>Slug</span><span>Category</span><span>Type</span><span>Status</span><span></span></div>
      ${list}
      <div class="callout"><b>Slug is the immutable primary key</b> — baked into blob names and chunk metadata; renaming touches the display name only. Competitor products are first-class so objection-handling content can be indexed against them. Deactivate ≠ delete: history and existing chunks survive.</div>`;
  }

  function productModal(slug) {
    const p = slug ? SVC.productBySlug(slug) : null;
    const isEdit = !!p;
    openModal(`<div class="mhd"><div><div class="mt">${ic(isEdit ? 'pencil' : 'plus', 20)} ${isEdit ? 'Edit product' : 'Add product'}</div><div class="msub">${isEdit ? esc(p.display_name) : 'Create a catalog entry'}</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody">
        <div class="mrow">
          <div class="fld"><label>Slug ${isEdit ? '<span class="lockpill">' + ic('lock', 11) + ' immutable</span>' : '<span class="req">*</span>'}</label>
            ${isEdit ? `<input id="pmSlug" class="code" value="${esc(p.slug)}" readonly disabled>` : `<input id="pmSlug" class="code" placeholder="e.g. new-filler">`}
            ${isEdit ? '' : '<div class="hint">Lowercase letters, numbers, hyphens. Immutable once created — it is baked into blob names + chunk metadata.</div>'}</div>
          <div class="fld"><label>Display name <span class="req">*</span></label><input id="pmName" value="${isEdit ? esc(p.display_name) : ''}" placeholder="Display name"></div>
        </div>
        <div class="mrow">
          <div class="fld"><label>Category</label><input id="pmCat" value="${isEdit ? esc(p.category) : ''}" placeholder="e.g. HA Filler"></div>
          <div class="fld"><label>Sort order</label><input id="pmSort" type="number" value="${isEdit ? esc(p.sort_order) : items_len()}"></div>
        </div>
        <div class="fld"><label>Aliases (comma-separated)</label><input id="pmAliases" value="${isEdit ? esc((p.aliases || []).join(', ')) : ''}" placeholder="brandname, common misspelling"><div class="hint">Drives query-time entity matching, including misspellings.</div></div>
        <div class="fld"><label>Description</label><textarea id="pmDesc" rows="2" placeholder="Short description">${isEdit ? esc(p.description) : ''}</textarea></div>
        <div class="mrow">
          <label class="chkline"><input type="checkbox" id="pmComp" ${isEdit && p.is_competitor ? 'checked' : ''}> Competitor product</label>
          ${isEdit ? `<label class="chkline"><input type="checkbox" id="pmActive" ${p.is_active ? 'checked' : ''}> Active</label>` : ''}
        </div>
        <div class="merr" id="pmErr">Please complete the required fields.</div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn primary" data-action="prodsave" ${isEdit ? `data-slug="${esc(slug)}"` : ''}>${isEdit ? 'Save changes' : 'Add product'}</button></div>
      </div>`);
  }
  function items_len() { return SVC.products().length; }

  function prodSave(slug) {
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const chk = (id) => { const e = document.getElementById(id); return e ? e.checked : false; };
    const data = { display_name: v('pmName'), category: v('pmCat'), sort_order: v('pmSort'), aliases: v('pmAliases'), description: v('pmDesc'), is_competitor: chk('pmComp') };
    let res;
    if (slug) { data.is_active = chk('pmActive'); res = SVC.updateProduct(slug, data); }
    else { data.slug = v('pmSlug'); res = SVC.addProduct(data); }
    if (!res.ok) { const e = document.getElementById('pmErr'); if (e) { e.textContent = res.error; e.classList.add('show'); } return; }
    closeModal(); toast(slug ? 'Product updated' : 'Product added to the catalog', 'good'); render();
  }

  function kbUpload() {
    const fileEl = document.getElementById('kbFile');
    const prod = (document.getElementById('kbProduct') || {}).value || '';
    const path = (document.getElementById('kbPath') || {}).value || '';
    const file = fileEl && fileEl.files && fileEl.files[0];
    const err = document.getElementById('kbErr');
    if (!file || !prod) { if (err) { err.textContent = 'A file and a product are required.'; err.classList.add('show'); } return; }
    const finish = (text) => {
      const res = SVC.uploadDocument({ productSlug: prod, filename: file.name, blobPath: path, text: text });
      if (!res.ok) { if (err) { err.textContent = res.error; err.classList.add('show'); } return; }
      const id = res.doc.id;
      S.kb.parsingDocId = id; S.kb.tab = 'active'; S.kb.fileName = ''; S.kb.product = '';
      go('kb');
      toast(res.replaced ? 'Replacing the document at that path — parsing & indexing…' : 'Uploading — parsing & indexing…', 'good');
      setTimeout(() => { SVC.finalizeIngestion(id); if (S.kb.parsingDocId === id) S.kb.parsingDocId = null; render(); toast('Indexed — answers can now cite this document', 'good'); }, 2500);
    };
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'rtf' && file.text) { file.text().then(finish).catch(() => finish(null)); }
    else finish(null);
  }

  /* =====================================================================
     KNOWLEDGE BASE — vector store (KB-1..6)
     ===================================================================== */
  const STATUS_BADGE = {
    parsing: '<span class="sbadge parsing">parsing…</span>',
    active: '<span class="sbadge on">active</span>',
    archived: '<span class="sbadge off">archived</span>',
    failed: '<span class="sbadge fail">failed</span>'
  };
  function kbRow(d) {
    const prod = SVC.productBySlug(d.product_slug);
    const chunks = SVC.chunksForDocument(d.id).length;
    const act = d.status === 'archived'
      ? `<button class="btn-sm" data-action="kbrestore" data-id="${esc(d.id)}">${ic('refreshCw', 12)} Restore</button>`
      : (d.status === 'active' ? `<button class="btn-sm warn" data-action="kbarchive" data-id="${esc(d.id)}">${ic('ban', 12)} Archive</button>` : '');
    return `<div class="kbrow">
      <span class="kbn">${ic('fileText', 15)}<span class="kbnm"><b>${esc(d.filename)}</b><span class="kbpath code">${esc(d.blob_path)}</span></span></span>
      <span>${prod ? esc(prod.display_name) : esc(d.product_slug)}</span>
      <span>${STATUS_BADGE[d.status] || esc(d.status)}</span>
      <span class="kbc">${d.status === 'active' ? chunks + ' chunks' : (d.status === 'parsing' ? '—' : chunks + ' chunks')}</span>
      <span class="kbd">${esc(d.uploaded_at || '—')}</span>
      <span class="kba">${act}</span></div>`;
  }
  function viewKB() {
    const f = S.kb;
    const docs = SVC.documents();
    const activeCount = docs.filter((d) => d.status !== 'archived').length;
    const archivedCount = docs.filter((d) => d.status === 'archived').length;
    const shown = docs.filter((d) => f.tab === 'archived' ? d.status === 'archived' : d.status !== 'archived');
    const list = MerzUI.filteredListHtml({
      items: shown, query: f.q, searchKeys: ['filename', 'blob_path'],
      searchAction: 'kbsearch', searchId: 'kbInput', icon: ic('search', 16),
      searchPlaceholder: 'Filter by path…',
      countLabel: (n, total) => n + ' of ' + total + ' documents',
      rowRenderer: kbRow,
      emptyHtml: '<div class="fl-empty">No documents.</div>'
    });
    return `
      <div class="hero"><div class="date mono">ADMIN · KNOWLEDGE BASE</div><h1>Knowledge base</h1>
        <div class="sub">Every document in the vector store and its parse/embed status, newest first. Access to a document's answers is gated by the product it's namespaced under.</div></div>
      <div class="prodtop">
        <div class="kbtabs">
          <button class="kbtab ${f.tab === 'active' ? 'on' : ''}" data-action="kbtab" data-t="active">Documents <span class="c">${activeCount}</span></button>
          <button class="kbtab ${f.tab === 'archived' ? 'on' : ''}" data-action="kbtab" data-t="archived">Archived <span class="c">${archivedCount}</span></button>
        </div>
        <div class="kbtop-actions"><button class="btn-sm" data-action="kbrefresh">${ic('refreshCw', 13)} Refresh</button><button class="btn-dark" data-action="kbaddnav">${ic('plus', 14)} Add data to vector store</button></div>
      </div>
      <div class="kbhead"><span>Document</span><span>Product</span><span>Status</span><span>Chunks</span><span>Uploaded</span><span></span></div>
      ${list}`;
  }
  function viewKBAdd() {
    const parsing = S.kb.parsingDocId && SVC.documents().find((d) => d.id === S.kb.parsingDocId && d.status === 'parsing');
    const prodOpts = SVC.activeProducts().map((p) => `<option value="${esc(p.slug)}" ${S.kb.product === p.slug ? 'selected' : ''}>${esc(p.display_name)}${p.is_competitor ? ' (competitor)' : ''}</option>`).join('');
    const chips = SVC.FILE_TYPES.map((t) => `<span class="ftchip">${t.toUpperCase()}</span>`).join('');
    return `
      <div class="hero"><div class="date mono">ADMIN · KNOWLEDGE BASE</div><h1>Add data to vector store</h1>
        <div class="sub">Upload a document to add it to the product knowledge base. Files are parsed, embedded, and indexed automatically — allow ~30–90 seconds before answers can cite it. Re-uploading the same path replaces that document.</div></div>
      <button class="backbtn" data-action="nav" data-view="kb">${ic('arrowLeft', 15)} Back to knowledge base</button>
      ${parsing ? `<div class="mbanner blue" style="margin:12px 0">${ic('refreshCw', 16)}<span><b>${esc(parsing.filename)}</b> is parsing, embedding and indexing… it will appear as <b>Active</b> in the list shortly.</span></div>` : ''}
      <div class="kbform">
        <label class="kbfield"><span class="kbl">Document <span class="req">*</span></span>
          <label class="kbdrop" id="kbDrop"><input type="file" id="kbFile" accept=".pdf,.pptx,.ppt,.docx,.doc,.odp,.odt,.ods,.xlsx,.xls,.rtf">
            <span class="kbdrop-in">${ic('fileText', 22)}<span class="kbdrop-t">${S.kb.fileName ? esc(S.kb.fileName) : 'Drag &amp; drop or browse'}</span><span class="kbdrop-s">A single document, up to a few hundred pages</span></span></label>
          <div class="ftchips">${chips}</div></label>
        <label class="kbfield"><span class="kbl">Product <span class="req">*</span></span>
          <select id="kbProduct" data-action="kbprod"><option value="">Select a product…</option>${prodOpts}</select>
          <span class="hint">The document is namespaced by product so retrieval can scope it and gate access.</span></label>
        <label class="kbfield"><span class="kbl">Blob path <span class="opt">optional</span></span>
          <input id="kbPath" class="code" placeholder="defaults to the filename">
          <span class="hint">The path is the document's identity. Reuse a path to update one; use distinct paths for distinct documents.</span></label>
        <div class="merr" id="kbErr">A file and a product are required.</div>
        <button class="mbtn primary kbsubmit" data-action="kbupload">${ic('layers', 14)} Upload to knowledge base</button>
      </div>`;
  }

  /* =====================================================================
     ADMIN
     ===================================================================== */
  /* product-entitlement helpers (role-based medicine access) */
  const accessChips = (products) => `<span class="permchips">${(products && products.length ? products : ALL_PRODUCTS).map((pid) => `<span class="permchip" title="${esc(PRODUCTS[pid].name)}">${PRODUCTS[pid].letter}</span>`).join('')}</span>`;
  const prodCheckHtml = (selected) => `<div class="prodchecks">${ALL_PRODUCTS.map((pid) => { const p = PRODUCTS[pid]; const on = (selected || ALL_PRODUCTS).indexOf(pid) !== -1;
    return `<label class="prodcheck"><input type="checkbox" data-pid="${pid}" ${on ? 'checked' : ''}>${prodDot(pid)} ${esc(p.name)}</label>`; }).join('')}</div>`;
  const readProdChecks = () => Array.prototype.slice.call(document.querySelectorAll('.prodcheck input[data-pid]')).filter((c) => c.checked).map((c) => c.dataset.pid);

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
      `<tr><td>${esc(u.name)}</td><td>${esc(u.country)}</td><td><span class="profb ${u.profile}">${u.profile === 'mb' ? 'MULTI' : 'ULT'}</span></td><td>${accessChips(u.products)}</td><td>${certGroup(u.cert)}</td><td><button class="btn-sm" data-action="edituser" data-i="${i}">${ic('pencil', 12)} Edit</button></td></tr>`
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
          <div class="arow"><span>${ic('sparkles', 14)} AI-generated draft questions</span><button class="btn-dark" data-action="gotodrafts">${ic('listChecks', 13)} Open question manager</button></div></div>
        <div class="panel"><h3>Content gap queue <span class="flt">Brand: All ${ic('chevronDown', 12)}</span></h3>${gaps}
          <div class="arow"><span style="color:var(--gray);font-size:11px">Resolving a gap re-runs the original questions, then notifies every rep who asked. Separate metric from assessment completion.</span></div></div>
        <div class="panel"><h3>Compliance flags <span class="flt">Per brand ${ic('chevronDown', 12)}</span></h3>${compliance}</div>
        <div class="panel"><h3>Users <span class="flt">Country: All ${ic('chevronDown', 12)}</span></h3>
          <div class="tablewrap"><table><tr><th>User</th><th>Country</th><th>Profile</th><th>Assigned products</th><th>Certification</th><th></th></tr>${users}</table></div>
          <div style="margin-top:10px"><button class="btn-dark" data-action="adduser">${ic('userPlus', 13)} Add user</button></div></div>
        <div class="panel"><h3>Roles &amp; permissions <span class="flt">separated sets</span></h3>
          ${ADMIN_ROLES.map((r) => `<div class="arow"><span><b>${esc(r.name)}</b> · ${esc(r.role)}</span><span class="permchips">${r.perms.map((pid) => `<span class="permchip">${PERM_SHORT[pid]}</span>`).join('')}</span></div>`).join('')}
          <div style="margin-top:10px"><button class="btn-dark" data-action="perms">${ic('shieldCheck', 13)} Manage permission sets</button></div>
          <div style="font-size:10.5px;color:var(--gray);margin-top:6px">Separate sets (content, PV, assessment, users, KB), combinable per person — never one unrestricted role.</div></div></div>
      <div class="callout"><b>Admin:</b> completion (engagement) separated from certification (performance). Permissions are separated sets, never one super-role. Admin provisions accounts (email + password) — no self-registration. Add or edit users live.</div>`;
  }
  const PERM_SHORT = { content: 'Content', pv: 'PV', assess: 'Assessment', users: 'Users', kb: 'KB' };
  function permsModal() {
    openModal(`<div class="mhd"><div><div class="mt">${ic('shieldCheck', 20)} Permission sets</div><div class="msub">Combinable per person · never one unrestricted role</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody">${PERMISSION_SETS.map((p) => `<div class="permrow"><div><b>${esc(p.label)}</b><div style="font-size:11px;color:var(--gray)">${esc(p.desc)}</div></div><span class="permchip">${PERM_SHORT[p.id]}</span></div>`).join('')}
        <div class="mbanner blue" style="margin-top:12px">${ic('info', 16)}<span>Each person is granted one or more sets. There is deliberately no single all-access role.</span></div>
        <div class="mactions"><button class="mbtn primary" data-action="close">Close</button></div></div>`);
  }

  /* =====================================================================
     LOGIN / FRONT SCREEN  (Part A1: Merz logo on login & front screen)
     ===================================================================== */
  function viewLogin() {
    return `<div class="loginwrap">
      <div class="logincard">
        <div class="login-mark"><span class="l1">MERZ</span><span class="l2">AESTHETICS<span class="reg">&reg;</span></span></div>
        <div class="login-title">Product Expert</div>
        <div class="login-sub">Every answer from approved Merz sources.</div>
        <div class="fld"><label>Work email</label><input id="loginEmail" value="karim@merz.com" autocomplete="username"></div>
        <div class="fld"><label>Password</label><input id="loginPass" type="password" value="demo-access" autocomplete="current-password"></div>
        <button class="mbtn primary loginbtn" data-action="login">${ic('logIn', 16)} Sign in</button>
        <div class="login-note">${ic('lock', 12)} Accounts are provisioned by an administrator. No self-registration.</div>
        <button class="login-theme" data-action="settheme" data-t="${S.theme === 'dark' ? 'light' : 'dark'}">${ic(S.theme === 'dark' ? 'sun' : 'moon', 14)} ${S.theme === 'dark' ? 'Light' : 'Dark'} appearance</button>
      </div>
      <div class="login-foot">Pilot build · UAE · fictional demo data</div>
    </div>`;
  }

  /* =====================================================================
     ONBOARDING  (shown once after account creation / first sign-in)
     ===================================================================== */
  const ONBOARD_STEPS = [
    { icon: 'search', title: 'Ask anything about your brands',
      body: 'Xeomin, Belotero, Radiesse and Ultherapy. Type a question or pick a shortcut and you get a source-grounded answer you can use with HCPs in seconds — for the medicines your admin has assigned to you.' },
    { icon: 'shieldCheck', title: 'Every answer is grounded in approved sources',
      body: 'Answers cite approved Merz sources with country and approval date. Switch between HCP-conversation and rep-detail guidance, open the source drawer, and share only HCP-approved material.' },
    { icon: 'layers', title: 'Off-label questions stay compliant',
      body: 'If you ask something outside the approved label, the assistant shows only approved indications — it does <b>not</b> auto-route your question to Medical Affairs. The query is logged in the admin panel so Medical Affairs can review it there. You decide whether to raise it.' }
  ];
  function viewOnboard() {
    const n = ONBOARD_STEPS.length, i = Math.max(0, Math.min(S.onboardStep, n - 1)), st = ONBOARD_STEPS[i], last = i === n - 1;
    const dots = ONBOARD_STEPS.map((_, k) => `<span class="ob-dot ${k === i ? 'on' : ''}"></span>`).join('');
    return `<div class="onboardwrap">
      <div class="ob-brand"><span class="l1">MERZ</span> <span class="l2">AESTHETICS<span class="reg">&reg;</span></span> <span class="ob-exp">EXPERT</span></div>
      <div class="onboardcard">
        <div class="ob-icon">${ic(st.icon, 30)}</div>
        <div class="ob-tag mono">GETTING STARTED · ${i + 1} OF ${n}</div>
        <h2 class="ob-title">${st.title}</h2>
        <p class="ob-body">${st.body}</p>
        <div class="ob-dots">${dots}</div>
        <div class="ob-foot">
          <button class="mbtn" data-action="obskip">Skip</button>
          <div class="ob-foot-right">
            ${i > 0 ? `<button class="mbtn" data-action="obprev">${ic('chevronLeft', 15)} Back</button>` : ''}
            <button class="mbtn primary" data-action="obnext">${last ? 'Start using it' : 'Continue'} ${ic('chevronRight', 15)}</button>
          </div>
        </div>
      </div>
      <div class="login-foot">Pilot build · UAE · fictional demo data</div>
    </div>`;
  }
  function finishOnboard() {
    S.onboarded = true; try { localStorage.setItem('merz_onboarded', '1'); } catch (e) {}
    S.onboardStep = 0; S.view = 'home'; render();
  }

  /* =====================================================================
     PART B — REP: My certification + Take assessment
     ===================================================================== */
  const brandLetter = (b) => PRODUCTS[b].letter;
  function certPill(status) {
    const map = { certified: ['good', 'checkCircle', 'Certified'], failed: ['bad', 'xCircle', 'Failed — retake'], pending: ['warn', 'clock', 'Pending'] };
    const m = map[status] || map.pending;
    return `<span class="cpill ${m[0]}">${ic(m[1], 13)} ${m[2]}</span>`;
  }
  function viewCert() {
    const c = S.assess.cert, prof = PROFILES[c.profile];
    const overallCertified = prof.brands.every((b) => c.brands[b] && c.brands[b].status === 'certified');
    const cards = prof.brands.map((b) => {
      const cb = c.brands[b] || { status: 'pending' }, p = PRODUCTS[b];
      return `<div class="certcard"><div class="hd"><div class="ic" style="background:${p.bg};color:${p.color}">${p.letter}</div><div><div class="nm">${p.name}</div><div class="cat2">${p.cat2}</div></div></div>
        <div class="certrow"><span>Status</span>${certPill(cb.status)}</div>
        <div class="certrow"><span>Last score</span><b>${cb.score != null ? cb.score + '%' : '—'}</b></div>
        <div class="certrow"><span>${cb.status === 'certified' ? 'Valid until' : 'Next attempt'}</span><b>${cb.expiresAt || c.nextDue}</b></div></div>`;
    }).join('');
    const history = c.history.map((h) =>
      `<div class="arow"><span><b>${esc(h.type)}</b> · ${esc(h.date)}</span><span style="display:flex;gap:10px;align-items:center"><span style="color:var(--gray)">${h.score}%</span><span class="st ${h.result === 'Passed' ? 'a' : 'i'}">${h.result}</span></span></div>`
    ).join('');
    return `
      <div class="hero"><div class="date mono">CERTIFICATION · ${prof.label.toUpperCase()}</div><h1>${overallCertified ? 'You are certified' : 'Certification in progress'}</h1>
        <div class="sub">Document-based product-knowledge assessment. ${prof.total} questions per quarter${prof.id === 'mb' ? ' (20 Radiesse / 15 Xeomin / 15 Belotero)' : ' (all Ultherapy)'}.</div></div>
      <div class="stats">
        <div class="stat"><div class="lbl mono">OVERALL</div><div class="big" style="display:flex;align-items:center;gap:8px">${ic(overallCertified ? 'shieldCheck' : 'clock', 22)} ${overallCertified ? 'Certified' : 'In progress'}</div><div class="sub">80% required per applicable brand</div></div>
        <div class="stat"><div class="lbl mono">NEXT ASSESSMENT DUE</div><div class="big" style="font-size:18px;padding-top:4px">${c.nextDue}</div><div class="sub">${c.cadence}-month cadence${c.cadence === 6 ? ' (extended — strong performer)' : ''}</div></div>
        <div class="stat"><div class="lbl mono">LAST SCORE</div><div class="big">${c.history[0] ? c.history[0].score + '%' : '—'}</div><div class="sub">${c.history[0] ? c.history[0].type : ''}</div></div>
      </div>
      <div class="seclbl mono">CERTIFICATION BY BRAND</div>
      <div class="certgrid">${cards}</div>
      <div class="cta-assess"><div><div class="h">Ready to take your assessment?</div><div class="d">A short, source-grounded knowledge check. Auto-scored against the ${S.assess.threshold}% threshold. A fail can be re-taken — this is a training tool, not a gate.</div></div>
        <button class="mbtn primary" data-action="startassess">${ic('play', 16)} Take assessment</button></div>
      <div class="seclbl mono">ASSESSMENT HISTORY</div>
      <div class="panel">${history}</div>
      <div class="callout"><b>How this works:</b> a baseline assessment is scheduled in your first week (before Merz training) to set a gap reference, then recertification every ${c.cadence} months. Questions come only from the approved document knowledge base.</div>`;
  }

  /* ---- assessment runner (overlay) --------------------------------------- */
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function startAssess() {
    const prof = PROFILES[S.assess.cert.profile];
    let pool = allQuestions().filter((q) => prof.brands.indexOf(q.product) !== -1 && qStatus(q) === 'active');
    pool = shuffle(pool.slice());
    const qs = pool.slice(0, Math.min(6, pool.length));
    S.assess.run = { qs, idx: 0, answers: new Array(qs.length).fill(null), done: false };
    openAssess();
  }
  function openAssess() { closeAssess(); const ov = document.createElement('div'); ov.className = 'assess-overlay'; ov.id = 'assessov'; ov.innerHTML = assessHtml(); document.body.appendChild(ov); }
  function closeAssess() { const o = document.getElementById('assessov'); if (o) o.remove(); }
  function reAssess() { const o = document.getElementById('assessov'); if (o) o.innerHTML = assessHtml(); }
  function scoreRun() {
    const run = S.assess.run, perBrand = {}; let correct = 0;
    run.qs.forEach((q, i) => { const ok = run.answers[i] === q.correct; if (ok) correct++; (perBrand[q.product] = perBrand[q.product] || { c: 0, t: 0 }).t++; if (ok) perBrand[q.product].c++; });
    return { correct, total: run.qs.length, pct: Math.round(correct / run.qs.length * 100), perBrand };
  }
  const plusMonths = (m) => (m >= 6 ? '10 Jan 2027' : '10 Oct 2026');
  function applyResult(res) {
    const c = S.assess.cert, pass = res.pct >= S.assess.threshold;
    Object.keys(res.perBrand).forEach((b) => {
      const pb = res.perBrand[b], bp = Math.round(pb.c / pb.t * 100);
      c.brands[b] = Object.assign(c.brands[b] || {}, bp >= S.assess.threshold
        ? { status: 'certified', score: bp, certifiedAt: TODAY, expiresAt: plusMonths(c.cadence) }
        : { status: 'failed', score: bp });
    });
    c.history.unshift({ date: TODAY, type: 'Recertification', score: res.pct, result: pass ? 'Passed' : 'Failed' });
    if (pass) c.nextDue = plusMonths(c.cadence);
    saveAssess();
  }
  function assessHtml() {
    const run = S.assess.run;
    if (!run) return '';
    if (run.done) {
      const res = scoreRun(), pass = res.pct >= S.assess.threshold;
      const brands = Object.keys(res.perBrand).map((b) => { const pb = res.perBrand[b], bp = Math.round(pb.c / pb.t * 100); return `<div class="abrk"><span class="l">${brandLetter(b)}</span><span>${PRODUCTS[b].name}</span><div class="bar-wrap"><div class="bar-fill" style="width:${bp}%"></div></div><b>${bp}%</b></div>`; }).join('');
      const missed = run.qs.map((q, i) => run.answers[i] === q.correct ? '' :
        `<div class="missed"><div class="mq">${ic('xCircle', 14)} ${esc(q.stem)}</div><div class="ma">Correct: <b>${esc(q.options[q.correct])}</b></div><div class="msrc">${ic('fileText', 12)} ${esc(q.source_ref)}</div></div>`).join('');
      return `<div class="assess-card">
        <div class="assess-hd"><div class="at">Assessment result</div><button class="x" data-action="assessclose">${ic('x', 20)}</button></div>
        <div class="assess-body">
          <div class="result-hero ${pass ? 'pass' : 'fail'}">${ic(pass ? 'trophy' : 'refreshCw', 30)}<div><div class="rh-top">${res.pct}% · ${res.correct}/${res.total} correct</div><div class="rh-sub">${pass ? 'Passed — above the ' + S.assess.threshold + '% threshold' : 'Below the ' + S.assess.threshold + '% threshold — you can re-take'}</div></div></div>
          <div class="seclbl mono" style="margin-top:6px">SCORE BY BRAND</div>${brands}
          ${missed ? `<div class="seclbl mono" style="margin-top:14px">REVIEW YOUR WEAK AREAS</div>${missed}` : `<div class="mbanner green" style="margin-top:14px">${ic('checkCircle', 16)}<span>Perfect run — no weak areas to review.</span></div>`}
          <div class="mactions" style="margin-top:16px">${pass ? '' : `<button class="mbtn" data-action="startassess">${ic('refreshCw', 15)} Retake</button>`}<button class="mbtn primary" data-action="assessclose">Done</button></div>
        </div></div>`;
    }
    const q = run.qs[run.idx], p = PRODUCTS[q.product], answered = run.answers[run.idx] != null, last = run.idx === run.qs.length - 1;
    const opts = q.options.map((o, i) => `<button class="aopt ${run.answers[run.idx] === i ? 'sel' : ''}" data-action="apick" data-i="${i}"><span class="ab">${String.fromCharCode(65 + i)}</span><span>${esc(o)}</span></button>`).join('');
    return `<div class="assess-card">
      <div class="assess-hd"><div class="at">${ic('graduationCap', 18)} Assessment · ${PROFILES[S.assess.cert.profile].label}</div><button class="x" data-action="assessclose">${ic('x', 20)}</button></div>
      <div class="assess-prog"><div class="assess-prog-txt">Question ${run.idx + 1} of ${run.qs.length}</div><div class="prog-wrap"><div class="prog-fill" style="width:${(run.idx + 1) / run.qs.length * 100}%"></div></div></div>
      <div class="assess-body">
        <div class="qmeta"><span class="qtag" style="background:${p.bg};color:${p.color}">${p.letter} ${p.name}</span><span class="qdiff">${esc(q.difficulty)}</span><span class="qtopic">${esc(q.topic)}</span></div>
        <div class="qstem">${esc(q.stem)}</div>
        <div class="aopts">${opts}</div>
        <div class="assess-foot">
          ${run.idx > 0 ? `<button class="mbtn" data-action="assessprev">${ic('chevronLeft', 15)} Back</button>` : '<span></span>'}
          <button class="mbtn primary" data-action="${last ? 'assesssubmit' : 'assessnext'}" ${answered ? '' : 'disabled'}>${last ? 'Submit' : 'Next'} ${ic('chevronRight', 15)}</button>
        </div></div></div>`;
  }

  /* =====================================================================
     PART B — ADMIN: Question manager · Assessment monitor · Gap analytics
     ===================================================================== */
  const originBadge = (o) => `<span class="obadge ${o}">${o === 'ai' ? 'AI' : 'PRESET'}</span>`;
  const statusBadge = (s) => `<span class="sbadge ${s}">${s.toUpperCase()}</span>`;

  function qManagerTab() {
    const drafts = allQuestions().filter((q) => q.origin === 'ai' && qStatus(q) === 'draft');
    const f = S.qFilter;
    let list = allQuestions().filter((q) => qStatus(q) !== 'retired');
    if (f.product !== 'all') list = list.filter((q) => q.product === f.product);
    if (f.origin !== 'all') list = list.filter((q) => q.origin === f.origin);
    if (f.status !== 'all') list = list.filter((q) => qStatus(q) === f.status);

    const draftPanel = drafts.length ? `<div class="panel"><h3>${ic('sparkles', 15)} Review ${drafts.length} AI draft${drafts.length > 1 ? 's' : ''} <span class="flt">no bulk approve</span></h3>
      ${drafts.map((q) => `<div class="draftq"><div class="dq-top"><span class="qtag" style="background:${PRODUCTS[q.product].bg};color:${PRODUCTS[q.product].color}">${PRODUCTS[q.product].letter}</span>${originBadge('ai')}<span class="qdiff">${q.difficulty}</span><span class="qtopic">${esc(q.topic)}</span><span style="color:var(--gray);font-size:10.5px;margin-left:auto">${esc(q.country)}</span></div>
        <div class="dq-stem">${esc(q.stem)}</div>
        <div class="dq-ans">${ic('check', 13)} Correct: <b>${esc(q.options[q.correct])}</b></div>
        <div class="dq-exp">${esc(q.explanation)}</div>
        <div class="dq-src">${ic('fileText', 12)} ${esc(q.source_ref)}</div>
        <div class="dq-acts"><button class="btn-sm" data-action="qreject" data-id="${q.id}">${ic('x', 13)} Reject</button><button class="btn-dark" data-action="qapprove" data-id="${q.id}">${ic('check', 13)} Approve &amp; activate</button></div></div>`).join('')}</div>` : '';

    const poolPanel = `<div class="panel"><h3>Question pools <span class="flt">preset / AI blend per product</span></h3>
      ${Object.keys(S.assess.pools).map((pk) => { const pc = S.assess.pools[pk], p = PRODUCTS[pk]; return `<div class="poolrow"><span class="qtag" style="background:${p.bg};color:${p.color}">${p.letter} ${p.name}</span>
        <span class="poolcount">${pc.preset} preset · ${pc.ai} AI</span>
        <div class="mixctl"><span class="mono" style="color:var(--gray)">PRESET ${pc.mix}%</span><input type="range" min="0" max="100" value="${pc.mix}" data-action="poolmix" data-p="${pk}"><span class="mono" style="color:var(--gray)">AI ${100 - pc.mix}%</span></div></div>`; }).join('')}
      <div style="font-size:10.5px;color:var(--gray);margin-top:6px">Admin sets the preset/AI ratio per product. Baselines lean difficult to expose gaps.</div></div>`;

    const filterBar = `<div class="filters">
      <span class="filt ${f.product !== 'all' ? 'on' : ''}" data-action="qfprod">Product: ${f.product === 'all' ? 'All' : PRODUCTS[f.product].name} ${ic('chevronDown', 13)}</span>
      <span class="filt ${f.origin !== 'all' ? 'on' : ''}" data-action="qforig">Origin: ${f.origin === 'all' ? 'All' : (f.origin === 'ai' ? 'AI' : 'Preset')} ${ic('chevronDown', 13)}</span>
      <span class="filt ${f.status !== 'all' ? 'on' : ''}" data-action="qfstat">Status: ${f.status === 'all' ? 'All' : f.status} ${ic('chevronDown', 13)}</span>
      <span style="flex:1"></span><button class="btn-dark" data-action="addq">${ic('plusCircle', 13)} New question</button></div>`;

    const rows = list.map((q) => `<tr><td style="max-width:340px">${esc(q.stem)}</td><td>${PRODUCTS[q.product].letter}</td><td>${originBadge(q.origin)}</td><td>${q.difficulty}</td><td>${statusBadge(qStatus(q))}</td><td style="color:var(--gray)">${esc(q.source_ref)}</td><td><button class="btn-sm" data-action="qretire" data-id="${q.id}">${ic('ban', 12)} Retire</button></td></tr>`).join('');

    return `${draftPanel}${poolPanel}
      <div class="panel"><h3>All questions <span class="flt">${list.length} shown</span></h3>${filterBar}
        <div class="tablewrap"><table><tr><th>Question</th><th>Brand</th><th>Origin</th><th>Difficulty</th><th>Status</th><th>Source</th><th></th></tr>${rows || '<tr><td colspan="7" style="color:var(--gray)">No questions match these filters.</td></tr>'}</table></div></div>`;
  }

  function monitorTab() {
    const rows = ASSESS_MONITOR.map((r, i) => {
      const stMap = { certified: 'a', failed: 'i', due: 'd', baseline: 'd' };
      const label = { certified: 'Certified', failed: 'Failed', due: 'Due', baseline: 'Baseline pending' }[r.status];
      return `<tr data-action="repdrill" data-i="${i}" style="cursor:pointer"><td>${r.name}</td><td><span class="profb ${r.profile}">${r.profile === 'mb' ? 'MULTI' : 'ULT'}</span></td><td>${r.country}</td><td><span class="st ${stMap[r.status]}">${label}</span></td><td>${r.lastScore != null ? r.lastScore + '%' : '—'}</td><td>${esc(r.due)}</td><td><button class="btn-sm" data-action="repdrill" data-i="${i}">${ic('eye', 12)} View</button></td></tr>`;
    }).join('');
    return `<div class="panel"><h3>Scoring &amp; cadence <span class="flt">Merz-defined rules</span></h3>
        <div class="cfgrow"><label>${ic('gauge', 15)} Pass threshold</label><div class="stepper"><button class="btn-sm" data-action="thresh" data-d="-5">−</button><b>${S.assess.threshold}%</b><button class="btn-sm" data-action="thresh" data-d="5">+</button></div><span class="cfghint">per applicable brand</span></div>
        <div class="cfgrow"><label>${ic('calendar', 15)} Default cadence</label><b>3 months</b><span class="cfghint">strong performers extend to 6 (configurable per user)</span></div>
        <div style="margin-top:10px"><button class="btn-dark" data-action="adhoc">${ic('play', 13)} Trigger ad-hoc assessment</button></div></div>
      <div class="panel"><h3>Assessment monitor <span class="flt">Country: All ${ic('chevronDown', 12)}</span></h3>
        <div class="filters" style="margin-bottom:10px"><span class="filt" data-action="mgrfilter" data-f="Country">Country: All ${ic('chevronDown', 12)}</span><span class="filt" data-action="mgrfilter" data-f="Profile">Profile: All ${ic('chevronDown', 12)}</span></div>
        <div class="tablewrap"><table><tr><th>Rep</th><th>Profile</th><th>Country</th><th>Status</th><th>Last score</th><th>Next / due</th><th></th></tr>${rows}</table></div></div>`;
  }

  function analyticsTab() {
    const failed = MOST_FAILED.map((m) => `<div class="topic"><span style="width:230px">${brandLetter(m.product)} · ${esc(m.stem)}</span><div class="bar-wrap"><div class="bar-fill" style="width:${m.failRate}%"></div></div><span class="n">${m.failRate}%</span></div>`).join('');
    const topics = WEAK_TOPICS.map((t) => `<div class="topic"><span style="width:200px">${esc(t.topic)}</span><div class="bar-wrap"><div class="bar-fill" style="width:${t.pct}%"></div></div><span class="n">${t.pct}%</span></div>`).join('');
    return `<div class="mgr-grid">
      <div class="panel"><h3>Most-failed questions <span class="flt">this cycle</span></h3>${failed}
        <div style="font-size:10.5px;color:var(--ink-soft);margin-top:8px">${ic('info', 13)} Radiesse contraindications is both the top-asked topic and the most-failed — a training focus, and a signal into the content-gap queue.</div></div>
      <div class="panel"><h3>Weakest topics (team &amp; product)</h3>${topics}
        <div class="trendbox"><div class="tb-h">${ic('trendingUp', 14)} Trend over cycles</div><div class="spark">${[68, 74, 79, 83].map((v, i) => `<span style="height:${v}%" title="Cycle ${i + 1}: ${v}%"></span>`).join('')}</div><div class="tb-c">Team average score improving across the last four cycles (68% → 83%).</div></div></div>
    </div>`;
  }

  function viewAssess() {
    const tabs = [['questions', 'listChecks', 'Question manager'], ['monitor', 'gauge', 'Assessment monitor'], ['analytics', 'chartLine', 'Gap analytics']];
    const body = S.adminTab === 'monitor' ? monitorTab() : S.adminTab === 'analytics' ? analyticsTab() : qManagerTab();
    return `
      <div class="hero"><div class="date mono">ASSESSMENTS · ALL COUNTRIES</div><h1>Assessment &amp; certification</h1><div class="sub">Document-based question pools, scoring, and certification cycles. Two profiles: multi-brand and Ultherapy-only.</div></div>
      <div class="atabs">${tabs.map((t) => `<button class="atab ${S.adminTab === t[0] ? 'on' : ''}" data-action="admintab" data-t="${t[0]}">${ic(t[1], 15)} ${t[2]}</button>`).join('')}</div>
      ${body}
      <div class="callout"><b>Document-based, not interaction-based:</b> questions are drawn only from the approved product documentation — no HCP prescribing profiles or interaction history. AI drafts carry a source reference and require one-by-one review before activation.</div>`;
  }

  function repDrill(i) {
    const r = ASSESS_MONITOR[i];
    const base = r.lastScore != null ? r.lastScore : 60;
    const hist = [{ t: 'Recertification', s: base }, { t: 'Recertification', s: Math.max(40, base - 6) }, { t: 'Baseline (week 1)', s: Math.max(35, base - 14) }];
    const stLabel = { certified: 'Certified', failed: 'Failed — retake scheduled', due: 'Assessment due', baseline: 'Baseline pending' }[r.status];
    openModal(`<div class="mhd"><div><div class="mt">${esc(r.name)}</div><div class="msub">${PROFILES[r.profile].label} · ${esc(r.country)} · ${stLabel}</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody">
        ${r.focus ? `<div class="mbanner amber">${ic('alertTriangle', 16)}<span>Flagged for Medical review on <b>${esc(r.focus)}</b>. A re-exam is scheduled — the rep is not locked out.</span></div>` : ''}
        <div class="seclbl mono">SCORE TREND</div>
        <div class="spark big" style="margin-bottom:14px">${hist.slice().reverse().map((h) => `<span style="height:${h.s}%" title="${h.t}: ${h.s}%"></span>`).join('')}</div>
        <div class="seclbl mono">ASSESSMENT HISTORY</div>
        ${hist.map((h) => `<div class="arow"><span><b>${h.t}</b></span><span style="display:flex;gap:10px;align-items:center"><span style="color:var(--gray)">${h.s}%</span><span class="st ${h.s >= S.assess.threshold ? 'a' : 'i'}">${h.s >= S.assess.threshold ? 'Passed' : 'Failed'}</span></span></div>`).join('')}
        <div class="mactions"><button class="mbtn" data-action="close">Close</button><button class="mbtn primary" data-action="adhoc">${ic('play', 15)} Trigger assessment</button></div></div>`);
  }

  function addQuestion() {
    openModal(`<div class="mhd"><div><div class="mt">${ic('plusCircle', 20)} New preset question</div><div class="msub">Added to the pool as an active preset question</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody">
        <div class="mrow"><div class="fld"><label>Product <span class="req">*</span></label><select id="nqProd">${Object.values(PRODUCTS).map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}</select></div>
          <div class="fld"><label>Difficulty</label><select id="nqDiff"><option>easy</option><option selected>medium</option><option>hard</option></select></div></div>
        <div class="fld"><label>Question <span class="req">*</span></label><textarea id="nqStem" placeholder="Scenario-based, specific…"></textarea></div>
        <div class="mrow"><div class="fld"><label>Option A</label><input id="nqo0"></div><div class="fld"><label>Option B</label><input id="nqo1"></div></div>
        <div class="mrow"><div class="fld"><label>Option C</label><input id="nqo2"></div><div class="fld"><label>Option D</label><input id="nqo3"></div></div>
        <div class="mrow"><div class="fld"><label>Correct option</label><select id="nqCorrect"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></div>
          <div class="fld"><label>Source reference <span class="req">*</span></label><input id="nqSrc" placeholder="e.g. Xeomin UAE PI · Page 5"></div></div>
        <div class="merr" id="nqErr">Please add a question, at least two options and a source reference.</div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn primary" data-action="saveq">Add question</button></div></div>`, true);
  }
  function saveQuestion() {
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const opts = [v('nqo0'), v('nqo1'), v('nqo2'), v('nqo3')].filter((o) => o.trim());
    if (!v('nqStem').trim() || opts.length < 2 || !v('nqSrc').trim()) { const e = document.getElementById('nqErr'); if (e) e.classList.add('show'); return; }
    S.assess.custom.push({ id: 'q-custom-' + Date.now(), product: v('nqProd'), topic: 'Custom', difficulty: v('nqDiff'), type: 'mcq', origin: 'preset', status: 'active', country: 'UAE', stem: v('nqStem').trim(), options: [v('nqo0'), v('nqo1'), v('nqo2'), v('nqo3')], correct: +v('nqCorrect'), explanation: 'Admin-authored preset question.', source_ref: v('nqSrc').trim() });
    saveAssess(); closeModal(); toast('Preset question added to the pool', 'good'); render();
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
        <div class="fld"><label>Your contact for follow-up <span class="req">*</span></label><input id="pvContact" placeholder="Email or phone" value="anubhav@allys-ai.com"></div>
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
        <div class="fld"><label>Work email <span class="req">*</span></label><input id="auEmail" placeholder="name@merz.com"></div></div>
        <div class="mrow"><div class="fld"><label>Temporary password <span class="req">*</span></label><input id="auPass" value="Merz-temp-2026"></div>
        <div class="fld"><label>Country</label><select id="auCountry"><option>UAE</option><option>KSA</option><option>Kuwait</option><option>Qatar</option></select></div></div>
        <div class="fld"><label>Profile</label><select id="auProfile"><option value="mb">Multi-brand</option><option value="uo">Ultherapy-only</option></select></div>
        <div class="fld"><label>Assigned products <span class="req">*</span></label>${prodCheckHtml(ALL_PRODUCTS)}<div class="hint">The rep will only see and handle the medicines you assign here.</div></div>
        <div class="merr" id="auErr">Please enter a name, work email, temporary password and at least one assigned product.</div>
        <div class="mbanner blue">${ic('info', 16)}<span>Admin provisions the account (email + password) — no self-registration. Assign the specific medicines this rep is responsible for. New users start with a baseline assessment assigned in week one. Permissions are separate sets, combined per person.</span></div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn primary" data-action="ausave">Create user</button></div></div>`);
  }
  function auSave() {
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const products = readProdChecks();
    if (!v('auName').trim() || !v('auEmail').trim() || !v('auPass').trim() || !products.length) { const e = document.getElementById('auErr'); if (e) e.classList.add('show'); return; }
    const profile = v('auProfile') || 'mb', country = v('auCountry') || 'UAE';
    S.users.push({ name: v('auName').trim(), email: v('auEmail').trim(), country, profile, products, completion: '0 of 10 assigned', cert: profile === 'mb' ? [['n', 'R'], ['n', 'X'], ['n', 'B']] : [['n', 'U']] });
    save('merz_users', S.users); syncAccessFromUsers(); closeModal(); toast('Account provisioned · baseline assessment assigned', 'good'); render();
  }
  function editUser(i) {
    const u = S.users[i];
    openModal(`<div class="mhd"><div><div class="mt">${ic('pencil', 20)} Edit user</div><div class="msub">${esc(u.name)}</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="mrow"><div class="fld"><label>Country</label><select id="euCountry"><option ${u.country === 'UAE' ? 'selected' : ''}>UAE</option><option ${u.country === 'KSA' ? 'selected' : ''}>KSA</option><option ${u.country === 'Kuwait' ? 'selected' : ''}>Kuwait</option><option ${u.country === 'Qatar' ? 'selected' : ''}>Qatar</option></select></div>
        <div class="fld"><label>Profile</label><select id="euProfile"><option value="mb" ${u.profile === 'mb' ? 'selected' : ''}>Multi-brand</option><option value="uo" ${u.profile === 'uo' ? 'selected' : ''}>Ultherapy-only</option></select></div></div>
        <div class="fld"><label>Assigned products <span class="req">*</span></label>${prodCheckHtml(u.products)}<div class="hint">Only the checked medicines will appear for this rep${u.name === CURRENT_REP ? ' (this is the signed-in rep — changes apply to the Rep view live)' : ''}.</div></div>
        <div class="merr" id="euErr">Assign at least one product.</div>
        <div class="mactions"><button class="mbtn" data-action="close">Cancel</button><button class="mbtn primary" data-action="eusave" data-i="${i}">Save changes</button></div></div>`);
  }
  function euSave(i) {
    const u = S.users[i];
    const products = readProdChecks();
    if (!products.length) { const e = document.getElementById('euErr'); if (e) e.classList.add('show'); return; }
    u.country = (document.getElementById('euCountry') || {}).value || u.country;
    u.profile = (document.getElementById('euProfile') || {}).value || u.profile;
    u.products = products;
    save('merz_users', S.users); syncAccessFromUsers(); closeModal(); toast('Changes saved for ' + esc(u.name), 'good'); render();
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
          : 'A potentially off-label question was detected. The assistant returned only approved indications and surfaced an off-label caution. No off-label claim was generated, and the question was <b>not auto-routed to Medical Affairs</b> — it is logged here so Medical Affairs has visibility. Confirm whether an approved boundary message is sufficient or MA follow-up is needed.'}</p>
        <div class="mactions"><button class="mbtn" data-action="close">Close</button><button class="mbtn primary" data-action="close">Mark reviewed</button></div></div>`);
  }

  const COMPARE_BY_PRODUCT = {
    xeomin: 'Xeomin vs other neurotoxins',
    radiesse: 'Radiesse vs other biostimulators',
    belotero: 'Belotero vs other HA fillers',
    ultherapy: 'Ultherapy vs RF devices'
  };
  function compareModal() {
    const comparisons = accessProducts().map((pid) => COMPARE_BY_PRODUCT[pid]).filter(Boolean);
    openModal(`<div class="mhd"><div><div class="mt">${ic('compare', 20)} Compare vs competitor</div><div class="msub">Each brand against its own competitor set</div></div><button class="x" data-action="close">${ic('x', 20)}</button></div>
      <div class="mbody"><div class="mbanner blue">${ic('info', 16)}<span>Each Merz brand is compared only with its <b>own competitors</b> (not with other Merz products). Comparisons use only claims that appear in approved Merz materials — the assistant will not generate head-to-head claims that aren't approved.</span></div>
        <div class="fld"><label>Pick a comparison</label></div>
        <div class="fups">${comparisons.map((q) => `<div class="fup" data-action="askclose" data-q="${esc(q)}">${esc(q)}</div>`).join('')}</div>
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
    persona: (d) => { closeProfile(); go({ rep: 'home', mgr: 'mgr', adm: 'adm' }[d.p]); },
    profile: () => { if (document.getElementById('popov')) closeProfile(); else openProfile(); },
    settheme: (d) => setTheme(d.t),
    togglenav: () => { S.navOpen = !S.navOpen; render(); },
    closenav: () => { S.navOpen = false; render(); },
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
    fb: (d) => { SVC.recordFeedback(d.v); toast(d.v === 'up' ? 'Thanks — marked helpful' : 'Noted — flagged as not helpful for review', d.v === 'up' ? 'good' : 'warn'); },
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
    libprod: () => { const order = ['all'].concat(accessProducts()); S.lib.product = order[(order.indexOf(S.lib.product) + 1) % order.length]; render(); },
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
    // auth
    login: () => { S.authed = true; try { localStorage.setItem('merz_authed', '1'); } catch (e) {} if (!S.onboarded) { S.view = 'onboard'; S.onboardStep = 0; } else { S.view = 'home'; } render(); },
    obnext: () => { if (S.onboardStep < ONBOARD_STEPS.length - 1) { S.onboardStep++; render(); } else { finishOnboard(); } },
    obprev: () => { if (S.onboardStep > 0) { S.onboardStep--; render(); } },
    obskip: () => finishOnboard(),
    tour: () => { closeProfile(); S.view = 'onboard'; S.onboardStep = 0; render(); },
    logout: () => { closeProfile(); S.authed = false; try { localStorage.removeItem('merz_authed'); } catch (e) {} render(); },
    // manager config
    mgrfields: () => fieldsModal(),
    togcol: (d) => { S.mgrCols[d.k] = !S.mgrCols[d.k]; save('merz_mgrcols', S.mgrCols); render(); },
    actdays: (d) => { S.activityDays = Math.max(1, Math.min(90, S.activityDays + (+d.d))); render(); },
    perms: () => permsModal(),
    // Part B — assessment (rep)
    startassess: () => startAssess(),
    apick: (d) => { S.assess.run.answers[S.assess.run.idx] = +d.i; reAssess(); },
    assessnext: () => { if (S.assess.run.idx < S.assess.run.qs.length - 1) { S.assess.run.idx++; reAssess(); } },
    assessprev: () => { if (S.assess.run.idx > 0) { S.assess.run.idx--; reAssess(); } },
    assesssubmit: () => { S.assess.run.done = true; applyResult(scoreRun()); reAssess(); },
    assessclose: () => { closeAssess(); S.assess.run = null; render(); },
    // Part B — assessment (admin)
    admintab: (d) => { S.adminTab = d.t; render(); },
    gotodrafts: () => { S.adminTab = 'questions'; go('assess'); },
    qapprove: (d) => { if (S.assess.approved.indexOf(d.id) === -1) S.assess.approved.push(d.id); saveAssess(); toast('Draft approved & activated', 'good'); render(); },
    qreject: (d) => { if (S.assess.retired.indexOf(d.id) === -1) S.assess.retired.push(d.id); saveAssess(); toast('Draft rejected', 'warn'); render(); },
    qretire: (d) => { if (S.assess.retired.indexOf(d.id) === -1) S.assess.retired.push(d.id); saveAssess(); toast('Question retired', 'warn'); render(); },
    qfprod: () => { const o = ['all'].concat(Object.keys(PRODUCTS)); S.qFilter.product = o[(o.indexOf(S.qFilter.product) + 1) % o.length]; render(); },
    qforig: () => { const o = ['all', 'preset', 'ai']; S.qFilter.origin = o[(o.indexOf(S.qFilter.origin) + 1) % o.length]; render(); },
    qfstat: () => { const o = ['all', 'active', 'draft']; S.qFilter.status = o[(o.indexOf(S.qFilter.status) + 1) % o.length]; render(); },
    addq: () => addQuestion(),
    saveq: () => saveQuestion(),
    poolmix: (d, el) => { S.assess.pools[d.p].mix = +el.value; saveAssess(); const r = el.closest('.mixctl'); if (r) { r.querySelector('.mono').innerHTML = 'PRESET ' + el.value + '%'; r.querySelectorAll('.mono')[1].innerHTML = 'AI ' + (100 - el.value) + '%'; } },
    thresh: (d) => { S.assess.threshold = Math.max(50, Math.min(100, S.assess.threshold + (+d.d))); saveAssess(); render(); },
    adhoc: () => { closeModal(); toast('Ad-hoc assessment triggered (demo)', 'good'); },
    repdrill: (d) => repDrill(+d.i),
    // Products (catalog)
    addprod: () => productModal(null),
    editprod: (d) => productModal(d.slug),
    deactprod: (d) => { SVC.setProductActive(d.slug, false); toast('Product deactivated — hidden from new uploads and grants; history kept', 'warn'); render(); },
    reactprod: (d) => { SVC.setProductActive(d.slug, true); toast('Product reactivated', 'good'); render(); },
    prodsearch: () => { const i = $('#prodInput'); if (i) { S.prodFilter.q = i.value; render(); } },
    prodftype: () => { const o = ['all', 'own', 'competitor']; S.prodFilter.type = o[(o.indexOf(S.prodFilter.type) + 1) % o.length]; render(); },
    prodfstat: () => { const o = ['all', 'active', 'archived']; S.prodFilter.status = o[(o.indexOf(S.prodFilter.status) + 1) % o.length]; render(); },
    prodsave: (d) => prodSave(d.slug),
    // Knowledge base
    kbaddnav: () => { S.kb.fileName = ''; S.kb.product = ''; go('kbadd'); },
    kbtab: (d) => { S.kb.tab = d.t; render(); },
    kbsearch: () => { const i = $('#kbInput'); if (i) { S.kb.q = i.value; render(); } },
    kbrefresh: () => { render(); toast('Knowledge base refreshed', 'good'); },
    kbprod: (d, el) => { S.kb.product = el.value; },
    kbupload: () => kbUpload(),
    kbarchive: (d) => { SVC.archiveDocument(d.id); toast('Document archived — hidden from answers; history kept', 'warn'); render(); },
    kbrestore: (d) => { SVC.unarchiveDocument(d.id); toast('Document restored to the vector store', 'good'); render(); },
    close: () => closeModal()
  };

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el || el.type === 'range') return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) { ev.preventDefault(); fn(el.dataset, el, ev); }
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target.closest('[data-action="poolmix"]');
    if (el && ACTIONS.poolmix) ACTIONS.poolmix(el.dataset, el, ev);
  });
  document.addEventListener('change', (ev) => {
    if (ev.target.id === 'kbFile') {
      const f = ev.target.files && ev.target.files[0];
      const t = document.querySelector('#kbDrop .kbdrop-t');
      if (t) t.textContent = f ? f.name : 'Drag & drop or browse';
    }
  });
  function wireKbDrop() {
    const drop = document.getElementById('kbDrop'), fi = document.getElementById('kbFile');
    if (!drop || !fi) return;
    ['dragover', 'dragenter'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'dragend'].forEach((e) => drop.addEventListener(e, () => drop.classList.remove('drag')));
    drop.addEventListener('drop', (ev) => {
      ev.preventDefault(); drop.classList.remove('drag');
      if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) {
        try { fi.files = ev.dataTransfer.files; } catch (_) {}
        const t = drop.querySelector('.kbdrop-t'); if (t) t.textContent = ev.dataTransfer.files[0].name;
      }
    });
  }
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    if (ev.target.id === 'askInput') { ev.preventDefault(); askQuestion(ev.target.value); }
    if (ev.target.id === 'libInput') { ev.preventDefault(); S.lib.q = ev.target.value; render(); }
    if (ev.target.id === 'prodInput') { ev.preventDefault(); S.prodFilter.q = ev.target.value; render(); }
    if (ev.target.id === 'kbInput') { ev.preventDefault(); S.kb.q = ev.target.value; render(); }
  });

  /* =====================================================================
     RENDER
     ===================================================================== */
  const VIEWS = { home: viewHome, chat: viewChat, lib: viewLibrary, cert: viewCert, mgr: viewManager, adm: viewAdmin, assess: viewAssess, products: viewProducts, kb: viewKB, kbadd: viewKBAdd };
  function render() {
    if (!S.authed) { app().innerHTML = viewLogin(); return; }
    if (S.view === 'onboard') { app().innerHTML = viewOnboard(); return; }
    syncSession();
    const role = roleOfView(S.view);
    const active = S.view;
    let activeProduct = null;
    if (S.view === 'chat' && S.chat && S.chat.turns && S.chat.turns.length) {
      const last = S.chat.turns[S.chat.turns.length - 1];
      if (last.resolved && last.resolved.entry) activeProduct = last.resolved.entry.product;
    }
    const content = (VIEWS[S.view] || viewHome)();
    app().innerHTML = `<div class="shell${S.navOpen ? ' nav-open' : ''}">${sidebar(role, active, activeProduct)}<div class="nav-backdrop" data-action="closenav"></div><div class="workarea">${appbar(role)}<main class="main">${content}</main></div></div>`;
    if (S.view === 'lib') { const i = $('#libInput'); if (i && S.lib.q) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    if (S.view === 'products') { const i = $('#prodInput'); if (i && S.prodFilter.q) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    if (S.view === 'kb') { const i = $('#kbInput'); if (i && S.kb.q) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    if (S.view === 'kbadd') wireKbDrop();
  }

  SVC.init();               // seed the service store (Part E) + session
  syncAccessFromUsers();    // write the signed-in rep's brand grants through the service
  render();
})();
