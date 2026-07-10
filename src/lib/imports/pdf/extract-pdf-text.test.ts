import { describe, expect, it } from 'vitest';

import { buildTestPdf } from '../fixtures/build-test-pdf';
import { extractPdfTextPages, isPdfBytes } from './extract-pdf-text';

describe('isPdfBytes', () => {
  it('detects the PDF magic bytes', () => {
    expect(isPdfBytes(buildTestPdf([{ runs: [] }]))).toBe(true);
  });

  it('rejects other files', () => {
    expect(isPdfBytes(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isPdfBytes(new Uint8Array())).toBe(false);
  });
});

describe('extractPdfTextPages', () => {
  it('throws for a file that is not a PDF', async () => {
    await expect(
      extractPdfTextPages(Uint8Array.from([1, 2, 3, 4, 5, 6])),
    ).rejects.toThrow(/not a PDF/i);
  });

  it('reads positioned text runs from every page', async () => {
    const pages = await extractPdfTextPages(
      buildTestPdf([
        { runs: [{ text: 'Izzy', x: 194, y: 431 }] },
        { runs: [{ text: 'Corey', x: 180, y: 627 }] },
      ]),
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].items).toEqual([
      { text: 'Izzy', width: 24, x: 194, y: 431 },
    ]);
    expect(pages[1].items).toEqual([
      { text: 'Corey', width: 30, x: 180, y: 627 },
    ]);
  });

  it('reports a run width that reflects the font size', async () => {
    const pages = await extractPdfTextPages(
      buildTestPdf([{ runs: [{ size: 40, text: 'Izzy', x: 10, y: 20 }] }]),
    );

    expect(pages[0].items[0].width).toBe(80);
  });

  it('keeps only one draw when the same run is painted repeatedly', async () => {
    // Chrome paints text shadows and strokes as extra draws at the same spot.
    const pages = await extractPdfTextPages(
      buildTestPdf([
        {
          runs: [
            { text: 'Izzy', x: 194, y: 431 },
            { text: 'Izzy', x: 194, y: 431 },
            { text: 'Izzy', x: 194, y: 431 },
            { text: 'James', x: 194, y: 514 },
          ],
        },
      ]),
    );

    expect(pages[0].items.map((item) => item.text)).toEqual(['Izzy', 'James']);
  });

  it('preserves spaces that the document draws inside a run', async () => {
    const pages = await extractPdfTextPages(
      buildTestPdf([{ runs: [{ text: 'AI Central', x: 105, y: 1809 }] }]),
    );

    expect(pages[0].items[0].text).toBe('AI Central');
  });

  it('reads a page whose text is spread over separately positioned glyphs', async () => {
    const pages = await extractPdfTextPages(
      buildTestPdf([
        {
          runs: [
            { text: 'I', x: 100, y: 50 },
            { text: 'z', x: 106, y: 50 },
            { text: 'z', x: 112, y: 50 },
            { text: 'y', x: 118, y: 50 },
          ],
        },
      ]),
    );

    expect(pages[0].items.map((item) => item.text).join('')).toBe('Izzy');
    expect(pages[0].items.map((item) => item.x)).toEqual([100, 106, 112, 118]);
  });
});
