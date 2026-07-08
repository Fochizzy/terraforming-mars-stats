import { readOcrTextLinesWithOps } from '../ocr/read-ocr-text-lines-with-ops';
import { sharpOcrOps } from '../ocr/sharp-ocr-ops';

export async function readOcrTextLinesFromBuffer(imageBuffer: Buffer) {
  return readOcrTextLinesWithOps(new Uint8Array(imageBuffer), sharpOcrOps);
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
