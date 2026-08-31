// Opens the standalone review report in a new window (blob: URL, 1180x900)
// with the pop-up-blocked alert (F8 parity). URL revoked after 60s.
import type { ReviewDocument } from '../../core/review/index.ts';
import { buildReviewReportHtml } from './reportHtml.ts';

export function showReviewReport(review: ReviewDocument): void {
  const html = buildReviewReportHtml(review);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'width=1180,height=900');
  if (!w) {
    URL.revokeObjectURL(url);
    window.alert(
      'The report could not be opened because the browser blocked the pop-up. Please allow pop-ups for this site and try again.',
    );
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
