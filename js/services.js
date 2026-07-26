/* =========================================================================
   Merz Product Expert — Service layer (client-only "server")

   Build mode: CLIENT-ONLY SIMULATION. There is no backend. This module is the
   single enforcement point that plays the role of a server: it owns the data
   store (the Part E model) and performs ALL access-control and retrieval
   scoping. Views must never filter for security — they call MerzService, and
   MerzService decides. Enforcement is therefore CENTRALIZED and non-bypassable
   from the view layer.

   Honesty note: this is not a real trust boundary (anyone can open devtools).
   It mirrors how a real server would enforce brand grants, roles, permission
   sets and the question-approval gate, so the shape of the app is correct.
   ========================================================================= */
(function (global) {
  'use strict';
  const D = global.MerzData || {};
  const LS_KEY = 'merz_svc_v1';

  /* ------------------------------------------------------------ safe storage */
  function lsGet(k) { try { return JSON.parse(global.localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------------------------------------------------------------- the store
     Part E entities. Some are fully seeded now (products, users, brand grants,
     permission sets, documents); others are modelled here and populated by
     later build areas (chunks → KB ingestion; threads/answers → Ask; etc.). */
  const store = {
    org: { id: 'org-merz', name: 'Merz Aesthetics', tier: 'EXPERT' },
    products: [],
    documents: [],
    chunks: [],
    users: [],
    brandGrants: [],      // { user_id, product_slug }
    permissionSets: [],   // { user_id, set }  set ∈ content|pv|assessment|users|kb
    threads: [],
    messages: [],
    answers: [],
    questions: [],
    pools: [],
    assessments: [],
    attemptAnswers: [],
    contentGaps: [],
    complianceFlags: [],
    weeklyDigests: []
  };

  let session = { userId: null };

  /* The five composable permission sets (never one super-role). */
  const PERMISSION_SETS = ['content', 'pv', 'assessment', 'users', 'kb'];

  /* -------------------------------------------------------------- seed helpers
     Personas the UI switches between. Karim is the signed-in rep. */
  const PERSONA_USERS = [
    { id: 'u-karim', name: 'Karim A.', display_name: 'Karim A.', email: 'karim@example.com',
      role: 'member', status: 'active', country: 'UAE', persona: 'rep' },
    { id: 'u-bahaa', name: 'Bahaa K.', display_name: 'Bahaa K.', email: 'bahaa@example.com',
      role: 'member', status: 'active', country: 'UAE', persona: 'mgr' },
    { id: 'u-fouad', name: 'Fouad J.', display_name: 'Fouad J.', email: 'fouad@example.com',
      role: 'admin', status: 'active', country: 'UAE', persona: 'adm' }
  ];

  function seedProducts() {
    const PRODUCTS = D.PRODUCTS || {};
    Object.keys(PRODUCTS).forEach((slug, i) => {
      const p = PRODUCTS[slug];
      store.products.push({
        id: slug, slug: slug, display_name: p.name, category: p.category,
        sort_order: i, aliases: [p.name.toLowerCase(), p.code ? p.code.toLowerCase() : ''].filter(Boolean),
        description: p.cat2 || '', is_competitor: false, is_active: true
      });
    });
    // Competitor products are first-class catalog entries so objection-handling
    // content can be indexed against them. Neutral placeholder names only — no
    // real third-party brands (HARD CONSTRAINT #1).
    [
      { slug: 'competitor-tox-a', display_name: 'Competitor Neurotoxin A', category: 'Botulinum Toxin' },
      { slug: 'competitor-tox-b', display_name: 'Competitor Neurotoxin B', category: 'Botulinum Toxin' }
    ].forEach((c, i) => store.products.push({
      id: c.slug, slug: c.slug, display_name: c.display_name, category: c.category,
      sort_order: 100 + i, aliases: [], description: 'Competitor product (objection handling).',
      is_competitor: true, is_active: true
    }));
  }

  // Products the org owns (non-competitor). Reps are granted from these.
  function ownProductSlugs() { return store.products.filter((p) => !p.is_competitor).map((p) => p.slug); }

  function seedUsers() {
    // Personas first (they carry role + persona).
    PERSONA_USERS.forEach((u) => store.users.push(Object.assign({ cadence_months: 3, next_due_at: null, certification: 'certified' }, u)));
    // Admin-console users (carry brand grants via .products). Merge by name.
    (D.ADMIN_USERS || []).forEach((au) => {
      let u = store.users.find((x) => x.name === au.name);
      if (!u) {
        u = { id: 'u-' + au.name.toLowerCase().replace(/[^a-z]/g, ''), name: au.name, display_name: au.name,
          email: au.name.toLowerCase().replace(/[^a-z]/g, '.') + '@example.com', role: 'member',
          status: 'active', country: au.country || 'UAE', cadence_months: 3, next_due_at: null, certification: 'certified' };
        store.users.push(u);
      } else if (au.country) { u.country = au.country; }
      // brand grants
      (au.products || []).forEach((slug) => grantBrand(u.id, slug, true));
    });
    // Karim's grants default to all OWN products (matches the signed-in rep).
    const karim = userByName('Karim A.');
    if (karim && !store.brandGrants.some((g) => g.user_id === karim.id)) {
      ownProductSlugs().forEach((slug) => grantBrand(karim.id, slug, true));
    }
    // Fouad (admin) holds MA permission sets + is granted all own products.
    const fouad = userByName('Fouad J.');
    if (fouad) {
      ownProductSlugs().forEach((slug) => grantBrand(fouad.id, slug, true));
      ['content', 'pv', 'assessment'].forEach((s) => setPermission(fouad.id, s, true));
    }
    // Bahaa (manager) sees all own products (team view).
    const bahaa = userByName('Bahaa K.');
    if (bahaa) ownProductSlugs().forEach((slug) => grantBrand(bahaa.id, slug, true));
    // Seed permission sets from ADMIN_ROLES where names match.
    (D.ADMIN_ROLES || []).forEach((r) => {
      const u = userByName(r.name);
      if (u) (r.perms || []).forEach((s) => setPermission(u.id, s === 'assess' ? 'assessment' : s, true));
    });
  }

  function seedDocuments() {
    (D.DOCS || []).forEach((doc) => {
      store.documents.push({
        id: doc.id, product_slug: doc.product, blob_path: doc.title.replace(/\s+/g, '_') + '.pdf',
        filename: doc.title, mime: 'application/pdf', page_count: null,
        status: 'active', uploaded_by: 'u-fouad', uploaded_at: doc.updated || null,
        country: doc.country || null, type: doc.type || null, perm: doc.perm || 'int', _seed: true
      });
    });
  }

  /* --------------------------------------------------------- access mutations */
  function grantBrand(userId, slug, on) {
    const has = store.brandGrants.some((g) => g.user_id === userId && g.product_slug === slug);
    if (on && !has) store.brandGrants.push({ user_id: userId, product_slug: slug });
    if (!on && has) store.brandGrants = store.brandGrants.filter((g) => !(g.user_id === userId && g.product_slug === slug));
    persist();
  }
  function setPermission(userId, set, on) {
    if (PERMISSION_SETS.indexOf(set) === -1) return;
    const has = store.permissionSets.some((p) => p.user_id === userId && p.set === set);
    if (on && !has) store.permissionSets.push({ user_id: userId, set: set });
    if (!on && has) store.permissionSets = store.permissionSets.filter((p) => !(p.user_id === userId && p.set === set));
    persist();
  }

  /* ------------------------------------------------------------------ lookups */
  function productBySlug(slug) { return store.products.find((p) => p.slug === slug) || null; }
  function userByName(name) { return store.users.find((u) => u.name === name) || null; }
  function userById(id) { return store.users.find((u) => u.id === id) || null; }
  function currentUser() { return userById(session.userId); }

  /* ========================================================================
     ACCESS CONTROL — the enforcement surface. Every access decision funnels
     through here; the UI is expected to call these, not re-implement filtering.
     ======================================================================== */

  // The product slugs a user is granted, intersected with active products.
  function grantedProductSlugs(userId) {
    userId = userId || session.userId;
    const active = new Set(store.products.filter((p) => p.is_active).map((p) => p.slug));
    return store.brandGrants
      .filter((g) => g.user_id === userId && active.has(g.product_slug))
      .map((g) => g.product_slug);
  }

  function canAccessProduct(slug, userId) {
    userId = userId || session.userId;
    const u = userById(userId);
    if (!u) return false;
    return grantedProductSlugs(userId).indexOf(slug) !== -1;
  }

  function hasPermission(set, userId) {
    userId = userId || session.userId;
    const u = userById(userId);
    if (!u) return false;
    if (u.role === 'admin') return true; // admin holds all sets unless we model narrower admins
    return store.permissionSets.some((p) => p.user_id === userId && p.set === set);
  }

  function hasRole(role, userId) {
    const u = userById(userId || session.userId);
    return !!u && u.role === role;
  }

  /* Retrieval scoping (used by the answer engine, Part D1 step 2).
     Given a candidate answer/entry that names a product, decide whether the
     current user may receive it. Returns a decision object; a denied result is
     NOT a content gap — it is an authorization boundary. */
  function authorizeRetrieval(productSlug, userId) {
    userId = userId || session.userId;
    if (!productSlug) return { allowed: true };
    const product = store.products.find((p) => p.slug === productSlug);
    if (!product || !product.is_active) return { allowed: false, reason: 'inactive', productSlug: productSlug };
    if (!canAccessProduct(productSlug, userId)) return { allowed: false, reason: 'not_granted', productSlug: productSlug };
    return { allowed: true };
  }

  // Filter a list of product slugs down to what the user may see.
  function scopeProducts(slugs, userId) {
    const granted = new Set(grantedProductSlugs(userId));
    return (slugs || []).filter((s) => granted.has(s));
  }

  /* ================================================================ catalog
     Product CRUD. Immutable slug (baked into blob names + chunk metadata);
     renames touch display_name only. Deactivate ≠ delete. */
  const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
  function slugAvailable(slug) { return !store.products.some((p) => p.slug === slug); }

  function addProduct(data) {
    const slug = String(data.slug || '').trim().toLowerCase();
    if (!SLUG_RE.test(slug)) return { ok: false, error: 'Slug must be lowercase letters, numbers and hyphens.' };
    if (!slugAvailable(slug)) return { ok: false, error: 'That slug is already in use.' };
    if (!String(data.display_name || '').trim()) return { ok: false, error: 'Display name is required.' };
    const product = {
      id: slug, slug: slug, display_name: String(data.display_name).trim(),
      category: String(data.category || '').trim(),
      sort_order: Number.isFinite(+data.sort_order) ? +data.sort_order : store.products.length,
      aliases: normalizeAliases(data.aliases),
      description: String(data.description || ''),
      is_competitor: !!data.is_competitor, is_active: true
    };
    store.products.push(product);
    persist();
    return { ok: true, product: product };
  }

  function updateProduct(slug, patch) {
    const p = store.products.find((x) => x.slug === slug);
    if (!p) return { ok: false, error: 'Unknown product.' };
    // slug + id are immutable — never changed here.
    if ('display_name' in patch && String(patch.display_name).trim()) p.display_name = String(patch.display_name).trim();
    if ('category' in patch) p.category = String(patch.category || '').trim();
    if ('sort_order' in patch && Number.isFinite(+patch.sort_order)) p.sort_order = +patch.sort_order;
    if ('aliases' in patch) p.aliases = normalizeAliases(patch.aliases);
    if ('description' in patch) p.description = String(patch.description || '');
    if ('is_competitor' in patch) p.is_competitor = !!patch.is_competitor;
    if ('is_active' in patch) p.is_active = !!patch.is_active;
    persist();
    return { ok: true, product: p };
  }

  function setProductActive(slug, active) { return updateProduct(slug, { is_active: !!active }); }

  function normalizeAliases(a) {
    if (Array.isArray(a)) return a.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
    return String(a || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }

  /* Merge persisted product edits/additions over the freshly seeded catalog. */
  function mergeProducts(persisted) {
    if (!Array.isArray(persisted)) return;
    persisted.forEach((pp) => {
      const i = store.products.findIndex((p) => p.slug === pp.slug);
      if (i === -1) store.products.push(pp); else store.products[i] = pp;
    });
  }

  /* ================================================================ knowledge
     KB ingestion pipeline (simulated): upload → parse → chunk (with heading
     path) → embed → index by product slug → status. Path-based idempotent
     upsert. Archive ≠ delete. Retrieval is scoped by brand grants. */
  const FILE_TYPES = ['pdf', 'pptx', 'ppt', 'docx', 'doc', 'odp', 'odt', 'ods', 'xlsx', 'xls', 'rtf'];
  const MIMES = { pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats', docx: 'application/vnd.openxmlformats', rtf: 'application/rtf' };
  function extOf(name) { const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ''; }
  function nowISO() { return new Date().toISOString().slice(0, 10); }
  function newDocId() { return 'doc-u-' + Math.random().toString(36).slice(2, 9); }

  // Seed a retrievable corpus from the demo KB so the Ask pipeline has real
  // text to rank. Each approved source becomes a chunk with a heading path.
  function seedCorpus() {
    const entries = (D.KB || []).concat(D.OBJECTIONS || []);
    const byFilename = {};
    store.documents.forEach((d) => { byFilename[d.filename] = d; });
    entries.forEach((e) => {
      const product = productBySlug(e.product);
      const pname = product ? product.display_name : e.product;
      const pts = (e.hcp && e.hcp.points ? e.hcp.points.map((p) => String(p.text).replace(/<[^>]+>/g, '')) : []).join(' ');
      const lead = (e.hcp && e.hcp.lead) || '';
      (e.sources || []).forEach((s, i) => {
        let doc = byFilename[s.title];
        if (!doc) {
          doc = { id: 'doc-seed-' + e.id + '-' + i, product_slug: e.product, blob_path: s.title.replace(/\s+/g, '_') + '.pdf',
            filename: s.title, mime: 'application/pdf', page_count: null, status: 'active',
            uploaded_by: 'u-fouad', uploaded_at: null, country: null, type: null, perm: s.perm || 'int', _seed: true };
          store.documents.push(doc); byFilename[s.title] = doc;
        }
        const pageM = /Page\s+(\d+)/i.exec(s.meta || '');
        store.chunks.push({
          id: 'ch-' + e.id + '-' + i, document_id: doc.id, product_slug: e.product,
          heading_path: [pname, e.category || 'general', s.title], page: pageM ? +pageM[1] : null,
          text: [s.excerpt, lead, pts].filter(Boolean).join(' '), _seed: true
        });
      });
    });
  }

  // Synthesize section text for an uploaded binary file we cannot truly parse.
  function synthText(product, filename) {
    const p = product ? product.display_name : 'the product';
    return [
      '## Overview\n' + p + ' approved source ' + filename + '. Indications, administration and precautions per the locally approved label.',
      '## Administration\nPreparation and administration of ' + p + ' follow the approved product information; confirm the local label before use.',
      '## Safety\nContraindications and precautions for ' + p + ' are defined in the approved information; review the full label.'
    ].join('\n\n');
  }

  // Split text into chunks, deriving a heading path from "## Heading" markers.
  function chunkText(text, product) {
    const pname = product ? product.display_name : '';
    const blocks = String(text).split(/\n\s*\n/).filter((b) => b.trim());
    const out = [];
    blocks.forEach((b, i) => {
      const hm = /^##\s*(.+)$/m.exec(b);
      const heading = hm ? hm[1].trim() : 'Section ' + (i + 1);
      const body = b.replace(/^##\s*.+$/m, '').trim() || b.trim();
      out.push({ heading_path: [pname, heading].filter(Boolean), text: body, page: i + 1 });
    });
    return out.length ? out : [{ heading_path: [pname].filter(Boolean), text: String(text), page: 1 }];
  }

  function uploadDocument(opts) {
    opts = opts || {};
    const product = productBySlug(opts.productSlug);
    if (!product) return { ok: false, error: 'A product is required.' };
    if (!product.is_active) return { ok: false, error: 'Product is deactivated.' };
    const filename = String(opts.filename || '').trim();
    if (!filename) return { ok: false, error: 'A document file is required.' };
    const ext = extOf(filename);
    if (FILE_TYPES.indexOf(ext) === -1) return { ok: false, error: 'Unsupported file type: .' + ext };
    const blobPath = (String(opts.blobPath || '').trim() || filename);
    // Idempotent upsert on (product_slug, blob_path): reuse a path to replace.
    let doc = store.documents.find((d) => d.product_slug === product.slug && d.blob_path === blobPath);
    const replaced = !!doc;
    if (doc) {
      store.chunks = store.chunks.filter((c) => c.document_id !== doc.id);
      doc.filename = filename; doc.mime = opts.mime || MIMES[ext] || 'application/octet-stream';
      doc.status = 'parsing'; doc.uploaded_at = nowISO();
    } else {
      doc = { id: newDocId(), product_slug: product.slug, blob_path: blobPath, filename: filename,
        mime: opts.mime || MIMES[ext] || 'application/octet-stream', page_count: null, status: 'parsing',
        uploaded_by: opts.uploadedBy || session.userId, uploaded_at: nowISO(),
        country: opts.country || null, type: opts.type || null, perm: opts.perm || 'int' };
      store.documents.push(doc);
    }
    doc._pendingText = opts.text || synthText(product, filename);
    persist();
    return { ok: true, doc: doc, replaced: replaced };
  }

  // Second stage of the pipeline: parse → chunk → embed → index → active.
  function finalizeIngestion(docId) {
    const doc = store.documents.find((d) => d.id === docId);
    if (!doc || doc.status !== 'parsing') return { ok: false };
    const product = productBySlug(doc.product_slug);
    const parts = chunkText(doc._pendingText || '', product);
    parts.forEach((pt, i) => store.chunks.push({
      id: doc.id + '-c' + i, document_id: doc.id, product_slug: doc.product_slug,
      heading_path: pt.heading_path, page: pt.page || null, text: pt.text
    }));
    doc.page_count = Math.max(1, parts.length);
    doc.status = 'active';
    delete doc._pendingText;
    persist();
    return { ok: true, chunks: parts.length };
  }

  function archiveDocument(docId) { const d = store.documents.find((x) => x.id === docId); if (!d) return { ok: false }; d.status = 'archived'; persist(); return { ok: true }; }
  function unarchiveDocument(docId) { const d = store.documents.find((x) => x.id === docId); if (!d) return { ok: false }; d.status = 'active'; persist(); return { ok: true }; }

  // Scoped retrieval — brand grants enforced here, then ranked by MerzRAG.
  function retrieveChunks(queryText, opts) {
    opts = opts || {};
    const scope = opts.productSlug ? scopeProducts([opts.productSlug]) : grantedProductSlugs();
    const scopeSet = {}; scope.forEach((s) => { scopeSet[s] = 1; });
    const activeDocs = {}; store.documents.forEach((d) => { if (d.status === 'active') activeDocs[d.id] = 1; });
    const chunks = store.chunks.filter((c) => scopeSet[c.product_slug] && (!c.document_id || activeDocs[c.document_id]));
    const RAG = global.MerzRAG;
    if (!RAG) return [];
    return RAG.retrieve(queryText, chunks, { topK: opts.topK || 4, minScore: opts.minScore });
  }

  /* ---------------------------------------------------------------- session */
  function setSession(nameOrId) {
    const u = userByName(nameOrId) || userById(nameOrId);
    session.userId = u ? u.id : null;
    persist();
    return u;
  }

  /* -------------------------------------------------------------- persistence
     We persist only the mutable overlay (session + grants + permission sets),
     not the whole seeded catalog, so seed changes flow through on reload. */
  // Strip internal (underscore-prefixed) keys from persisted objects.
  function clean(list) { return (list || []).map((o) => { const c = {}; for (const k in o) if (k[0] !== '_') c[k] = o[k]; return c; }); }
  function persist() {
    lsSet(LS_KEY, {
      session: session, products: store.products, brandGrants: store.brandGrants, permissionSets: store.permissionSets,
      // only user-added (non-seed) documents/chunks are persisted; the seed corpus is regenerated each init.
      documents: clean(store.documents.filter((d) => !d._seed)),
      chunks: clean(store.chunks.filter((c) => !c._seed))
    });
  }
  function restore() {
    const saved = lsGet(LS_KEY);
    if (!saved) return;
    if (saved.session) session = saved.session;
    mergeProducts(saved.products);
    if (Array.isArray(saved.brandGrants)) store.brandGrants = saved.brandGrants;
    if (Array.isArray(saved.permissionSets)) store.permissionSets = saved.permissionSets;
    if (Array.isArray(saved.documents)) saved.documents.forEach((d) => { if (!store.documents.some((x) => x.id === d.id)) store.documents.push(d); });
    if (Array.isArray(saved.chunks)) saved.chunks.forEach((c) => { if (!store.chunks.some((x) => x.id === c.id)) store.chunks.push(c); });
  }

  /* --------------------------------------------------------------------- init */
  let initialized = false;
  function init(opts) {
    if (initialized && !(opts && opts.force)) return api;
    // reset (supports re-init in tests)
    store.products = []; store.documents = []; store.chunks = []; store.users = [];
    store.brandGrants = []; store.permissionSets = [];
    session = { userId: null };
    seedProducts();
    seedUsers();
    seedDocuments();
    seedCorpus();
    setSession('Karim A.'); // the signed-in rep persona
    if (!(opts && opts.fresh)) restore();
    initialized = true;
    return api;
  }

  const api = {
    init: init,
    _store: store,                       // exposed for tests + later build areas
    PERMISSION_SETS: PERMISSION_SETS,
    // session
    setSession: setSession,
    currentUser: currentUser,
    userByName: userByName,
    userById: userById,
    // catalog
    products: () => store.products.slice().sort((a, b) => a.sort_order - b.sort_order),
    activeProducts: () => store.products.filter((p) => p.is_active),
    ownProductSlugs: ownProductSlugs,
    productBySlug: (slug) => store.products.find((p) => p.slug === slug) || null,
    slugAvailable: slugAvailable,
    addProduct: addProduct,
    updateProduct: updateProduct,
    setProductActive: setProductActive,
    documents: () => store.documents.slice(),
    documentsByStatus: (st) => store.documents.filter((d) => d.status === st),
    chunks: () => store.chunks.slice(),
    chunksForDocument: (id) => store.chunks.filter((c) => c.document_id === id),
    FILE_TYPES: FILE_TYPES,
    uploadDocument: uploadDocument,
    finalizeIngestion: finalizeIngestion,
    archiveDocument: archiveDocument,
    unarchiveDocument: unarchiveDocument,
    retrieveChunks: retrieveChunks,
    users: () => store.users.slice(),
    // access control
    grantedProductSlugs: grantedProductSlugs,
    canAccessProduct: canAccessProduct,
    hasPermission: hasPermission,
    hasRole: hasRole,
    authorizeRetrieval: authorizeRetrieval,
    scopeProducts: scopeProducts,
    // access mutations
    grantBrand: grantBrand,
    setPermission: setPermission,
    setBrandGrants: function (userId, slugs) {
      // replace the full grant set for a user
      store.brandGrants = store.brandGrants.filter((g) => g.user_id !== userId);
      (slugs || []).forEach((s) => grantBrand(userId, s, true));
      persist();
    }
  };

  global.MerzService = api;
})(typeof window !== 'undefined' ? window : globalThis);
