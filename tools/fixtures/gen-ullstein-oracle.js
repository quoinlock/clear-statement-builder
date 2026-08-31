// Regenerates test/fixtures/ullstein/expected/*.hugo-parity.json by running
// the frozen snapshot's digestStatementText over each fixture .txt.
// Usage: node tools/fixtures/gen-ullstein-oracle.js
const fs = require('fs');
const path = require('path');
const { loadSnapshotJs } = require('./hugo-snapshot-loader');

const digest = loadSnapshotJs('async function readPdfText', 'digestStatementText');

const fixDir = path.join(__dirname, '..', '..', 'test', 'fixtures', 'ullstein');
const outDir = path.join(fixDir, 'expected');
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(fixDir).filter(f => f.endsWith('.txt'))) {
  const text = fs.readFileSync(path.join(fixDir, f), 'utf8');
  const r = digest(text, 'auto');
  delete r.rawText; // bulky; equals normalizeText(fixture)
  r.contractStatements.forEach(cs => {
    delete cs.sourceText;
    cs.products.forEach(p => delete p.sourceText);
  });
  r.products.forEach(p => delete p.sourceText);
  fs.writeFileSync(path.join(outDir, f.replace('.txt', '.hugo-parity.json')), JSON.stringify(r, null, 2) + '\n');
  console.log('==', f, 'profile:', r.profile, 'contracts:', r.contractStatements.length, 'products:', r.products.length);
}
