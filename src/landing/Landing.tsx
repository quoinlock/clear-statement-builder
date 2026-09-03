// Landing page: explains CLEAR (the standard) and the Statement Builder
// (the tool) before the user opens the workspace at /builder/. Static copy;
// the field-category counts are derived from the catalog so they can never
// drift from the builder. Industry figures are the BISG Rights Committee
// findings recorded in docs/PRD.md ("Problem statement and industry context").
import { useEffect } from 'react';
import { FIELD_META } from '../core/catalog/fieldMeta.ts';
import type { BisgCategory } from '../core/types.ts';
import { APP_VERSION, BUILDER_URL, TAGLINE } from '../ui/brand.ts';

const CATEGORY_ORDER: BisgCategory[] = ['Required', 'Recommended', 'Conditional', 'Remittance'];

const CATEGORY_BLURB: Record<BisgCategory, string> = {
  Required: 'Must be present on every statement: parties, contract, title, period, units, rates, balances.',
  Recommended: 'Strengthen the statement when known: imprint, licensor contract ID, publication date, list price.',
  Conditional: 'Only when they apply: a separate payer, sublicense deals, co-agent commission.',
  Remittance: 'What the money needs to move: remittance ID, tax ID, exemption status, tax withheld.',
};

export function categoryCounts(): Record<BisgCategory, number> {
  const counts: Record<BisgCategory, number> = { Required: 0, Recommended: 0, Conditional: 0, Remittance: 0 };
  for (const [, category] of Object.values(FIELD_META)) counts[category] += 1;
  return counts;
}

export const FIELD_COUNT = Object.keys(FIELD_META).length;

/** How a publisher prints it → the CLEAR code the builder maps it to. */
const DECODER: { printed: string; hint: string; code: string; meaning: string }[] = [
  { printed: 'Vortrag lt. letzter Abrechnung', hint: 'German publisher PDF', code: FIELD_META.openingBalance[0], meaning: 'Opening balance' },
  { printed: 'Brought forward', hint: 'UK statement', code: FIELD_META.openingBalance[0], meaning: 'Opening balance' },
  { printed: 'Interne VertragsNr.', hint: 'Ullstein / Bonnier', code: FIELD_META.licenseeContractId[0], meaning: 'Licensee contract ID' },
  { printed: 'Honorar 7,5 %', hint: 'German product row', code: FIELD_META.rate[0], meaning: 'Royalty rate' },
  { printed: 'NVE 1.250', hint: 'Net receipts basis', code: FIELD_META.basis[0], meaning: 'Royalty basis' },
  { printed: 'Payment due', hint: 'Any language, any layout', code: FIELD_META.paymentDue[0], meaning: 'Payment due' },
];

const STEPS = [
  {
    n: '01',
    title: 'Build',
    body: 'Enter contract, party, product, reserve, sublicense, and remittance data in a structured form. A two-page A4 statement renders live as you type, with every CLEAR code one click away.',
  },
  {
    n: '02',
    title: 'Import',
    body: 'Drop a publisher PDF, TXT, CSV, or JSON. A deterministic digest labels each detected field with its confidence and shows the lines it could not map. Nothing changes until you apply it, one contract at a time.',
  },
  {
    n: '03',
    title: 'Check',
    body: 'A completeness score tracks the Required fields. Calculation warnings catch rate × basis mismatches, reserve rows that do not add up, and carried-forward balances that disagree with the maths.',
  },
  {
    n: '04',
    title: 'Share',
    body: 'Print the A4 statement, export JSON or CSV that round-trips into a spreadsheet, or send the plain-language review report that tells a publisher exactly which fields are missing.',
  },
];

function useReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach(n => n.classList.add('in'));
      return;
    }
    // Anything already on screen (deep links, restored scroll positions,
    // hidden tabs where observer callbacks are suspended) shows at once.
    const viewportBottom = window.innerHeight * 0.92;
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      if (r.top < viewportBottom && r.bottom > 0) n.classList.add('in');
    }
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    nodes.filter(n => !n.classList.contains('in')).forEach(n => io.observe(n));
    return () => io.disconnect();
  }, []);
}

/** The CLEAR wordmark drawn in CSS/SVG so it reads on dark backgrounds. */
function Wordmark() {
  return (
    <span className="wordmark" aria-label="CLEAR">
      <svg className="wordmark-mark" viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="2" fill="#00c3b2" />
        <path d="M5.5 12.5l4.5 4.5 9-10" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="wordmark-text" aria-hidden="true">
        CLEAR
      </span>
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** A miniature of the builder's two-page statement, drawn from the sample. */
function StatementMock() {
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock-page mock-page-back" />
      <div className="mock-page">
        <div className="mock-head">
          <div>
            <div className="mock-title">Royalty Statement</div>
            <div className="mock-sub">Statement RS-2026-0142 · 01 Jan – 31 Dec 2025</div>
          </div>
          <div className="mock-score">
            <span>Completeness</span>
            <span className="mock-track">
              <span className="mock-bar" />
            </span>
            <b>100%</b>
          </div>
        </div>
        <div className="mock-cols">
          <div>
            <div className="mock-label">
              Licensee <code>{FIELD_META.licenseeName[0]}</code>
            </div>
            <div className="mock-val">Harbor Light Press, Inc.</div>
          </div>
          <div>
            <div className="mock-label">
              Licensor <code>{FIELD_META.licensorName[0]}</code>
            </div>
            <div className="mock-val">Cedar Lane Rights LLC</div>
          </div>
        </div>
        <table className="mock-tbl">
          <thead>
            <tr>
              <th>Product form</th>
              <th>Rate</th>
              <th>Units</th>
              <th>Earnings</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Hardcover</td>
              <td>8.0%</td>
              <td>450</td>
              <td>864.00</td>
            </tr>
            <tr>
              <td>Paperback</td>
              <td>7.5%</td>
              <td>1,250</td>
              <td>1,500.00</td>
            </tr>
            <tr>
              <td>E-Book</td>
              <td>25.0%</td>
              <td>780</td>
              <td>1,785.00</td>
            </tr>
            <tr>
              <td>Audiobook</td>
              <td>25.0%</td>
              <td>315</td>
              <td>1,065.00</td>
            </tr>
          </tbody>
        </table>
        <div className="mock-sum">
          <div>
            <span>
              Total royalty earnings <code>{FIELD_META.totalRoyalty[0]}</code>
            </span>
            <b>5,214.00</b>
          </div>
          <div>
            <span>
              Opening balance <code>{FIELD_META.openingBalance[0]}</code>
            </span>
            <b>−2,450.00</b>
          </div>
          <div className="mock-due">
            <span>
              Payment due <code>{FIELD_META.paymentDue[0]}</code>
            </span>
            <b>USD 3,222.60</b>
          </div>
        </div>
      </div>
      <span className="chip chip-1">{FIELD_META.salesTerritory[0]}</span>
      <span className="chip chip-2">{FIELD_META.advanceAmount[0]}</span>
      <span className="chip chip-3">{FIELD_META.taxId[0]}</span>
      <span className="chip chip-4">{FIELD_META.sublicenseIncome[0]}</span>
    </div>
  );
}

export function Landing() {
  useReveal();
  const counts = categoryCounts();

  return (
    <div className="lp">
      <a className="lp-skip" href="#main">
        Skip to content
      </a>

      <header className="lp-nav">
        <a className="lp-nav-brand" href="#top" aria-label="CLEAR, back to top">
          <Wordmark />
        </a>
        <nav className="lp-nav-links" aria-label="Page sections">
          <a href="#what">What it is</a>
          <a href="#fields">The codes</a>
          <a href="#how">How it works</a>
          <a href="#privacy">Privacy</a>
          <a href="#standard">The standard</a>
        </nav>
        <a className="lp-btn lp-btn-nav" href={BUILDER_URL}>
          Open the builder <ArrowIcon />
        </a>
      </header>

      <main id="main">
        {/* ---------------------------------------------------------- hero */}
        <section className="hero" id="top">
          <div className="hero-bg" aria-hidden="true">
            <span className="orb orb-a" />
            <span className="orb orb-b" />
            <span className="orb orb-c" />
          </div>
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">{TAGLINE}</p>
              <h1>
                Royalty statements,
                <br />
                <em>finally legible.</em>
              </h1>
              <p className="lede">
                CLEAR gives every line of a royalty statement a shared code, so a licensor, an agent, and a
                publisher can read the same numbers the same way — in any language, on any layout. The CLEAR
                Statement Builder turns that standard into a checklist, a two-page statement, and a structured
                export. Entirely in your browser.
              </p>
              <div className="hero-actions">
                <a className="lp-btn lp-btn-primary" href={BUILDER_URL}>
                  Open the Statement Builder <ArrowIcon />
                </a>
                <a className="lp-btn lp-btn-ghost" href="#how">
                  See how it works
                </a>
              </div>
              <ul className="hero-trust" aria-label="At a glance">
                <li>No login</li>
                <li>No upload</li>
                <li>No tracking</li>
                <li>Free to use</li>
              </ul>
            </div>
            <div className="hero-visual">
              <StatementMock />
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- stats */}
        <section className="stats" aria-labelledby="stats-title">
          <h2 id="stats-title" className="sr-only">
            Why the industry needs a standard
          </h2>
          <div className="stats-inner">
            <div className="stat" data-reveal>
              <div className="stat-num">63%</div>
              <p>of surveyed rights professionals receive more than 100 royalty statements a year.</p>
            </div>
            <div className="stat" data-reveal style={{ transitionDelay: '90ms' }}>
              <div className="stat-num">4.5</div>
              <p>work-years spent by 41 respondents processing a single year of incoming statements.</p>
            </div>
            <div className="stat" data-reveal style={{ transitionDelay: '180ms' }}>
              <div className="stat-num">{FIELD_COUNT}</div>
              <p>coded fields that make any statement comparable, whichever system printed it.</p>
            </div>
          </div>
          <p className="stats-source">Source: BISG Rights Committee survey work, 2023–2026.</p>
        </section>

        {/* ---------------------------------------------------------- what */}
        <section className="what" id="what" aria-labelledby="what-title">
          <div className="section-inner">
            <div className="section-head" data-reveal>
              <p className="kicker">What CLEAR is</p>
              <h2 id="what-title">A standard for the information, not the layout.</h2>
              <p className="section-lede">
                Publisher statements arrive as PDFs, spreadsheets, and email. They abbreviate, translate, and
                omit. CLEAR does not tell a publisher how a statement should look. It names what has to be on
                it, and gives each item a code that survives translation.
              </p>
            </div>
            <div className="pillars">
              <article className="pillar" data-reveal>
                <div className="pillar-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3 8-8" />
                    <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
                  </svg>
                </div>
                <h3>A checklist</h3>
                <p>
                  {FIELD_COUNT} coded fields in four categories. The builder scores completeness as you go and
                  tells you which Required fields are still blank before the statement leaves your hands.
                </p>
              </article>
              <article className="pillar" data-reveal style={{ transitionDelay: '90ms' }}>
                <div className="pillar-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <path d="M14 3v6h6M8 13h8M8 17h5" />
                  </svg>
                </div>
                <h3>A readable statement</h3>
                <p>
                  Two A4 pages a recipient can verify line by line: parties, contract, products, reserves,
                  sublicenses, balance, remittance. Every figure is traceable to a code and a formula.
                </p>
              </article>
              <article className="pillar" data-reveal style={{ transitionDelay: '180ms' }}>
                <div className="pillar-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
                    <path d="M4 7l8 4 8-4M12 11v10" />
                  </svg>
                </div>
                <h3>A structured package</h3>
                <p>
                  The same statement as JSON and CSV, keyed by the CLEAR codes, so it drops into a rights
                  database or a spreadsheet without anyone retyping it from a PDF.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- fields */}
        <section className="fields" id="fields" aria-labelledby="fields-title">
          <div className="section-inner">
            <div className="section-head" data-reveal>
              <p className="kicker">The codes</p>
              <h2 id="fields-title">One code, every language.</h2>
              <p className="section-lede">
                A German publisher writes <i>Vortrag</i>. A British one writes <i>brought forward</i>. Under
                CLEAR both are <code>{FIELD_META.openingBalance[0]}</code>, and the builder knows what to do
                with it.
              </p>
            </div>
            <div className="decoder" data-reveal role="table" aria-label="How printed labels map to CLEAR codes">
              <div className="decoder-head" role="row">
                <span role="columnheader">What the publisher printed</span>
                <span role="columnheader" className="decoder-arrow-head" aria-hidden="true" />
                <span role="columnheader">CLEAR code</span>
              </div>
              {DECODER.map((row, i) => (
                <div className="decoder-row" role="row" key={`${row.printed}-${i}`} style={{ transitionDelay: `${i * 60}ms` }}>
                  <span role="cell" className="decoder-printed">
                    <b>{row.printed}</b>
                    <small>{row.hint}</small>
                  </span>
                  <span role="cell" className="decoder-arrow" aria-hidden="true">
                    <ArrowIcon />
                  </span>
                  <span role="cell" className="decoder-code">
                    <code>{row.code}</code>
                    <small>{row.meaning}</small>
                  </span>
                </div>
              ))}
            </div>
            <div className="categories">
              {CATEGORY_ORDER.map((category, i) => (
                <article className={`category category-${category.toLowerCase()}`} key={category} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                  <div className="category-count">
                    <span>{counts[category]}</span>
                    <small>fields</small>
                  </div>
                  <h3>{category}</h3>
                  <p>{CATEGORY_BLURB[category]}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- how */}
        <section className="how" id="how" aria-labelledby="how-title">
          <div className="section-inner">
            <div className="section-head" data-reveal>
              <p className="kicker">How the builder works</p>
              <h2 id="how-title">From a publisher’s PDF to a statement you can stand behind.</h2>
            </div>
            <ol className="steps">
              {STEPS.map((step, i) => (
                <li className="step" key={step.n} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="step-num" aria-hidden="true">
                    {step.n}
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="how-rule" data-reveal>
              <b>The hard rule:</b> review before apply. The importer never writes into your statement on its
              own, and it never guesses with a language model. Custom import profiles are plain patterns and
              aliases you can share with a colleague as a file.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------- privacy */}
        <section className="privacy" id="privacy" aria-labelledby="privacy-title">
          <div className="section-inner privacy-inner">
            <div className="privacy-copy" data-reveal>
              <p className="kicker kicker-light">Privacy</p>
              <h2 id="privacy-title">Nothing leaves this browser.</h2>
              <p className="section-lede section-lede-light">
                Royalty statements carry an author’s earnings, a publisher’s sales, tax IDs, and bank details.
                The builder is a static page: there is no server to send them to.
              </p>
              <ul className="privacy-list">
                <li>
                  <b>No backend, no account.</b> The app is plain files served to your browser. Nothing you
                  type is transmitted anywhere.
                </li>
                <li>
                  <b>No analytics, no third-party scripts.</b> A strict Content-Security-Policy forbids the
                  page from talking to any other host at all.
                </li>
                <li>
                  <b>Your data stays on your device.</b> Work in progress lives in this browser’s local
                  storage. Clearing browser data removes it; your OS user account is the confidentiality
                  boundary.
                </li>
                <li>
                  <b>Shared computer?</b> Use the built-in sample or anonymised data on any public or shared
                  installation.
                </li>
              </ul>
            </div>
            <div className="privacy-visual" data-reveal aria-hidden="true">
              <div className="vault">
                <svg viewBox="0 0 120 120" className="vault-ring">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" />
                  <circle cx="60" cy="60" r="42" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                </svg>
                <svg viewBox="0 0 24 24" className="vault-lock" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  <circle cx="12" cy="16" r="1.2" fill="currentColor" />
                </svg>
                <span className="vault-tag vault-tag-1">localStorage</span>
                <span className="vault-tag vault-tag-2">connect-src ’none’</span>
                <span className="vault-tag vault-tag-3">0 requests out</span>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ standard */}
        <section className="standard" id="standard" aria-labelledby="standard-title">
          <div className="section-inner">
            <div className="section-head" data-reveal>
              <p className="kicker">The standard behind it</p>
              <h2 id="standard-title">Built on BISG’s work, with credit where it is due.</h2>
            </div>
            <div className="standard-grid">
              <article className="standard-card" data-reveal>
                <h3>The BISG Translation Rights Royalty Statement Standard</h3>
                <p>
                  Developed by the Book Industry Study Group’s Rights Committee, the standard identifies the
                  information a royalty statement should carry and assigns each item an alphanumeric code. The
                  CLEAR codes track that field list.
                </p>
                <a href="https://knowledgecenter.bisg.org/226a2o7/" rel="noreferrer">
                  Read the standard at the BISG Knowledge Center <ArrowIcon />
                </a>
              </article>
              <article className="standard-card" data-reveal style={{ transitionDelay: '90ms' }}>
                <h3>The Hugo prototype</h3>
                <p>
                  Sebastian Ritscher of Mohrbooks Literary Agency built Hugo for the BISG Rights Committee after
                  comparing a real publisher statement with the standard. It proved the whole idea: live
                  preview, deterministic import, a completeness report. The CLEAR Statement Builder is a
                  clean-room, tested reimplementation of Hugo v1.7.
                </p>
                <a href="https://hugo-prototype.netlify.app/" rel="noreferrer">
                  Visit the Hugo prototype <ArrowIcon />
                </a>
              </article>
            </div>
            <p className="standard-note" data-reveal>
              CLEAR Statement Builder is an independent tool for standards discussion and local use. It is not
              an official BISG product, not a certification mark, and not a production accounting system.
            </p>
          </div>
        </section>

        {/* ----------------------------------------------------- final CTA */}
        <section className="cta" aria-labelledby="cta-title">
          <div className="cta-card" data-reveal>
            <h2 id="cta-title">Open a statement. Load the sample. See the codes.</h2>
            <p>The builder starts with a fictional, fully populated statement so you can explore every field.</p>
            <a className="lp-btn lp-btn-primary lp-btn-lg" href={BUILDER_URL}>
              Open the Statement Builder <ArrowIcon />
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <Wordmark />
            <p>{TAGLINE}</p>
          </div>
          <nav className="lp-footer-links" aria-label="Footer">
            <a href={BUILDER_URL}>Statement Builder</a>
            <a href="#what">What CLEAR is</a>
            <a href="#privacy">Privacy</a>
            <a href="https://knowledgecenter.bisg.org/226a2o7/" rel="noreferrer">
              BISG standard
            </a>
            <a href="https://hugo-prototype.netlify.app/" rel="noreferrer">
              Hugo prototype
            </a>
          </nav>
          <p className="lp-footer-fine">
            CLEAR Statement Builder {APP_VERSION}. Not an official BISG product. Not a certification tool. Not
            a production accounting system.
          </p>
        </div>
      </footer>
    </div>
  );
}
