import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DashboardDetailSurface } from './dashboard-detail-surface';

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Open detail
      </button>
      <DashboardDetailSurface
        mode="modal"
        onClose={() => setOpen(false)}
        open={open}
        title="Fixture detail"
      >
        <button type="button">Inside action</button>
      </DashboardDetailSurface>
    </>
  );
}

describe('DashboardDetailSurface', () => {
  it('renders a persistent non-modal region with close and clear actions', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onClear = vi.fn();
    render(
      <DashboardDetailSurface
        mode="panel"
        onClear={onClear}
        onClose={onClose}
        open
        title="Persistent detail"
      >
        Detail body
      </DashboardDetailSurface>,
    );

    expect(screen.getByRole('region', { name: 'Persistent detail' })).not.toHaveAttribute(
      'aria-modal',
    );
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await user.click(screen.getByRole('button', { name: 'Close Persistent detail' }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('focuses the modal close action and restores the opener on close', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const opener = screen.getByRole('button', { name: 'Open detail' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Fixture detail' });
    const close = screen.getByRole('button', { name: 'Close Fixture detail' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(close).toHaveFocus();

    await user.click(close);
    expect(opener).toHaveFocus();
  });

  it('closes a modal with Escape', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    await user.click(screen.getByRole('button', { name: 'Open detail' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders unavailable detail content through the shared data state', () => {
    render(
      <DashboardDetailSurface
        mode="panel"
        onClose={() => undefined}
        open
        state={{ status: 'unavailable', title: 'Detail unavailable' }}
        title="Unavailable detail"
      />,
    );
    expect(screen.getByText('Detail unavailable')).toBeInTheDocument();
  });
});
