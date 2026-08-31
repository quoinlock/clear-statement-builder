// Live two-page A4 preview. Full parity markup lands in PR 9.
export function Preview() {
  return (
    <main className="preview-wrap" aria-label="Statement preview">
      <div className="page" />
      <div className="page" />
    </main>
  );
}
