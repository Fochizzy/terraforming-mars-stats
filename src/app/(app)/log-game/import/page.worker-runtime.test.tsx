import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import { listMaps } from '@/lib/db/reference-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
}));

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({
    children,
    title,
  }: {
    children: ReactNode;
    title: string;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/features/imports/log-game-import-shell', () => ({
  LogGameImportShell: () => <div>Import Shell</div>,
}));

vi.mock('./actions', () => ({
  analyzeImportEvidenceAction: vi.fn(),
  createImportDraftAction: vi.fn(),
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: vi.fn(),
}));

vi.mock('@/lib/db/group-settings-repo', () => ({
  getGroupSettings: vi.fn(),
}));

vi.mock('@/lib/db/reference-repo', () => ({
  listCardScoringReferences: vi.fn(),
  listCards: vi.fn(),
  listCorporations: vi.fn(),
  listMapAwards: vi.fn(),
  listMapMilestones: vi.fn(),
  listMaps: vi.fn(),
  listPreludes: vi.fn(),
  listStyles: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/imports/card-scoring/read-board-state-screenshot', () => {
  throw new Error(
    'read-board-state-screenshot should not load during page render',
  );
});

vi.mock('@/lib/imports/card-scoring/read-ocr-text-lines', () => {
  throw new Error(
    'read-ocr-text-lines should not load during page render',
  );
});

vi.mock('@/lib/imports/read-board-screenshot-space-confirmations', () => {
  throw new Error(
    'read-board-screenshot-space-confirmations should not load during page render',
  );
});

vi.mock('@/lib/imports/read-endgame-screenshot', () => {
  throw new Error('read-endgame-screenshot should not load during page render');
});

describe('LogGameImportPage worker runtime safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders for a signed-in user without loading OCR modules at route render time', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    } as never);
    vi.mocked(getCurrentGroupContext).mockResolvedValue(null);
    vi.mocked(listMaps).mockResolvedValue([
      { code: 'tharsis', id: 'map-1', name: 'Tharsis' },
    ]);

    const { default: LogGameImportPage } = await import('./page');

    render(await LogGameImportPage());

    expect(screen.getByRole('heading', { name: /web import/i })).toBeInTheDocument();
    expect(screen.getByText(/import shell/i)).toBeInTheDocument();
    expect(navigationMocks.redirect).not.toHaveBeenCalled();
    expect(getGroupSettings).not.toHaveBeenCalled();
  });
});
