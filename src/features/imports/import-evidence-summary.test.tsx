import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImportEvidenceSummary } from './import-evidence-summary';

describe('ImportEvidenceSummary', () => {
  it('renders a concise summary of saved log text and screenshot evidence', () => {
    render(
      <ImportEvidenceSummary
        importSummary={{
          createdAt: '2026-07-03T23:25:00.000Z',
          detectedSource: 'manual_web_import',
          id: 'import-2',
          lineCount: 4,
          parseStatus: 'log_parsed_score_extracted',
          rawLogText:
            'Friday Mars won by 6 points.\nSecond Seat lost the tiebreak.\nGeneration 12.\nAward funded.',
          screenshotOriginalName: 'endgame.png',
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /imported evidence/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/4 log lines saved/i)).toBeInTheDocument();
    expect(screen.getByText(/screenshot: endgame\.png/i)).toBeInTheDocument();
    expect(
      screen.getByText(/log parsed \+ score extracted/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/friday mars won by 6 points\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/\+1 more lines saved/i)).toBeInTheDocument();
  });
});
