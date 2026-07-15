'use client';

type TesseractLoggerMessage = {
  progress?: number;
  status?: string;
};

type TesseractRecognitionResult = {
  data: {
    confidence?: number;
    text?: string;
  };
};

type TesseractGlobal = {
  recognize: (
    image: File | Blob | string,
    language: string,
    options?: {
      logger?: (message: TesseractLoggerMessage) => void;
    },
  ) => Promise<TesseractRecognitionResult>;
};

declare global {
  interface Window {
    Tesseract?: TesseractGlobal;
  }
}

const TESSERACT_SCRIPT_ID = 'tesseract-js-browser-runtime';
const TESSERACT_SCRIPT_URL =
  'https