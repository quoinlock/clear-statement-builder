# Clear Statement Builder

A **BISG-aligned translation-rights royalty statement tool**: create, import,
review, validate, and export royalty statements whose fields map to the 44
alphanumeric IDs of the BISG Translation Rights Royalty Statement Standard
(as implemented by the Hugo prototype's `FIELD_META`).

Clean-room TypeScript reimplementation of the public **Hugo prototype v1.7**
(Sebastian Ritscher, Mohrbooks Literary Agency, for the BISG Rights
Committee). Not an official BISG product, not a certification tool, not a
production accounting system. The frozen prototype snapshot in
[`reference/`](reference/) is the normative behavioral reference for importer
heuristics, preview markup, Help copy, Profile Builder chrome, and report
HTML; [`docs/PRD.md`](docs/PRD.md) owns everything else and is the product
gate.

## Privacy model

**Browser-only. No backend, no analytics, no CDN at runtime.** Statement,
bank, tax, and sales data never leave the machine. Persistence is
unencrypted origin `localStorage` under `csb.v1.*` keys — the OS user
account is the confidentiality boundary. pdf.js is vendored and lazy-loaded
with a same-origin worker. The production CSP ships in
[`public/_headers`](public/_headers) (Netlify-style; adapt for other hosts).

## Development

```sh
nvm use            # Node 24
npm install
npm run dev        # Vite dev server
npm test           # Vitest (core: node env; ui: jsdom + Testing Library)
npm run ci         # typecheck + tests + >=90% core coverage gate + build + CDN scan
```

`src/core` is framework-free by construction: it must not import React or
touch `window`/`document`/`localStorage` (enforced by
`test/core/boundaries.test.ts` and by running the core test project in a
plain Node environment). The `localStorage` adapter lives in `src/persist`.

## Docker

No local Node needed — the multi-stage [`Dockerfile`](Dockerfile) covers
both development and deployment. The runtime image builds the bundle, runs
the AC-SEC-1 CDN scan, and serves `dist/` from unprivileged nginx as
non-root on `${PORT}` (default 8080), with the CSP from
[`public/_headers`](public/_headers) mirrored in
[`docker/nginx.conf.template`](docker/nginx.conf.template) — keep the two
in sync.

```sh
docker compose up dev    # Vite dev server + HMR on http://localhost:5173
docker compose up web    # production build on http://localhost:8090
```

A [`Makefile`](Makefile) wraps the common loop (`make help` lists all
targets): `make dev`, `make start`/`stop`/`restart`, `make rebuild`, and
`make destroy` for a full teardown. The container always listens on 8080;
the host port for `web` defaults to 8090 and is overridable with
`CSB_PORT=nnnn`.

### Deploy: Compose on a server (e.g. Hetzner)

Copy the repo (or just build the image in CI and push it to a registry),
then on the host:

```sh
docker compose up -d web
```

Put a TLS-terminating reverse proxy (Caddy, Traefik, or nginx with
certbot) in front of the mapped host port (8090 by default, `CSB_PORT`
to change). The app sets its own security headers;
the proxy only needs to add HSTS.

### Deploy: Cloud Run

```sh
gcloud run deploy clear-statement-builder \
  --source . --region europe-west1 --allow-unauthenticated
```

Cloud Build uses the same Dockerfile; the image honors Cloud Run's
`$PORT` and runs as non-root. All data stays in the browser's
`localStorage`, so no environment variables, secrets, or persistent
storage are needed on either target — the container is a plain static
file server.

## Statement type (v2)

The top bar toggles between **Translation** (translation-rights statements,
the default and the v1 behavior) and **Standard** (ordinary royalty
statements). Standard mode disables the translation-only fields — Licensee
Title, Language, Sales Territory, Advance Currency, Co-Agent Commission % —
without clearing them, retitles the preview to "Royalty Statement",
excludes those fields from validation and review scoring (shown as "Not
applicable / not shown" in reports), and zeroes co-agent commission in the
totals. The canonical field list is `TRANSLATION_ONLY_KEYS` in
`src/core/catalog/applicability.ts`; the decision is recorded in the PRD
("v2: Statement type").

## File interchange

- Statement JSON writes `version: "1.1.0"` with a document-level
  `statementType`, and still **reads** CSB `1.0.x` (as Translation) and
  Hugo `0.9` exports (`hugo-royalty-statement-*.json`).
- Statement CSV round-trips the Hugo `Section,Field,Value,BISG ID,Category`
  shape byte-identically.
- Custom import profiles read the Hugo `{hugoProfileVersion:"1.7"}`
  envelope, a bare array, or `{profiles:[...]}`, and write the CSB envelope.
- Review reports export as HTML (report window), JSON
  (`reviewFormatVersion: "1.2"`, includes `statementType`), and CSV — all
  carrying the disclaimer.

## Known gaps / status

- **Ullstein golden fixtures are synthetic** (`test/fixtures/ullstein/`,
  marked TODO-REAL-FIXTURE). The PRD requires anonymized text extracts from
  real Ullstein/Bonnier PDFs before the importer is demo-eligible. The
  parity oracles were generated by executing the frozen snapshot's own
  digest (`tools/fixtures/`).
- **Open Question 4 is answered** (2026-09-01): statement currency is USD,
  no FX — `money()` renders `$`; the importer keeps its euro formatter for
  figures quoted from German source statements. The Appendix B sample is
  now a standard US domestic deal (Harbor Light Press); the original German
  snapshot objects survive as the Hugo provenance fixtures in
  `test/fixtures/hugo/`.
- **Open Questions 1–3 and 5–7** (product name, desktop packaging,
  first-visit mode, BISG branding, additional first-class profiles,
  license) ship with the PRD's stated defaults: title "Clear Statement
  Builder", browser-only, sample data on first visit
  (flag `csb.v1.firstVisitMode`), no BISG logo, Ullstein as the only
  first-class publisher profile.
- OCR for scanned PDFs is out of scope (an image-only PDF gets an explicit
  error). No auth, no cloud storage, no LLM extraction — by design.
