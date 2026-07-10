/**
 * Builds a minimal PDF with a real text layer, shaped like the game result
 * pages Chrome prints: one positioned show-text operator per drawn run, a
 * simple font with a ToUnicode CMap, and uncompressed content streams.
 */

export type TestPdfTextRun = {
  /** Drawn once per entry; repeat a run to emulate Chrome's stacked draws. */
  size?: number;
  text: string;
  x: number;
  y: number;
};

export type TestPdfPage = {
  runs: TestPdfTextRun[];
};

const FIRST_CHAR = 32;
const LAST_CHAR = 126;
const GLYPH_WIDTH = 500;

const TO_UNICODE_CMAP = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
1 begincodespacerange
<20> <7E>
endcodespacerange
1 beginbfrange
<20> <7E> <0020>
endbfrange
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;

function escapeLiteral(text: string) {
  return text.replace(/([\\()])/g, '\\$1');
}

function buildContentStream(page: TestPdfPage) {
  return page.runs
    .map((run) =>
      [
        'BT',
        `/F1 ${run.size ?? 12} Tf`,
        `1 0 0 -1 ${run.x} ${run.y} Tm`,
        `(${escapeLiteral(run.text)}) Tj`,
        'ET',
      ].join('\n'),
    )
    .join('\n');
}

function buildStreamObject(objectNumber: number, contents: string) {
  return `${objectNumber} 0 obj <</Length ${contents.length}>>\nstream\n${contents}\nendstream endobj\n`;
}

export function buildTestPdf(pages: TestPdfPage[]): Uint8Array {
  const firstPageObject = 5;
  const pageObjectNumbers = pages.map(
    (_page, index) => firstPageObject + index * 2,
  );
  const widths = Array.from(
    { length: LAST_CHAR - FIRST_CHAR + 1 },
    () => GLYPH_WIDTH,
  ).join(' ');

  let file = '%PDF-1.4\n';

  file += '1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n';
  file += `2 0 obj <</Type /Pages /Count ${pages.length} /Kids [${pageObjectNumbers
    .map((objectNumber) => `${objectNumber} 0 R`)
    .join(' ')}]>> endobj\n`;
  file +=
    `3 0 obj <</Type /Font /Subtype /TrueType /BaseFont /Helvetica ` +
    `/FirstChar ${FIRST_CHAR} /LastChar ${LAST_CHAR} /Widths [${widths}] /ToUnicode 4 0 R>> endobj\n`;
  file += buildStreamObject(4, TO_UNICODE_CMAP);

  pages.forEach((page, index) => {
    const pageObjectNumber = pageObjectNumbers[index];
    const contentObjectNumber = pageObjectNumber + 1;

    file +=
      `${pageObjectNumber} 0 obj <</Type /Page /Parent 2 0 R ` +
      `/Resources <</Font <</F1 3 0 R>>>> /Contents ${contentObjectNumber} 0 R>> endobj\n`;
    file += buildStreamObject(contentObjectNumber, buildContentStream(page));
  });

  file += '%%EOF\n';

  return Uint8Array.from(file, (character) => character.charCodeAt(0));
}

/** Advance of a run drawn by {@link buildTestPdf}, for positioning follow-on runs. */
export function testPdfRunWidth(run: TestPdfTextRun) {
  return run.text.length * ((run.size ?? 12) * (GLYPH_WIDTH / 1000));
}
