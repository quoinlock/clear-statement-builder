// F10: About panel — the teal privacy notice and amber demo notice are
// mandatory (PRD), plus prior-art credit and non-certification framing.
export function AboutPanel() {
  return (
    <>
      <h2>About Clear Statement Builder</h2>
      <p className="panel-sub">
        A BISG-aligned translation-rights royalty statement tool. Clean-room reimplementation of the Hugo
        prototype v1.7 (Sebastian Ritscher, Mohrbooks Literary Agency, for the BISG Rights Committee). Not an
        official BISG product; not a certification tool; not a production accounting system.
      </p>
      <div className="notice notice-privacy">
        <b>Privacy:</b> everything you enter stays in this browser’s local storage on this device. Statement,
        bank, tax, and sales data are never uploaded — not to BISG, not to a hosting provider, not to a Clear
        Statement Builder server. Clearing your browser data removes it. Storage is unencrypted; your OS user
        account is the confidentiality boundary.
      </div>
      <div className="notice notice-demo">
        <b>Demo mode:</b> when using a shared or public installation, work with the sample or anonymized data
        only. Do not enter confidential royalty, tax, or banking information in public testing.
      </div>
      <p className="panel-sub">
        Standard: BISG Translation Rights Royalty Statement Standard (knowledgecenter.bisg.org). Prior art:
        hugo-prototype.netlify.app.
      </p>
    </>
  );
}
