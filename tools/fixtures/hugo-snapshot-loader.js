// Loads the frozen Hugo v1.7 snapshot's inline JS (or a prefix of it) for
// execution in Node, so fixtures/oracles come from the snapshot's own code.
// The snapshot is DOM-heavy only in its tail (rendering + event wiring); the
// data model, calculation, export, and digest functions load cleanly with a
// localStorage stub.
const fs = require('fs');
const path = require('path');

const SNAPSHOT = path.join(__dirname, '..', '..', 'reference', 'hugo-prototype-v1.7.html');

function loadSnapshotJs(cutMarker, exposeExpr) {
  global.localStorage = global.localStorage || {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  const html = fs.readFileSync(SNAPSHOT, 'utf8');
  const start = html.indexOf('<script>');
  const end = html.indexOf('</script>', start);
  let js = html.slice(start + '<script>'.length, end);
  if (cutMarker) {
    const cut = js.indexOf(cutMarker);
    if (cut === -1) throw new Error(`cut marker not found: ${cutMarker}`);
    js = js.slice(0, cut);
  }
  // Indirect eval: function declarations attach to globalThis, but let/const
  // do not, so the caller names what it needs via exposeExpr.
  (0, eval)(js + `\nglobalThis.__hugo = ${exposeExpr};`);
  return globalThis.__hugo;
}

module.exports = { loadSnapshotJs };
