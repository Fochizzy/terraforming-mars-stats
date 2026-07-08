import { beforeEach, describe, expect, it, vi } from 'vitest';

const tesseractMocks = vi.hoisted(() => ({
  createWorker: vi.fn(),
  recognize: vi.fn(),
  workerRecognize: vi.fn(),
  workerSetParameters: vi.fn(),
  workerTerminate: vi.fn(),
}));

vi.mock('tesseract.js', () => ({
  createWorker: tesseractMocks.createWorker,
  default: {
    createWorker: tesseractMocks.createWorker,
    recognize: tesseractMocks.recognize,
  },
}));

import { readGameResultEndgameLinesInBrowser } from './read-endgame-screenshot-browser';

describe('readGameResultEndgameLinesInBrowser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    tesseractMocks.createWorker.mockReset();
    tesseractMocks.recognize.mockReset();
    tesseractMocks.workerRecognize.mockReset();
    tesseractMocks.workerSetParameters.mockReset();
    tesseractMocks.workerTerminate.mockReset();

    tesseractMocks.createWorker.mockResolvedValue({
      recognize: tesseractMocks.workerRecognize,
      setParameters: tesseractMocks.workerSetParameters,
      terminate: tesseractMocks.workerTerminate,
    });
    tesseractMocks.workerRecognize
      .mockResolvedValueOnce({
        data: {
          text: [
            'James 59 5 15 6 8 52 145 105',
            'Izzy 39 10 0 4 6 23 82 82',
          ].join('\n'),
        },
      })
      .mockResolvedValueOnce({
        data: {
          text: [
            'Victory points breakdown after 12 generations',
          ].join('\n'),
        },
      });

    class MockImage {
      height = 2000;
      naturalHeight = 2000;
      naturalWidth = 1200;
      onerror: null | (() => void) = null;
      onload: null | (() => void) = null;
      width = 1200;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-image');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName !== 'canvas') {
        return document.createElement(tagName);
      }

      return {
        getContext: () => ({
          drawImage: vi.fn(),
          filter: '',
        }),
        height: 0,
        toBlob: (callback: BlobCallback) =>
          callback(new Blob(['ocr-crop'], { type: 'image/png' })),
        width: 0,
      } as unknown as HTMLCanvasElement;
    });
  });

  it('uses a locally-pathed worker and combines heading plus score rows from both OCR crops', async () => {
    const file = new File(['mock-image'], 'game-result.png', {
      type: 'image/png',
    });

    await expect(readGameResultEndgameLinesInBrowser(file)).resolves.toEqual([
      'Victory points breakdown after 12 generations',
      'James 59 5 15 6 8 52 145 105',
      'Izzy 39 10 0 4 6 23 82 82',
    ]);

    expect(tesseractMocks.createWorker).toHaveBeenCalledWith(
      'eng',
      1,
      expect.objectContaining({
        corePath: '/ocr/core',
        langPath: '/ocr/lang',
        workerPath: '/ocr/worker.min.js',
      }),
    );
    expect(tesseractMocks.workerRecognize).toHaveBeenCalledTimes(2);
    expect(tesseractMocks.workerTerminate).toHaveBeenCalledTimes(1);
  });
});
