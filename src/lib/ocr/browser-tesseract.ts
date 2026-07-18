'use client';

type TesseractLoggerMessage = {
  progress?: number;
  status?: string;
};

type TesseractRecognitionResult = {
  data: {
    confidence?: number;
    text?: string;
    tsv?: string;
  };
};

type TesseractWorker = {
  recognize: (
    image: File | Blob | string,
    options?: Record<string, unknown>,
    output?: { text?: boolean; tsv?: boolean },
  ) => Promise<TesseractRecognitionResult>;
  terminate: () => Promise<void>;
};

type TesseractGlobal = {
  createWorker: (
    language: string,
    oem?: number,
    options?: {
      logger?: (message: TesseractLoggerMessage) => void;
    },
  ) => Promise<TesseractWorker>;
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
  words: BrowserOcrWord[];
};

export type BrowserOcrWord = {
  confidence: number | null;
  height: number;
  left: number;
  lineKey: string;
  text: string;
  top: number;
  width: number;
};

export async function recognizeScreenshotInBrowser(
  file: File,
  onProgress?: (input: { progress: number; status: string }) => void,
): Promise<BrowserOcrResult> {
  const tesseract = await loadTesseractRuntime();
  const worker = await tesseract.createWorker('eng', undefined, {
    logger(message) {
      onProgress?.({
        progress: clampProgress(message.progress),
        status: message.status ?? 'Processing screenshot',
      });
    },
  });
  let result: TesseractRecognitionResult;

  try {
    result = await worker.recognize(file, {}, { text: true, tsv: true });
  } finally {
    await worker.terminate();
  }

  const text = result.data.text?.trim() ?? '';
  if (!text) {
    throw new Error('No readable text was found in the screenshot.');
  }

  return {
    confidence: normalizeConfidence(result.data.confidence),
    text,
    words: parseTsvWords(result.data.tsv),
  };
}

function parseTsvWords(tsv: string | undefined): BrowserOcrWord[] {
  if (!tsv?.trim()) {
    return [];
  }

  return tsv
    .split(/\r?\n/)
    .slice(1)
    .map((row) => row.split('\t'))
    .filter((columns) => columns.length >= 12 && columns[0] === '5')
    .map((columns) => ({
      confidence: normalizeConfidence(Number(columns[10])),
      height: Number(columns[9]) || 0,
      left: Number(columns[6]) || 0,
      lineKey: `${columns[1]}:${columns[2]}:${columns[3]}:${columns[4]}`,
      text: columns.slice(11).join('\t').trim(),
      top: Number(columns[7]) || 0,
      width: Number(columns[8]) || 0,
    }))
    .filter((word) => word.text.length > 0);
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
