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
  }

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
    // Karim's grants default to all products (matches the demo's signed-in rep).
    const karim = userByName('Karim A.');
    if (karim && !store.brandGrants.some((g) => g.user_id === karim.id)) {
      store.products.forEach((p) => grantBrand(karim.id, p.slug, true));
    }
    // Fouad (admin) can access every product + holds MA permission sets.
    const fouad = userByName('Fouad J.');
    if (fouad) {
      store.products.forEach((p) => grantBrand(fouad.id, p.slug, true));
      ['content', 'pv', 'assessment'].forEach((s) => setPermission(fouad.id, s, true));
    }
    // Bahaa (manager) sees all products (team view).
    const bahaa = userByName('Bahaa K.');
    if (bahaa) store.products.forEach((p) => grantBrand(bahaa.id, p.slug, true));
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
        country: doc.country || null, type: doc.type || null, perm: doc.perm || 'int'
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
  function persist() {
    lsSet(LS_KEY, { session: session, brandGrants: store.brandGrants, permissionSets: store.permissionSets });
  }
  function restore() {
    const saved = lsGet(LS_KEY);
    if (!saved) return;
    if (saved.session) session = saved.session;
    if (Array.isArray(saved.brandGrants)) store.brandGrants = saved.brandGrants;
    if (Array.isArray(saved.permissionSets)) store.permissionSets = saved.permissionSets;
  }

  /* --------------------------------------------------------------------- init */
  let initialized = false;
  function init(opts) {
    if (initialized && !(opts && opts.force)) return api;
    // reset (supports re-init in tests)
    store.products = []; store.documents = []; store.users = [];
    store.brandGrants = []; store.permissionSets = [];
    session = { userId: null };
    seedProducts();
    seedUsers();
    seedDocuments();
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
    products: () => store.products.slice(),
    activeProducts: () => store.products.filter((p) => p.is_active),
    productBySlug: (slug) => store.products.find((p) => p.slug === slug) || null,
    documents: () => store.documents.slice(),
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
