export type OcrImageCrop = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type OcrImageTransform = {
  crop?: OcrImageCrop;
  grayscale?: boolean;
  normalize?: boolean;
  resizeWidth?: number;
  sharpen?: boolean;
  threshold?: number;
};

export type OcrImageSize = {
  height: number;
  width: number;
};

export type OcrImageBytes = Uint8Array<ArrayBuffer>;

export type OcrPixelData = {
  /** Row-major RGBA samples, four bytes per pixel. */
  data: Uint8Array;
  height: number;
  width: number;
};

/**
 * Runtime-specific image + OCR primitives. The screenshot readers stay pure
 * text/geometry logic; callers inject sharp+tesseract on Node or
 * canvas+tesseract in the browser (the Cloudflare Workers runtime cannot run
 * either, so the web client performs OCR before submitting).
 */
export type OcrOps = {
  getImageSize(image: OcrImageBytes): Promise<OcrImageSize | null>;
  readPixels(image: OcrImageBytes): Promise<OcrPixelData | null>;
  recognizeText(
    image: OcrImageBytes,
    options?: { singleLine?: boolean },
  ): Promise<string>;
  transformImage(
    image: OcrImageBytes,
    transform: OcrImageTransform,
  ): Promise<OcrImageBytes>;
};
