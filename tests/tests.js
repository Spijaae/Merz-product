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

    const allSlugs = S.ownProductSlugs();
    t.ok(allSlugs.length >= 4 && allSlugs.every((s) => S.canAccessProduct(s)), 'rep can access all granted (own) products by default');
    t.ok(!S.canAccessProduct('competitor-tox-a'), 'rep is NOT granted competitor products by default');

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

    /* ---- Area 2: product catalog CRUD ---- */
    S.init({ fresh: true });
    const before = S.products().length;
    // add
    const add = S.addProduct({ slug: 'new-filler', display_name: 'New Filler', category: 'HA Filler', aliases: 'nf, newfiller' });
    t.ok(add.ok && S.products().length === before + 1, 'addProduct creates a product');
    t.eq(S.productBySlug('new-filler').aliases.join(','), 'nf,newfiller', 'aliases normalized to lowercase list');
    // unique slug
    t.ok(!S.addProduct({ slug: 'new-filler', display_name: 'Dup' }).ok, 'duplicate slug rejected');
    // invalid slug
    t.ok(!S.addProduct({ slug: 'Bad Slug', display_name: 'x' }).ok, 'invalid slug rejected');
    // immutable slug on update
    S.updateProduct('new-filler', { slug: 'hacked', display_name: 'Renamed' });
    t.ok(!!S.productBySlug('new-filler') && !S.productBySlug('hacked'), 'slug is immutable on update');
    t.eq(S.productBySlug('new-filler').display_name, 'Renamed', 'display_name updates on rename');
    // deactivate ≠ delete
    S.setProductActive('new-filler', false);
    t.ok(!!S.productBySlug('new-filler'), 'deactivate keeps the product (not deleted)');
    t.ok(S.activeProducts().every((p) => p.slug !== 'new-filler'), 'deactivated product drops out of active list');
    t.ok(!S.authorizeRetrieval('new-filler').allowed, 'deactivated product is denied at retrieval');
    // competitor flag
    t.ok(S.productBySlug('competitor-tox-a').is_competitor, 'competitor products are first-class + flagged');

    /* ---- Area 3: KB ingestion + scoped vector retrieval ---- */
    S.init({ fresh: true });
    S.setSession('Karim A.');
    // seed corpus is retrievable and scoped by grants
    const r1 = S.retrieveChunks('How should Xeomin be reconstituted?', { productSlug: 'xeomin' });
    t.ok(r1.length > 0 && r1[0].chunk.product_slug === 'xeomin', 'seed corpus retrieves a scoped chunk');
    t.ok(Array.isArray(r1[0].chunk.heading_path) && r1[0].chunk.heading_path.length >= 2, 'chunk carries a heading path (section-level citation)');
    // retrieval is denied for a product the rep is not granted
    const karim2 = S.userByName('Karim A.');
    S.setBrandGrants(karim2.id, S.ownProductSlugs().filter((s) => s !== 'radiesse'));
    t.eq(S.retrieveChunks('Radiesse contraindications', { productSlug: 'radiesse' }).length, 0, 'retrieval returns nothing for an ungranted product (enforced)');
    S.setBrandGrants(karim2.id, S.ownProductSlugs().slice());

    // upload → parse → chunk → embed → index lifecycle
    const up = S.uploadDocument({ productSlug: 'xeomin', filename: 'Xeomin_New_Guide.pdf', blobPath: 'xeomin/new-guide.pdf' });
    t.ok(up.ok && up.doc.status === 'parsing', 'upload creates a document in parsing status');
    const fin = S.finalizeIngestion(up.doc.id);
    t.ok(fin.ok && fin.chunks > 0, 'finalize parses+chunks+indexes into active');
    t.eq(S.productBySlug('xeomin') && up.doc.status, 'active', 'document becomes active after ingestion');
    t.ok(S.chunksForDocument(up.doc.id).length > 0, 'chunks are indexed for the document');
    // unsupported type + path-based upsert
    t.ok(!S.uploadDocument({ productSlug: 'xeomin', filename: 'notes.txtx' }).ok, 'unsupported file type rejected');
    const docsBefore = S.documents().length;
    const up2 = S.uploadDocument({ productSlug: 'xeomin', filename: 'Xeomin_New_Guide_v2.pdf', blobPath: 'xeomin/new-guide.pdf' });
    t.ok(up2.ok && up2.replaced && S.documents().length === docsBefore, 'reusing a blob path replaces the document (no duplicate)');
    // archive ≠ delete + excluded from retrieval
    S.finalizeIngestion(up2.doc.id);
    S.archiveDocument(up2.doc.id);
    t.ok(S.documentsByStatus('archived').some((d) => d.id === up2.doc.id), 'archived document is kept (not deleted)');
    const activeIds = S.documentsByStatus('active').map((d) => d.id);
    t.ok(activeIds.indexOf(up2.doc.id) === -1, 'archived document drops out of the active set');

    S.init({ fresh: true });

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
