/* =========================================================================
   Merz Product Expert — test definitions (zero-dependency).
   Runs in Node (tests/run.js) and in the browser (tests/index.html) against
   the same globals: MerzData, MerzService, MerzUI. `t` provides ok/eq.
   ========================================================================= */
(function (global) {
  global.MerzTests = function (t) {
    const S = global.MerzService, UI = global.MerzUI;

    /* ---- Area 1: service layer + access control enforcement ---- */
    S.init({ fresh: true });
    const karim = S.userByName('Karim A.');
    const fouad = S.userByName('Fouad J.');
    S.setSession('Karim A.');

    t.ok(S.products().length >= 4, 'products seeded from catalog');
    t.ok(!!karim && !!fouad, 'personas seeded (rep + admin)');
    t.eq(karim.role, 'member', 'signed-in rep is a member');
    t.eq(fouad.role, 'admin', 'admin persona is an admin');

    const allSlugs = S.activeProducts().map((p) => p.slug);
    t.ok(allSlugs.length >= 4 && allSlugs.every((s) => S.canAccessProduct(s)), 'rep can access all granted products by default');

    // Revoking a brand grant blocks retrieval (not just the menu).
    S.setBrandGrants(karim.id, allSlugs.filter((s) => s !== 'radiesse'));
    t.ok(!S.canAccessProduct('radiesse'), 'revoked product is not accessible');
    const auth = S.authorizeRetrieval('radiesse');
    t.ok(!auth.allowed && auth.reason === 'not_granted', 'retrieval is DENIED for a revoked product');
    t.ok(S.grantedProductSlugs().indexOf('radiesse') === -1, 'granted list excludes revoked product');
    t.ok(S.canAccessProduct('xeomin'), 'other grants unaffected');

    // Deactivating a product denies retrieval even when granted.
    S.setBrandGrants(karim.id, allSlugs.slice());
    const xe = S.productBySlug('xeomin'); xe.is_active = false;
    const a2 = S.authorizeRetrieval('xeomin');
    t.ok(!a2.allowed && a2.reason === 'inactive', 'inactive product is denied at retrieval');
    t.ok(S.grantedProductSlugs().indexOf('xeomin') === -1, 'inactive product excluded from granted list');
    xe.is_active = true;

    // Composable permission sets: admin holds all; members are explicit.
    t.ok(S.hasPermission('kb', fouad.id), 'admin holds every permission set');
    t.ok(!S.hasPermission('content', karim.id), 'member lacks a set by default (no super-role)');
    S.setPermission(karim.id, 'assessment', true);
    t.ok(S.hasPermission('assessment', karim.id), 'granted permission set is present');
    S.setPermission(karim.id, 'assessment', false);
    t.ok(!S.hasPermission('assessment', karim.id), 'revoked permission set is absent');

    // scopeProducts intersects a list with the user's grants.
    S.setBrandGrants(karim.id, ['xeomin']);
    t.eq(S.scopeProducts(['xeomin', 'radiesse', 'belotero']).join(','), 'xeomin', 'scopeProducts filters to granted only');

    /* ---- Area 1: reusable filtered-list (Part D4) ---- */
    const items = [{ name: 'Alpha', cat: 'x' }, { name: 'Beta', cat: 'y' }, { name: 'Gamma', cat: 'x' }];
    t.eq(UI.applyFilters({ items: items, query: 'be', searchKeys: ['name'] }).length, 1, 'filtered-list: text search');
    t.eq(UI.applyFilters({ items: items, filters: [{ key: 'cat', value: 'x' }] }).length, 2, 'filtered-list: dropdown filter');
    t.eq(UI.applyFilters({ items: items, query: 'a', searchKeys: ['name'], filters: [{ key: 'cat', value: 'x' }] }).length, 2, 'filtered-list: search + filter combined');
    t.eq(UI.applyFilters({ items: items, filters: [{ key: 'cat', value: 'all' }] }).length, 3, 'filtered-list: value "all" disables the filter');

    // Leave a clean, freshly seeded store for the app.
    S.init({ fresh: true });
  };
})(typeof window !== 'undefined' ? window : globalThis);
