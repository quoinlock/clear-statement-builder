// PR 14: PDF extraction shape (Hugo page-join parity) and the AC-IMP-12
// empty-text error, exercised against a fake pdf.js. The vendored-bundle
// no-CDN property (AC-SEC-1/3) is asserted on the built output in PR 20.
import { describe, expect, it } from 'vitest';
import {
  EmptyPdfTextError,
  extractTextWithLib,
  type PdfLibLike,
} from '../../src/pdf/extractText.ts';

function fakeLib(pages: string[][]): PdfLibLike {
  return {
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: pages.length,
        getPage: (n: number) =>
          Promise.resolve({
            getTextContent: () => Promise.resolve({ items: pages[n - 1].map(str => ({ str })) }),
          }),
      }),
    }),
  };
}

describe('extractTextWithLib', () => {
  it('joins pages with the Hugo banner and one item per line', async () => {
    const text = await extractTextWithLib(fakeLib([['a', 'b'], ['c']]), new ArrayBuffer(0));
    expect(text).toBe('\n\n--- Page 1 ---\na\nb\n\n--- Page 2 ---\nc');
  });

  it('AC-IMP-12: an image-only PDF (no text items) throws the explicit error', async () => {
    await expect(extractTextWithLib(fakeLib([[], []]), new ArrayBuffer(0))).rejects.toThrow(EmptyPdfTextError);
    await expect(extractTextWithLib(fakeLib([['   ', '']]), new ArrayBuffer(0))).rejects.toThrow(
      /scanned or image-only/,
    );
  });
});
