import { readOcrTextLinesFromFile } from './read-ocr-text-lines';

export async function readBoardStateScreenshot(file: File) {
  return readOcrTextLinesFromFile(file);
}
