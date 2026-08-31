// PDF text extraction (PRD Key Decision 3/9): pdf.js is VENDORED (bundled
// from the pinned npm package, worker emitted same-origin) and lazy-loaded
// on first use — no cdnjs at runtime (AC-SEC-1). This module only extracts
// text; it never interprets royalty semantics.
//
// Output shape is Hugo parity: every page is prefixed with
// "\n\n--- Page N ---\n" and each text item is on its own line — the
// line-oriented Ullstein parser depends on exactly this.

export interface PdfTextItem {
  str: string;
}

export interface PdfPageLike {
  getTextContent(): Promise<{ items: PdfTextItem[] }>;
}

export interface PdfDocumentLike {
  numPages: number;
  getPage(n: number): Promise<PdfPageLike>;
}

export interface PdfLibLike {
  getDocument(params: { data: ArrayBuffer }): { promise: Promise<PdfDocumentLike> };
}

/** Thrown when a PDF parses but contains no extractable text (scan/image PDF). */
export class EmptyPdfTextError extends Error {
  constructor() {
    super(
      'No text could be extracted from this PDF. It is probably a scanned or image-only document; OCR is not supported. Paste the statement text instead.',
    );
  }
}

export async function extractTextWithLib(lib: PdfLibLike, data: ArrayBuffer): Promise<string> {
  const pdf = await lib.getDocument({ data }).promise;
  let out = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    out += '\n\n--- Page ' + p + ' ---\n' + tc.items.map(i => i.str).join('\n');
  }
  if (!out.replace(/--- Page \d+ ---/g, '').trim()) {
    throw new EmptyPdfTextError();
  }
  return out;
}

let libPromise: Promise<PdfLibLike> | null = null;

async function loadPdfJs(): Promise<PdfLibLike> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url,
  ).toString();
  return pdfjs as unknown as PdfLibLike;
}

/** Lazy-loads the vendored pdf.js on first call and extracts text. */
export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  libPromise ??= loadPdfJs();
  return extractTextWithLib(await libPromise, data);
}
