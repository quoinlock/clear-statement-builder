// Brand constants. The wordmark is always the capitalized "CLEAR"; the
// tagline is the one-line expansion used in the app bar, About, Help, and
// the review report. Colour tokens live in theme.css (purple + teal).
export const PRODUCT_NAME = 'CLEAR Statement Builder';
export const TAGLINE = 'The Common Licensing & Earnings Accounting Report Standard';
export const APP_VERSION = 'v2.2.0';
// Base-relative so a project-site deploy (GitHub Pages /<repo>/) resolves.
export const LOGO_SRC = `${import.meta.env.BASE_URL}brand/clear-logo.png`;
// Two static entry points: the landing page at the base URL explains CLEAR;
// the Statement Builder itself lives under builder/ (see vite.config.ts).
export const LANDING_URL = import.meta.env.BASE_URL;
export const BUILDER_URL = `${import.meta.env.BASE_URL}builder/`;
