import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WebImportPage } from './web-import-page';

vi.mock('@/lib/ocr/browser-tesseract', () => ({
  recognizeScreenshotInBrowser: vi.fn(),
}));

describe('WebImportPage mechanic capture controls', () => {
  it('does not add manual Venus or Colonies entry controls', () => {
    render(
      <WebImportPage
        initialValues={{
          playedOn: '2026-07-18',
        }}
        onAnalyzeImportEvidence={vi.fn()}
        onConfirmImportReview={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText(/venus/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/colony|colonies/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/exported game log/i)).toBeInTheDocument();
  });
});
