/**
 * Minimal PDF text extractor for the game result PDFs the app prints from the
 * browser ("Save as PDF" on the endgame results page).
 *
 * Those files carry a real text layer, so the score table can be read exactly
 * instead of being OCR'd. Only the subset of PDF needed for Skia/Chrome output
 * is implemented: uncompressed object bodies, Flate-compressed streams, Type0
 * (Identity-H) and simple fonts, and the text-positioning operators. Objects
 * stored inside object streams (/ObjStm) are not supported; Chrome does not
 * emit them.
 *
 * Inflation goes through DecompressionStream so this runs unchanged on Node and
 * on the Cloudflare Workers runtime, which cannot load node:zlib.
 */

export type PdfTextItem = {
  /** Text drawn by a single show-text operator. */
  text: string;
  /** Horizontal advance of `text`, in the same units as `x`. */
  width: number;
  x: number;
  y: number;
};

export type PdfTextPage = {
  items: PdfTextItem[];
  pageNumber: number;
};

type PdfFont = {
  /** Bytes per character code: 2 for Identity-H, 1 for simple fonts. */
  bytes: 1 | 2;
  defaultWidth: number;
  toUnicode: Map<number, string>;
  widths: Map<number, number>;
};

type Token = { kind: 'string'; value: string } | { kind: 'token'; value: string };

type Matrix = [number, number, number, number, number, number];

const PDF_MAGIC = '%PDF-';
const OBJECT_HEADER_PATTERN = /(?:^|[^0-9])(\d+)\s+(\d+)\s+obj\b/g;
const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

export function isPdfBytes(bytes: Uint8Array) {
  if (bytes.byteLength < PDF_MAGIC.length) {
    return false;
  }

  return (
    String.fromCharCode(...bytes.subarray(0, PDF_MAGIC.length)) === PDF_MAGIC
  );
}

// Latin-1 keeps a 1:1 byte-to-code-unit mapping, so string offsets found by the
// structural regexes below stay valid indexes into the original byte array.
function decodeLatin1(bytes: Uint8Array) {
  let output = '';

  for (let index = 0; index < bytes.byteLength; index += 8192) {
    output += String.fromCharCode(
      ...bytes.subarray(index, Math.min(index + 8192, bytes.byteLength)),
    );
  }

  return output;
}

async function inflate(bytes: Uint8Array, format: 'deflate' | 'deflate-raw') {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream(format));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

class PdfDocument {
  private readonly bytes: Uint8Array;
  private readonly raw: string;
  private readonly objectRanges = new Map<number, [number, number]>();
  private readonly fontCache = new Map<number, Promise<PdfFont>>();

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.raw = decodeLatin1(bytes);

    OBJECT_HEADER_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = OBJECT_HEADER_PATTERN.exec(this.raw))) {
      const start = match.index + match[0].length;
      const end = this.raw.indexOf('endobj', start);

      if (end !== -1) {
        this.objectRanges.set(Number(match[1]), [start, end]);
      }
    }
  }

  objectSource(objectNumber: number) {
    const range = this.objectRanges.get(objectNumber);

    return range ? this.raw.slice(range[0], range[1]) : '';
  }

  async streamBytes(objectNumber: number) {
    const range = this.objectRanges.get(objectNumber);

    if (!range) {
      return null;
    }

    const source = this.raw.slice(range[0], range[1]);
    const streamIndex = source.indexOf('stream');

    if (streamIndex === -1) {
      return null;
    }

    let dataStart = streamIndex + 'stream'.length;

    if (source[dataStart] === '\r') {
      dataStart += 1;
    }

    if (source[dataStart] === '\n') {
      dataStart += 1;
    }

    const endIndex = source.lastIndexOf('endstream');

    if (endIndex === -1) {
      return null;
    }

    const dictionary = source.slice(0, streamIndex);
    // The bytes between the stream data and `endstream` include an end-of-line
    // marker. DecompressionStream rejects that as trailing junk, so the
    // declared /Length is used to bound the data exactly, falling back to
    // trimming the marker when /Length is an indirect reference.
    const lengthMatch = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dictionary);
    let dataEnd = lengthMatch
      ? dataStart + Number(lengthMatch[1])
      : endIndex;

    if (!lengthMatch) {
      while (dataEnd > dataStart && /[\r\n\s]/.test(source[dataEnd - 1])) {
        dataEnd -= 1;
      }
    }

    const data = this.bytes.subarray(range[0] + dataStart, range[0] + dataEnd);

    if (!/FlateDecode/.test(dictionary)) {
      return data;
    }

    try {
      return await inflate(data, 'deflate');
    } catch {
      try {
        return await inflate(data, 'deflate-raw');
      } catch {
        return null;
      }
    }
  }

  pageObjectNumbers() {
    return [...this.objectRanges.keys()]
      .filter((objectNumber) => {
        const source = this.objectSource(objectNumber);

        return /\/Type\s*\/Page[^s]/.test(source);
      })
      .sort((left, right) => left - right);
  }

  font(objectNumber: number) {
    const cached = this.fontCache.get(objectNumber);

    if (cached) {
      return cached;
    }

    const loading = this.loadFont(objectNumber);

    this.fontCache.set(objectNumber, loading);

    return loading;
  }

  private async loadFont(objectNumber: number): Promise<PdfFont> {
    const source = this.objectSource(objectNumber);
    const isType0 = /\/Subtype\s*\/Type0/.test(source);
    const toUnicodeMatch = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(source);
    const toUnicode = toUnicodeMatch
      ? await this.loadToUnicode(Number(toUnicodeMatch[1]))
      : new Map<number, string>();

    if (!isType0) {
      return {
        bytes: 1,
        defaultWidth: 500,
        toUnicode,
        widths: readSimpleWidths(source),
      };
    }

    const descendantMatch = /\/DescendantFonts\s*\[?\s*(\d+)\s+\d+\s+R/.exec(
      source,
    );
    const descendantSource = descendantMatch
      ? this.objectSource(Number(descendantMatch[1]))
      : '';
    const defaultWidthMatch = /\/DW\s+(-?[\d.]+)/.exec(descendantSource);

    return {
      bytes: 2,
      defaultWidth: defaultWidthMatch ? Number(defaultWidthMatch[1]) : 1000,
      toUnicode,
      widths: readCidWidths(descendantSource),
    };
  }

  private async loadToUnicode(objectNumber: number) {
    const data = await this.streamBytes(objectNumber);
    const map = new Map<number, string>();

    if (!data) {
      return map;
    }

    const source = decodeLatin1(data);
    let block: RegExpExecArray | null;

    const charBlocks = /beginbfchar([\s\S]*?)endbfchar/g;

    while ((block = charBlocks.exec(source))) {
      const pairs = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
      let pair: RegExpExecArray | null;

      while ((pair = pairs.exec(block[1]))) {
        map.set(parseInt(pair[1], 16), decodeUtf16Hex(pair[2]));
      }
    }

    const rangeBlocks = /beginbfrange([\s\S]*?)endbfrange/g;

    while ((block = rangeBlocks.exec(source))) {
      const ranges =
        /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[([\s\S]*?)\])/g;
      let range: RegExpExecArray | null;

      while ((range = ranges.exec(block[1]))) {
        const low = parseInt(range[1], 16);
        const high = parseInt(range[2], 16);

        if (range[3]) {
          const base = parseInt(range[3], 16);

          for (let code = low; code <= high; code += 1) {
            map.set(code, String.fromCodePoint(base + (code - low)));
          }

          continue;
        }

        if (range[4]) {
          [...range[4].matchAll(/<([0-9A-Fa-f]+)>/g)].forEach(
            (entry, offset) => {
              map.set(low + offset, decodeUtf16Hex(entry[1]));
            },
          );
        }
      }
    }

    return map;
  }
}

function decodeUtf16Hex(hex: string) {
  let output = '';

  for (let index = 0; index + 3 < hex.length + 1; index += 4) {
    const code = parseInt(hex.slice(index, index + 4), 16);

    if (!Number.isNaN(code)) {
      output += String.fromCharCode(code);
    }
  }

  return output;
}

function readSimpleWidths(source: string) {
  const widths = new Map<number, number>();
  const widthsMatch = /\/Widths\s*\[([^\]]*)\]/.exec(source);
  const firstCharMatch = /\/FirstChar\s+(\d+)/.exec(source);

  if (!widthsMatch) {
    return widths;
  }

  const firstChar = firstCharMatch ? Number(firstCharMatch[1]) : 0;

  widthsMatch[1]
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(Number)
    .forEach((width, offset) => widths.set(firstChar + offset, width));

  return widths;
}

/** Parses the CIDFont `/W` array: `c [w …]` runs and `cFirst cLast w` runs. */
function readCidWidths(source: string) {
  const widths = new Map<number, number>();
  const arrayMatch = /\/W\s*\[([\s\S]*?)\]\s*(?:\/|>>)/.exec(source);

  if (!arrayMatch) {
    return widths;
  }

  const tokens = arrayMatch[1].match(/\[[^\]]*\]|-?[\d.]+/g) ?? [];
  let index = 0;

  while (index < tokens.length) {
    if (tokens[index].startsWith('[')) {
      index += 1;
      continue;
    }

    const first = Number(tokens[index]);
    const next = tokens[index + 1];

    if (next?.startsWith('[')) {
      next
        .slice(1, -1)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(Number)
        .forEach((width, offset) => widths.set(first + offset, width));
      index += 2;
      continue;
    }

    if (index + 2 < tokens.length) {
      const last = Number(tokens[index + 1]);
      const width = Number(tokens[index + 2]);

      for (let code = first; code <= last; code += 1) {
        widths.set(code, width);
      }

      index += 3;
      continue;
    }

    break;
  }

  return widths;
}

function tokenizeContent(content: string) {
  const tokens: Token[] = [];
  let index = 0;

  while (index < content.length) {
    const character = content[index];

    if (character === '(') {
      const [value, next] = readLiteralString(content, index + 1);

      tokens.push({ kind: 'string', value });
      index = next;
      continue;
    }

    if (character === '<' && content[index + 1] !== '<') {
      const end = content.indexOf('>', index);
      const hex = content.slice(index + 1, end);
      let value = '';

      for (let offset = 0; offset + 1 < hex.length; offset += 2) {
        value += String.fromCharCode(parseInt(hex.slice(offset, offset + 2), 16));
      }

      tokens.push({ kind: 'string', value });
      index = end + 1;
      continue;
    }

    const operator =
      /^<<|^>>|^[[\]]|^\/[^\s()<>[\]/]*|^[^\s()<>[\]/]+/.exec(
        content.slice(index),
      );

    if (operator) {
      tokens.push({ kind: 'token', value: operator[0] });
      index += operator[0].length;
      continue;
    }

    index += 1;
  }

  return tokens;
}

function readLiteralString(content: string, start: number): [string, number] {
  let depth = 1;
  let index = start;
  let value = '';

  while (index < content.length && depth > 0) {
    const character = content[index];

    if (character === '\\') {
      const escaped = content[index + 1];

      if (/[0-7]/.test(escaped)) {
        let digits = '';
        let scan = index + 1;

        while (scan < content.length && digits.length < 3 && /[0-7]/.test(content[scan])) {
          digits += content[scan];
          scan += 1;
        }

        value += String.fromCharCode(parseInt(digits, 8));
        index = scan;
        continue;
      }

      value +=
        { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }[escaped] ?? escaped;
      index += 2;
      continue;
    }

    if (character === '(') {
      depth += 1;
    }

    if (character === ')') {
      depth -= 1;

      if (depth === 0) {
        break;
      }
    }

    value += character;
    index += 1;
  }

  return [value, index + 1];
}

function decodeShownString(input: {
  font: PdfFont;
  fontSize: number;
  value: string;
}) {
  const { font, fontSize, value } = input;
  let text = '';
  let width = 0;

  for (let index = 0; index + font.bytes - 1 < value.length; index += font.bytes) {
    const code =
      font.bytes === 2
        ? (value.charCodeAt(index) << 8) | value.charCodeAt(index + 1)
        : value.charCodeAt(index);

    text += font.toUnicode.get(code) ?? '';
    width += ((font.widths.get(code) ?? font.defaultWidth) / 1000) * fontSize;
  }

  return { text, width };
}

function translate(matrix: Matrix, tx: number, ty: number): Matrix {
  const [a, b, c, d, e, f] = matrix;

  return [a, b, c, d, a * tx + c * ty + e, b * tx + d * ty + f];
}

async function resolvePageFonts(input: {
  document: PdfDocument;
  pageSource: string;
}) {
  const fonts = new Map<string, PdfFont>();
  const inlineMatch = /\/Font\s*<<([\s\S]*?)>>/.exec(input.pageSource);
  const indirectMatch = /\/Font\s+(\d+)\s+\d+\s+R/.exec(input.pageSource);
  const dictionary = inlineMatch
    ? inlineMatch[1]
    : indirectMatch
      ? input.document.objectSource(Number(indirectMatch[1]))
      : '';

  for (const entry of dictionary.matchAll(/\/(\w+)\s+(\d+)\s+\d+\s+R/g)) {
    fonts.set(`/${entry[1]}`, await input.document.font(Number(entry[2])));
  }

  return fonts;
}

async function readPageContent(input: {
  document: PdfDocument;
  pageSource: string;
}) {
  const contentsMatch = /\/Contents\s+(?:(\d+)\s+\d+\s+R|\[([^\]]*)\])/.exec(
    input.pageSource,
  );

  if (!contentsMatch) {
    return '';
  }

  const references = contentsMatch[1]
    ? [Number(contentsMatch[1])]
    : [...contentsMatch[2].matchAll(/(\d+)\s+\d+\s+R/g)].map((match) =>
        Number(match[1]),
      );
  let content = '';

  for (const reference of references) {
    const data = await input.document.streamBytes(reference);

    if (data) {
      content += `${decodeLatin1(data)}\n`;
    }
  }

  return content;
}

async function extractPageItems(input: {
  document: PdfDocument;
  pageObjectNumber: number;
}) {
  const pageSource = input.document.objectSource(input.pageObjectNumber);
  const [fonts, content] = await Promise.all([
    resolvePageFonts({ document: input.document, pageSource }),
    readPageContent({ document: input.document, pageSource }),
  ]);
  const items: PdfTextItem[] = [];
  const operands: Token[] = [];
  let font: PdfFont | null = null;
  let fontSize = 12;
  let textMatrix: Matrix = [...IDENTITY_MATRIX];
  let lineMatrix: Matrix = [...IDENTITY_MATRIX];

  const pushItem = (text: string, width: number) => {
    if (text) {
      items.push({ text, width, x: textMatrix[4], y: textMatrix[5] });
    }
  };

  for (const token of tokenizeContent(content)) {
    if (
      token.kind === 'string' ||
      /^-?[\d.]+$/.test(token.value) ||
      token.value.startsWith('/') ||
      token.value === '[' ||
      token.value === ']'
    ) {
      operands.push(token);
      continue;
    }

    const numbers = operands
      .filter((operand) => operand.kind === 'token' && /^-?[\d.]+$/.test(operand.value))
      .map((operand) => Number(operand.value));
    const names = operands.filter(
      (operand) => operand.kind === 'token' && operand.value.startsWith('/'),
    );
    const strings = operands.filter((operand) => operand.kind === 'string');

    switch (token.value) {
      case 'BT': {
        textMatrix = [...IDENTITY_MATRIX];
        lineMatrix = [...IDENTITY_MATRIX];
        break;
      }
      case 'Tf': {
        const name = names.at(-1);

        if (name) {
          font = fonts.get(name.value) ?? font;
        }

        if (numbers.length > 0) {
          fontSize = numbers.at(-1) as number;
        }

        break;
      }
      case 'Tm': {
        if (numbers.length >= 6) {
          lineMatrix = numbers.slice(-6) as Matrix;
          textMatrix = [...lineMatrix];
        }

        break;
      }
      case 'Td':
      case 'TD': {
        if (numbers.length >= 2) {
          lineMatrix = translate(lineMatrix, numbers.at(-2) as number, numbers.at(-1) as number);
          textMatrix = [...lineMatrix];
        }

        break;
      }
      case 'T*': {
        lineMatrix = translate(lineMatrix, 0, 0);
        textMatrix = [...lineMatrix];
        break;
      }
      case 'Tj':
      case "'":
      case '"': {
        const shown = strings.at(-1);

        if (shown && font) {
          const decoded = decodeShownString({ font, fontSize, value: shown.value });

          pushItem(decoded.text, decoded.width);
        }

        break;
      }
      case 'TJ': {
        if (font) {
          let text = '';
          let width = 0;

          for (const operand of operands) {
            if (operand.kind === 'string') {
              const decoded = decodeShownString({
                font,
                fontSize,
                value: operand.value,
              });

              text += decoded.text;
              width += decoded.width;
              continue;
            }

            if (/^-?[\d.]+$/.test(operand.value)) {
              width -= (Number(operand.value) / 1000) * fontSize;
            }
          }

          pushItem(text, width);
        }

        break;
      }
      default:
        break;
    }

    operands.length = 0;
  }

  return dedupeStackedDraws(items);
}

/**
 * Chrome paints styled text (shadows, strokes) by drawing the same string at
 * the same position once per layer, sometimes through a fallback font. Only the
 * first draw at a given position carries information.
 */
function dedupeStackedDraws(items: PdfTextItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.x.toFixed(2)}|${item.y.toFixed(2)}|${item.text}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

export async function extractPdfTextPages(
  bytes: Uint8Array,
): Promise<PdfTextPage[]> {
  if (!isPdfBytes(bytes)) {
    throw new Error('The uploaded file is not a PDF.');
  }

  const document = new PdfDocument(bytes);
  const pageObjectNumbers = document.pageObjectNumbers();

  if (pageObjectNumbers.length === 0) {
    throw new Error(
      'This PDF stores its pages in a compressed object stream, which is not supported. Re-export it with the browser print dialog.',
    );
  }

  const pages: PdfTextPage[] = [];

  for (const [index, pageObjectNumber] of pageObjectNumbers.entries()) {
    pages.push({
      items: await extractPageItems({ document, pageObjectNumber }),
      pageNumber: index + 1,
    });
  }

  return pages;
}
