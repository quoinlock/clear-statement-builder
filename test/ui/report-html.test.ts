// PR 17: report document builder (AC-REV-4 HTML half; AC-REV-5 structure,
// automatable portion — window/print behavior stays a manual check).
import { describe, expect, it } from 'vitest';
import { buildReviewReportHtml, esc } from '../../src/ui/review/reportHtml.ts';
import { reviewData } from '../../src/core/review/index.ts';
import { cloneSampleDocument } from '../../src/core/sample/index.ts';

describe('review report HTML', () => {
  const input = cloneSampleDocument();
  const review = reviewData({ ...input, generatedAt: '2026-03-15T10:00:00.000Z' });
  const html = buildReviewReportHtml(review);

  it('AC-REV-4: contains the disclaimer and the non-certification sentence', () => {
    expect(html).toContain(esc(review.disclaimer));
    expect(html).toContain('This is not BISG certification or approval.');
  });

  it('AC-REV-5 structure: category scores, missing table, appendices A and B', () => {
    expect(html).toContain('Category scores');
    expect(html).toContain('Missing fields');
    expect(html).toContain('Appendix A — Field-by-field BISG checklist');
    expect(html).toContain('Appendix B — Extracted/current product data');
    expect(html).toContain('class="score-donut"');
    expect(html).toContain(`${review.overallScore}%`);
    // Print rules present (toolbar hidden when printing).
    expect(html).toContain('@media print{.report-toolbar{display:none}');
  });

  it('is rebranded: no Hugo-branded toolbar, no BISG-compliant claim', () => {
    expect(html).toContain('CLEAR Statement Builder Review Report');
    expect(html).not.toContain('Hugo Review Report');
  });

  it('escapes user data including quotes and apostrophes', () => {
    const hostile = cloneSampleDocument();
    hostile.state.licenseeTitle = `<script>alert('x')</script>"quoted"`;
    const out = buildReviewReportHtml(reviewData(hostile));
    expect(out).not.toContain(`<script>alert('x')`);
    expect(out).toContain('&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;&quot;quoted&quot;');
  });

  it('caps top recommendations at 6 in the report (7 in-panel)', () => {
    const sparse = cloneSampleDocument();
    for (const key of ['licenseeName', 'licensorName', 'contributorNames', 'licensorTitle', 'licenseeTitle', 'language', 'salesTerritory', 'advanceAmount', 'statementDate', 'openingBalance'] as const) {
      sparse.state[key] = '';
    }
    const r = reviewData(sparse);
    expect(r.topRecommendations.length).toBeLessThanOrEqual(7);
    const out = buildReviewReportHtml(r);
    const recCount = (out.match(/class="rec-no"/g) ?? []).length;
    expect(recCount).toBeLessThanOrEqual(6);
  });
});
