// Report window stub for PR 10; PR 17 replaces this with the full
// standalone HTML report (blob: URL, 1180x900, Appendix E CSS).
import type { ReviewDocument } from '../../core/review/index.ts';

export function showReviewReport(_review: ReviewDocument): void {
  window.alert('The standalone report window ships in a later slice. Use the JSON/CSV exports meanwhile.');
}
