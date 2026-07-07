import sharp from 'sharp';
import Tesseract from 'tesseract.js';

function normalizeOcrTextLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .map((line) => line.replace(/^[^A-Za-z0-9]+/, '').trim())
    .filter(Boolean);
}

function buildUniqueLines(lines: string[]) {
  return [...new Set(lines)];
}

async function buildOcrPassBuffers(imageBuffer: Buffer) {
  const metadata = await sharp(imageBuffer).metadata();
  const basePasses = await Promise.all([
    sharp(imageBuffer)
      .resize({ width: 1800, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer(),
    sharp(imageBuffer)
      .resize({ width: 1800, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .threshold(150)
      .sharpen()
      .png()
      .toBuffer(),
  ]);

  if (!metadata.width || !metadata.height) {
    return basePasses;
  }

  const bottomTop = Math.floor(metadata.height * 0.45);
  const bottomHeight = Math.max(1, metadata.height - bottomTop);
  const bottomPass = await sharp(imageBuffer)
    .extract({
      height: bottomHeight,
      left: 0,
      top: bottomTop,
      width: metadata.width,
    })
    .resize({ width: 2200, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();

  return [...basePasses, bottomPass];
}

export async function readOcrTextLinesFromBuffer(imageBuffer: Buffer) {
  const passBuffers = await buildOcrPassBuffers(imageBuffer);
  const texts = await Promise.all(
    passBuffers.map(async (buffer) => {
      const result = await Tesseract.recognize(buffer, 'eng');
      return normalizeOcrTextLines(result.data.text);
    }),
  );

  return buildUniqueLines(texts.flat());
}

export async function readOcrTextLinesFromFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return readOcrTextLinesFromBuffer(Buffer.from(arrayBuffer));
}

export async function readOcrTextLinesFromUrl(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch OCR image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return readOcrTextLinesFromBuffer(Buffer.from(arrayBuffer));
}
