// Help Center copy deck (PRD Appendix D, rebranded; Hugo credited in tabs
// 1 and 8). Eight tabs matching the snapshot's section structure.
import type { ReactNode } from 'react';
import { TAGLINE } from '../brand.ts';

export interface HelpSection {
  id: string;
  title: string;
  body: ReactNode;
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'overview',
    title: 'What CLEAR Statement Builder is',
    body: (
      <>
        <p>
          <b>{TAGLINE}</b>
        </p>
        <p>
          A BISG-focused royalty statement tool (prior art: Hugo prototype v1.7 by Sebastian Ritscher,
          Mohrbooks). It helps publishers, agents, and rights professionals create, review, import, validate,
          and export BISG-aligned royalty statements.
        </p>
        <ul>
          <li>Create structured statements from scratch.</li>
          <li>
            Choose the statement type in the top bar: <b>Translation</b> (translation-rights deals, the
            default) or <b>Standard</b> (ordinary royalty statements — translation-only fields such as
            Language, Licensee Title, Sales Territory, Advance Currency, and Co-Agent Commission are
            disabled but their values are kept).
          </li>
          <li>Import and digest publisher statements, including Ullstein-style PDFs.</li>
          <li>Validate completeness against the BISG-aligned field categories.</li>
          <li>Review calculation warnings and missing mappings.</li>
          <li>Export as PDF, JSON, or CSV.</li>
        </ul>
        <p>
          Why it exists: royalty reporting can become clearer and easier to compare by translating the BISG
          standard into a practical interface.
        </p>
        <p>
          <b>Prototype status:</b> a public tool for discussion and testing. Not a production accounting
          system. Not BISG certification. Do not use a shared demo for confidential live royalty reporting.
        </p>
      </>
    ),
  },
  {
    id: 'workflow',
    title: 'How to use',
    body: (
      <ol>
        <li>Open the app. No login.</li>
        <li>
          Add data. Click <b>Load sample</b> for a demo, or enter contract, party, product, royalty, and
          payment data. On a first visit the sample may already be loaded.
        </li>
        <li>Import, if useful. Upload PDF, TXT, CSV, or JSON, or paste text.</li>
        <li>
          Review imported data: detected fields, contract splits, confidence, unmapped lines. Apply only the
          statement you want. JSON/CSV imports also require Apply.
        </li>
        <li>Check validation and calculation warnings. Resolve missing required fields; review mismatches.</li>
        <li>Preview and export. Print / save as PDF or export JSON/CSV.</li>
      </ol>
    ),
  },
  {
    id: 'import',
    title: 'Import statements',
    body: (
      <>
        <ul>
          <li>Intake: PDF with extractable text (not OCR), TXT or pasted text, CSV, JSON.</li>
          <li>
            Ullstein/Bonnier statements are split by <b>Interne VertragsNr.</b> — apply one internal contract
            at a time.
          </li>
          <li>
            Detects separate internal contract statements, book/title blocks, product rows (TB, E-Book, ...),
            ISBNs, quantity columns, Berechnung in EUR / Guthaben in EUR, and opening / current royalties /
            new carried-forward balances where recognizable.
          </li>
        </ul>
        <p>
          <b>Review before applying is a hard rule.</b> Nothing changes your statement until you apply it.
        </p>
      </>
    ),
  },
  {
    id: 'interface',
    title: 'Interface guide',
    body: (
      <ul>
        <li>Top toolbar: clear (statement only), sample, exports, import, review, help, print.</li>
        <li>Left navigation: statement data, product/reserve/sublicense rows, import, profiles, validation, review, about.</li>
        <li>Middle: the selected form or tool panel. Right: the live two-page A4 preview.</li>
        <li>All guidance is in-app; there is no dependency on external PDF guides.</li>
      </ul>
    ),
  },
  {
    id: 'validation',
    title: 'Validation & warnings',
    body: (
      <ul>
        <li>
          Completeness categories: required / recommended / conditional / remittance. The score is the
          percentage of <b>Required checks in the validation list</b>, not of every Required catalog key.
        </li>
        <li>
          Warnings: earnings vs rate × basis; reserve row sums vs the payment section; sublicense row sums vs
          the stated total; imported Vortrag vs computed balances.
        </li>
        <li>
          Show BISG field IDs in the preview (for example <code>Con61_SalesTerr</code>, <code>SS92_PayDue</code>).
        </li>
        <li>Human review is still required; this is not an audit.</li>
      </ul>
    ),
  },
  {
    id: 'exports',
    title: 'Export & print',
    body: (
      <ul>
        <li>Print / Save as PDF: A4 portrait; check your margins.</li>
        <li>
          Export JSON: structured <code>version 1.1.0</code> including the statement type; CSB{' '}
          <code>1.0.x</code> and Hugo <code>0.9</code> files are still readable.
        </li>
        <li>Export CSV: spreadsheet-friendly, not as rich as JSON.</li>
      </ul>
    ),
  },
  {
    id: 'limitations',
    title: 'Demo mode & limits',
    body: (
      <ul>
        <li>
          Use sample or anonymized data on public/shared browsers. Local private use is the v1 intent; this is
          still not a certified accounting system.
        </li>
        <li>
          Storage is browser-only <code>localStorage</code>, unencrypted — your OS user account is the
          confidentiality boundary.
        </li>
        <li>Import quality varies; scanned PDFs need OCR, which is not shipped.</li>
        <li>Does not replace accounting, legal, tax, or rights-management expertise.</li>
      </ul>
    ),
  },
  {
    id: 'credits',
    title: 'Guides & credits',
    body: (
      <>
        <p>This in-app Help replaces the prototype’s external guide PDFs.</p>
        <ul>
          <li>
            Prior art: <a href="https://hugo-prototype.netlify.app/">hugo-prototype.netlify.app</a> — no login
            — Sebastian Ritscher, sebastian.ritscher@mohrbooks.com
          </li>
          <li>
            Standard: <a href="https://knowledgecenter.bisg.org/226a2o7/">BISG Translation Rights Royalty Statement Standard</a>
          </li>
          <li>
            Feedback welcome on confusing fields, publisher-specific import failures, missing mappings, and
            calculation edge cases.
          </li>
        </ul>
      </>
    ),
  },
];
