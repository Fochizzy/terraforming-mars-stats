import { notFound } from 'next/navigation';
import { OcrHarness } from './ocr-harness';

export default function OcrHarnessPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <OcrHarness />;
}
