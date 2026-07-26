/* =========================================================================
   Merz Product Expert — shared UI components

   Part D4: ONE filtered-list component for the recurring pattern of
   "search box + dropdown filters + result count + rows". Reused by the
   Question manager, Users, Products, Knowledge base, Library and the
   content-gap queue so the pattern lives in a single place.

   This is a string-template component to match the app's existing render
   style. It splits into:
     - applyFilters(items, spec)  → pure, testable filtering + search
     - filteredListHtml(spec)     → renders search + filter chips + count + rows
   Interactions are delegated via data-action, consistent with app.js.
   ========================================================================= */
(function (global) {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Pure filtering — no DOM. Given items + a spec, return the filtered subset.
     spec = {
       items, query, searchKeys:[...], searchFn?,
       filters: [{ key, value, match?(item,value) }]   // value 'all' = no filter
     } */
  function applyFilters(spec) {
    const items = spec.items || [];
    const q = (spec.query || '').toLowerCase().trim();
    const searchKeys = spec.searchKeys || [];
    const filters = spec.filters || [];

    return items.filter((it) => {
      // text search
      if (q) {
        let hit = false;
        if (typeof spec.searchFn === 'function') {
          hit = spec.searchFn(it, q);
        } else {
          hit = searchKeys.some((k) => {
            const v = typeof k === 'function' ? k(it) : it[k];
            return v != null && String(v).toLowerCase().indexOf(q) !== -1;
          });
        }
        if (!hit) return false;
      }
      // dropdown/toggle filters
      for (const f of filters) {
        if (f.value == null || f.value === 'all') continue;
        if (typeof f.match === 'function') { if (!f.match(it, f.value)) return false; }
        else if (it[f.key] !== f.value) return false;
      }
      return true;
    });
  }

  /* Render the full control + list. spec adds:
     searchAction, searchId, searchPlaceholder,
     filters:[{ key, value, label, action }]  → each a cycling chip button,
     rowRenderer(item)→html, countLabel(n,total)→string, emptyHtml */
  function filteredListHtml(spec) {
    const filtered = applyFilters(spec);
    const total = (spec.items || []).length;

    const search = spec.searchAction ? `
      <div class="fl-search">
        ${spec.icon || ''}
        <input id="${spec.searchId || 'flInput'}" data-action="${spec.searchAction}"
          placeholder="${esc(spec.searchPlaceholder || 'Search…')}"
          value="${esc(spec.query || '')}" autocomplete="off">
      </div>` : '';

    const chips = (spec.filters || []).filter((f) => f.action).map((f) =>
      `<button class="fl-filter ${f.value && f.value !== 'all' ? 'on' : ''}" data-action="${f.action}">
        ${esc(f.label != null ? f.label : (f.value === 'all' ? 'All' : f.value))}</button>`
    ).join('');

    const count = spec.countLabel
      ? spec.countLabel(filtered.length, total)
      : `${filtered.length} of ${total}`;

    const rows = filtered.length
      ? filtered.map(spec.rowRenderer).join('')
      : (spec.emptyHtml || '<div class="fl-empty">No matches.</div>');

    return `
      <div class="filtered-list">
        <div class="fl-controls">
          ${search}
          <div class="fl-filters">${chips}</div>
          <span class="fl-count">${esc(count)}</span>
        </div>
        <div class="fl-rows">${rows}</div>
      </div>`;
  }

  global.MerzUI = { applyFilters: applyFilters, filteredListHtml: filteredListHtml };
})(typeof window !== 'undefined' ? window : globalThis);
