/* =========================================================================
   Merz Product Expert — in-browser vector space (RAG core)

   Client-only simulation: there is no embedding API. We use a classic
   TF-IDF vector-space model over the chunk corpus, with cosine similarity.
   It is a genuine vector retrieval (sparse term vectors, IDF weighting,
   cosine ranking) — not substring matching — so the Ask pipeline behaves
   like a real RAG retriever, just without a neural embedder.

   Pure library: it never touches the store or access control. The service
   decides which chunks are IN SCOPE (brand grants) and passes them here;
   retrieval enforcement therefore stays centralized in the service.
   ========================================================================= */
(function (global) {
  'use strict';

  const STOP = new Set(['the', 'and', 'for', 'are', 'can', 'what', 'how', 'should', 'does', 'with',
    'about', 'used', 'use', 'tell', 'give', 'this', 'that', 'from', 'have', 'has', 'was', 'its',
    'me', 'is', 'of', 'in', 'a', 'an', 'be', 'to', 'do', 'my', 'you', 'it', 'on', 'at', 'or', 'by', 'as']);

  function tokenize(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t));
  }

  // Term-frequency map for a piece of text (the "embedding" pre-IDF).
  function termFreq(text) {
    const tf = Object.create(null);
    const toks = tokenize(text);
    toks.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
    return { tf: tf, len: toks.length };
  }

  // Inverse document frequency across a chunk corpus.
  function idfFor(chunks) {
    const df = Object.create(null);
    chunks.forEach((c) => {
      const seen = Object.create(null);
      Object.keys(c._tf || (c._tf = termFreq(c.text).tf)).forEach((t) => {
        if (!seen[t]) { df[t] = (df[t] || 0) + 1; seen[t] = 1; }
      });
    });
    const N = chunks.length || 1;
    return (term) => Math.log((N + 1) / ((df[term] || 0) + 1)) + 1;
  }

  // Cosine similarity between two weighted sparse vectors (plain objects).
  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (const k in a) { na += a[k] * a[k]; if (b[k]) dot += a[k] * b[k]; }
    for (const k in b) { nb += b[k] * b[k]; }
    if (!na || !nb) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  function weightedVector(tf, idf) {
    const v = Object.create(null);
    for (const t in tf) v[t] = tf[t] * idf(t);
    return v;
  }

  /* Rank chunks against a query. Returns [{ chunk, score }] sorted desc.
     opts: { topK=4, minScore=0.04 } */
  function retrieve(queryText, chunks, opts) {
    opts = opts || {};
    const topK = opts.topK || 4;
    const minScore = opts.minScore != null ? opts.minScore : 0.04;
    if (!chunks || !chunks.length) return [];
    const idf = idfFor(chunks);
    const qv = weightedVector(termFreq(queryText).tf, idf);
    const scored = chunks.map((c) => {
      const cv = weightedVector(c._tf || (c._tf = termFreq(c.text).tf), idf);
      return { chunk: c, score: cosine(qv, cv) };
    }).filter((r) => r.score >= minScore);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  global.MerzRAG = {
    tokenize: tokenize, termFreq: termFreq, cosine: cosine, retrieve: retrieve
  };
})(typeof window !== 'undefined' ? window : globalThis);
