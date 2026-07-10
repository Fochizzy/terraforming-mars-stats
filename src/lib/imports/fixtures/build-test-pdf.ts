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
  /**
   * Runs drawn through a Form XObject, the way Chrome emits any element it
   * composites on its own (an `opacity` rule, for one). The form applies a
   * transform that its `Tm` translations already account for, so these land at
   * the same coordinates as {@link TestPdfPage.runs}.
   */
  formRuns?: TestPdfTextRun[];
  runs: TestPdfTextRun[];
  /**
   * Splits the drawing across two content streams, which the page then
   * references as `/Contents[a 0 R b 0 R]` — with no space before the bracket,
   * exactly as Chrome writes it.
   */
  splitContents?: boolean;
};

export type BuildTestPdfOptions = {
  /**
   * Numbers the page objects in reverse reading order. A PDF saved through an
   * incremental update renumbers the objects it rewrites, so its first page can
   * carry the highest object number in the file.
   */
  reversePageObjectNumbers?: boolean;
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

function buildTextRuns(runs: TestPdfTextRun[]) {
  return runs
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

function buildContentStream(page: TestPdfPage) {
  const drawn = buildTextRuns(page.runs);

  return page.formRuns?.length ? `${drawn}\n/X1 Do\n` : drawn;
}

/** Halves a page's runs so each half can be drawn from its own stream. */
function splitContentStreams(page: TestPdfPage) {
  const middle = Math.ceil(page.runs.length / 2);

  return [
    buildContentStream({ ...page, formRuns: undefined, runs: page.runs.slice(0, middle) }),
    buildContentStream({ ...page, runs: page.runs.slice(middle) }),
  ];
}

/** Chrome wraps the group in a transform, then undoes it in each `Tm`. */
function buildFormStream(runs: TestPdfTextRun[]) {
  return `q 2 0 0 2 -100 -50 cm\n${buildTextRuns(runs)}\nQ`;
}

function buildStreamObject(objectNumber: number, contents: string) {
  return `${objectNumber} 0 obj <</Length ${contents.length}>>\nstream\n${contents}\nendstream endobj\n`;
}

export function buildTestPdf(
  pages: TestPdfPage[],
  options: BuildTestPdfOptions = {},
): Uint8Array {
  const firstPageObject = 5;
  // Each page reserves a page object, two content streams and a form XObject.
  const pageObjectStride = 4;
  const pageObjectNumbers = pages.map((_page, index) => {
    const slot = options.reversePageObjectNumbers
      ? pages.length - 1 - index
      : index;

    return firstPageObject + slot * pageObjectStride;
  });
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
    const secondContentObjectNumber = pageObjectNumber + 2;
    const formObjectNumber = pageObjectNumber + 3;
    const xobjects = page.formRuns?.length
      ? `/XObject <</X1 ${formObjectNumber} 0 R>>`
      : '';
    const streams = page.splitContents
      ? splitContentStreams(page)
      : [buildContentStream(page)];
    const contents = page.splitContents
      ? `/Contents[${contentObjectNumber} 0 R ${secondContentObjectNumber} 0 R]`
      : `/Contents ${contentObjectNumber} 0 R`;

    file +=
      `${pageObjectNumber} 0 obj <</Type /Page /Parent 2 0 R ` +
      `/Resources <</Font <</F1 3 0 R>>${xobjects}>> ${contents}>> endobj\n`;

    streams.forEach((stream, streamIndex) => {
      file += buildStreamObject(contentObjectNumber + streamIndex, stream);
    });

    if (!page.formRuns?.length) {
      return;
    }

    const formStream = buildFormStream(page.formRuns);

    file +=
      `${formObjectNumber} 0 obj <</Type /XObject /Subtype /Form ` +
      `/Resources <</Font <</F1 3 0 R>>>> /BBox [0 0 1000 1000] ` +
      `/Length ${formStream.length}>>\nstream\n${formStream}\nendstream endobj\n`;
  });

  file += '%%EOF\n';

  return Uint8Array.from(file, (character) => character.charCodeAt(0));
}

/** Advance of a run drawn by {@link buildTestPdf}, for positioning follow-on runs. */
export function testPdfRunWidth(run: TestPdfTextRun) {
  return run.text.length * ((run.size ?? 12) * (GLYPH_WIDTH / 1000));
}
