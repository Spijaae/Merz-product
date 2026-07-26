/* Headless test runner (Node, no dependencies).
   Usage: node tests/run.js
   Loads the browser modules against a minimal window/localStorage shim. */
'use strict';
const fs = require('fs');
const path = require('path');

// Minimal browser-global shims.
global.window = global;
const _ls = Object.create(null);
global.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; }
};

function loadJs(rel) {
  const code = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  (0, eval)(code); // indirect eval → runs in global scope
}

['../js/data.js', '../js/services.js', '../js/components.js', './tests.js'].forEach(loadJs);

let pass = 0, fail = 0;
const line = (ok, m) => console.log((ok ? '  ok   ' : ' FAIL  ') + m);
const t = {
  ok: (c, m) => { c ? pass++ : fail++; line(!!c, m); },
  eq: (a, b, m) => { const c = a === b; c ? pass++ : fail++; line(c, m + (c ? '' : ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')')); }
};

try {
  global.MerzTests(t);
} catch (e) {
  fail++;
  console.log(' FAIL  test suite threw: ' + (e && e.stack ? e.stack : e));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
