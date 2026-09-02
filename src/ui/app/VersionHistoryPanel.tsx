// F10: version history — CSB releases plus the collapsed Hugo v0.5–v1.7
// prototype history for provenance.
const HUGO_HISTORY: [version: string, note: string][] = [
  ['v0.5', 'Sample data, calculation warnings, demo mode, field IDs'],
  ['v0.6', 'First import/digest'],
  ['v0.7', 'Reviewable imports, confidence, unmapped lines, manual mapping'],
  ['v0.8', 'Ullstein split by Interne VertragsNr., better tables'],
  ['v0.9', 'Help Center'],
  ['v1.0', 'Review my statement + BISG report exports'],
  ['v1.1', 'Report window, accordion nav, version history'],
  ['v1.2', 'Compact sidebar'],
  ['v1.3', 'Report-window generator fix'],
  ['v1.4', 'Statement Data as default section'],
  ['v1.5', 'Finalized nav order'],
  ['v1.6', 'Sidebar overlap fix (nav gets its own column)'],
  ['v1.7', 'Custom Import Profiles / Profile Builder'],
];

export function VersionHistoryPanel() {
  return (
    <>
      <h2>Version history</h2>
      <p className="panel-sub">CLEAR Statement Builder releases, with the Hugo prototype lineage below.</p>
      <div className="issue good">
        <div className="issue-head">
          <span>v2.1.0</span>
          <span className="badge required">Current</span>
        </div>
        <p>
          Brand refresh and the "focused workspace" layout: CLEAR wordmark, purple/teal palette, logo and
          Montserrat title; a one-row app bar with a completeness meter and Export / More menus; the sections
          grouped into Build / Check / Import with row counts; and a live-preview toolbar with Fit / 100% zoom.
        </p>
      </div>
      <div className="issue">
        <div className="issue-head">
          <span>v2.0.0</span>
        </div>
        <p>
          Statement-type toggle: Standard vs Translation statements. Standard mode disables the
          translation-only fields (Language, Licensee Title, Sales Territory, Advance Currency, Co-Agent
          Commission — values are kept), retitles the preview, excludes those fields from validation and
          review scoring, and records the type in JSON exports (version 1.1.0; 1.0.x and Hugo 0.9 still
          readable). Statement currency is now USD, and the sample is a standard US domestic deal (Harbor
          Light Press) with Hardcover, Paperback, E-Book, and Audiobook product forms.
        </p>
      </div>
      <div className="issue">
        <div className="issue-head">
          <span>v1.0.0</span>
        </div>
        <p>
          Clean-room TypeScript reimplementation of Hugo v1.7: tested calculation/validation/review core,
          BISG field catalog, deterministic import with Ullstein contract splitting and custom profiles,
          two-page A4 preview, review reports, JSON 1.0.0 / CSV exports (Hugo 0.9 still readable), vendored
          pdf.js, browser-only storage.
        </p>
      </div>
      <details>
        <summary>Hugo prototype history (v0.5 – v1.7)</summary>
        <ul className="panel-sub" style={{ paddingLeft: 18 }}>
          {HUGO_HISTORY.map(([v, note]) => (
            <li key={v}>
              <b>{v}</b> — {note}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
