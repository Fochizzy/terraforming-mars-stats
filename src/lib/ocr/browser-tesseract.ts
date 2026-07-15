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
  'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';

let runtimePromise: Promise<TesseractGlobal> | null = null;

export type BrowserOcrResult = {
  confidence: number | null;
  text: string;
};

export async function recognizeScreenshotInBrowser(
  file: File,
  onProgress?: (input: { progress: number; status: string }) => void,
): Promise<BrowserOcrResult> {
  const tesseract = await loadTesseractRuntime();
  const result = await tesseract.recognize(file, 'eng', {
    logger(message) {
      onProgress?.({
        progress: clampProgress(message.progress),
        status: message.status ?? 'Processing screenshot',
      });
    },
  });

  const text = result.data.text?.trim() ?? '';
  if (!text) {
    throw new Error('No readable text was found in the screenshot.');
  }

  return {
    confidence: normalizeConfidence(result.data.confidence),
    text,
  };
}

function loadTesseractRuntime(): Promise<TesseractGlobal> {
  if (window.Tesseract) {
    return Promise.resolve(window.Tesseract);
  }

  if (runtimePromise) {
    return runtimePromise;
  }

  runtimePromise = new Promise<TesseractGlobal>((resolve, reject) => {
    const existingScript = document.getElementById(
      TESSERACT_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    const handleLoaded = () => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        reject(new Error('The OCR runtime loaded without initializing.'));
      }
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleLoaded, { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Unable to load the OCR runtime.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = TESSERACT_SCRIPT_ID;
    script.src = TESSERACT_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', handleLoaded, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Unable to load the OCR runtime.')),
      { once: true },
    );
    document.head.appendChild(script);
  }).catch((error) => {
    runtimePromise = null;
    throw error;
  });

  return runtimePromise;
}

function clampProgress(progress: number | undefined) {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(Math.max(progress ?? 0, 0), 1);
}

function normalizeConfidence(confidence: number | undefined) {
  if (!Number.isFinite(confidence)) {
    return null;
  }

  return Math.min(Math.max((confidence ?? 0) / 100, 0), 1);
}
