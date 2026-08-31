# Ullstein/Bonnier golden fixtures

**TODO-REAL-FIXTURE — these are SYNTHETIC.** The PRD (Appendix F) requires
anonymized text extracts captured from real Ullstein/Bonnier PDFs via pdf.js
`getTextContent()` ("not imagined prose") before the Ullstein parser is
considered demo-eligible. No real statements were available when these were
authored (2026-08-31). Replace each file with a real anonymized extract that
preserves the same coverage, then regenerate the parity oracles.

The synthetic files replicate the exact extract shape Hugo v1.7 produces
(`\n\n--- Page N ---\n` before every page, one pdf.js text item per line) and
were validated by executing the frozen snapshot's own `digestStatementText`
against them. Coverage per the PRD:

| File | Covers |
|---|---|
| `two-contracts.txt` | Two `Interne VertragsNr.` blocks (inline marker + bare-label marker), NLP/BLP inline honor line, NVE inline honor line, prior/LTD `honorarpflichtige Menge Gesamt per` lines, all three balance lines, `c/o` payer inference |
| `inline-honorar.txt` | The PRD's worked example `362 Honorar 6,0000 %; NLP 12,14; BLP 12,99 263,68` in a single-contract statement |
| `non-2025-period.txt` | A 2024 accounting period: `honorarpflichtige Menge Gesamt per 01.01.2024` / `31.12.2024`. Hugo's hardcoded-2025 regex finds nothing (prior/period units empty in the parity oracle); CSB's generalized regex (AC-IMP-11, v1 MUST) must yield priorUnits 800, ltd 1100, periodUnits 300 |

`expected/*.hugo-parity.json` are **parity oracles**: the frozen snapshot's
actual `digestStatementText` output for each fixture (sourceText/rawText
stripped). CSB golden tests assert parity against these, except where the PRD
mandates a labeled v1 improvement (the non-2025 date generalization), which is
asserted separately.

Regenerate: `node tools/fixtures/gen-ullstein-oracle.js` (and
`node tools/fixtures/gen-hugo-fixtures.js` for the Hugo JSON/CSV fixtures) —
both execute the frozen snapshot's own JS in Node with a localStorage stub.
