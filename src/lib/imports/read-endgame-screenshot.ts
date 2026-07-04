import Tesseract from 'tesseract.js';

export async function readEndgameScreenshot(file: File) {
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const ocrResult = await Tesseract.recognize(imageBuffer, 'eng');

  return ocrResult.data.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
