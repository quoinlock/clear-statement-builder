// F8: in-panel review — overall score with band copy, category cards, top
// recommendations, JSON/CSV export. The standalone report window is PR 17.
import { reviewData, scoreBand } from '../../core/review/index.ts';
import { serializeReviewCsv, serializeReviewJson, reviewFilename } from '../../core/schema/index.ts';
import { useAppStore } from '../app/store.tsx';
import { downloadFile } from '../app/download.ts';
import { showReviewReport } from './reportWindow.ts';

const BAND_COPY: Record<ReturnType<typeof scoreBand>, string> = {
  high: 'Strong BISG alignment. Review the remaining recommendations before sharing.',
  medium: 'Partial BISG alignment. Several important fields need attention.',
  low: 'Low BISG alignment. Many required fields are missing or unclear.',
};

export function ReviewPanel() {
  const store = useAppStore();
  const { state, products, reserves, sublicenses } = store.workspace;
  const review = reviewData({
    state,
    products,
    reserves,
    sublicenses,
    detections: store.detectedImport?.detections,
    profile: store.detectedImport?.profile ?? 'auto',
  });
  const band = scoreBand(review.overallScore);

  return (
    <>
      <h2>Review my statement</h2>
      <p className="panel-sub">Automated standards-completeness review of the current statement.</p>
      <div className="score">
        <span>
          Overall score: <b>{review.overallScore}</b>/100
        </span>
        <div className="scorebar-track">
          <div className="scorebar" style={{ width: `${review.overallScore}%` }} />
        </div>
      </div>
      <p className={`band band-${band}`}>{BAND_COPY[band]}</p>
      <div className="category-cards">
        {review.categoryScores.map(c => (
          <div className="category-card" key={c.category}>
            <div className="category-score">{c.score}</div>
            <div className="category-name">{c.category}</div>
            <div className="category-detail">
              {c.detected} detected · {c.unclear} unclear · {c.missing} missing
            </div>
          </div>
        ))}
      </div>
      <h3>Top recommendations</h3>
      {review.topRecommendations.length ? (
        review.topRecommendations.map(r => (
          <div className="issue warn" key={r.field}>
            <div className="issue-head">
              <span>{r.field}</span>
              <span className="badge idbadge">{r.bisgId || '—'}</span>
            </div>
            <p>
              <b>{r.priority} priority.</b> {r.recommendation} {r.why}
            </p>
          </div>
        ))
      ) : (
        <div className="issue good">
          <div className="issue-head">
            <span>No outstanding recommendations</span>
          </div>
          <p>All reviewed fields are present and clear.</p>
        </div>
      )}
      <div className="appbar-buttons" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-teal" onClick={() => showReviewReport(review)}>
          Open report window
        </button>
        <button
          type="button"
          className="btn btn-green"
          onClick={() => downloadFile(reviewFilename(state, 'json'), 'application/json', serializeReviewJson(review))}
        >
          Export review JSON
        </button>
        <button
          type="button"
          className="btn btn-amber"
          onClick={() => downloadFile(reviewFilename(state, 'csv'), 'text/csv;charset=utf-8', serializeReviewCsv(review))}
        >
          Export review CSV
        </button>
      </div>
      <p className="panel-sub" style={{ marginTop: 12 }}>
        {review.disclaimer}
      </p>
    </>
  );
}
