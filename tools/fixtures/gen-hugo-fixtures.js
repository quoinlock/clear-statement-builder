// Generates the Hugo v1.7-format JSON/CSV fixtures in test/fixtures/hugo by
// executing the snapshot's own export logic over its sample data.
// Usage: node tools/fixtures/gen-hugo-fixtures.js
const fs = require('fs');
const path = require('path');
const { loadSnapshotJs } = require('./hugo-snapshot-loader');

const { state, products, reserves, sublicenses, FIELD_META, csvEscape, dataPackage } = loadSnapshotJs(
  'let detectedImport',
  '{ state, products, reserves, sublicenses, FIELD_META, csvEscape, dataPackage }'
);

const pkg = dataPackage();
pkg.generatedAt = '2026-03-15T10:00:00.000Z'; // frozen for reproducibility

const outDir = path.join(__dirname, '..', '..', 'test', 'fixtures', 'hugo');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'hugo-royalty-statement-RS-2026-0142.json'), JSON.stringify(pkg, null, 2) + '\n');

// Row building replicated from the snapshot's exportCSV() (download() needs DOM).
let rows = [];
rows.push(['Section', 'Field', 'Value', 'BISG ID', 'Category']);
Object.entries(state).forEach(([k, v]) => rows.push(['Statement', k, v, FIELD_META[k]?.[0] || '', FIELD_META[k]?.[1] || '']));
products.forEach((p, i) => Object.entries(p).forEach(([k, v]) => rows.push([`Product ${i + 1}`, k, v, FIELD_META[k]?.[0] || '', FIELD_META[k]?.[1] || ''])));
reserves.forEach((r, i) => Object.entries(r).forEach(([k, v]) => rows.push([`Reserve ${i + 1}`, k, v, FIELD_META[k]?.[0] || '', FIELD_META[k]?.[1] || ''])));
sublicenses.forEach((s, i) => Object.entries(s).forEach(([k, v]) => rows.push([`Sublicense ${i + 1}`, k, v, FIELD_META[k]?.[0] || '', FIELD_META[k]?.[1] || ''])));
fs.writeFileSync(path.join(outDir, 'hugo-royalty-statement-RS-2026-0142.csv'), rows.map(r => r.map(csvEscape).join(',')).join('\n'));

console.log('totals:', JSON.stringify(pkg.totals));
console.log('validation score:', pkg.validation.score, 'checks:', pkg.validation.checks.length);
console.log('warnings:', pkg.calculationWarnings.length);
