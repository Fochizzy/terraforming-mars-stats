import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type {
  ImportPlayerIdentityCandidate,
  ImportPlayerIdentityDraftInput,
} from '@/lib/player-identity/guest-identity';
import { ImportPlayerIdentityReview } from './import-player-identity-review';

function StatefulUsernameReview() {
  const [values, setValues] = useState<ImportPlayerIdentityDraftInput[]>([
    {
      createNew: false,
      mode: 'username' as const,
      selectedPlayerId: null,
      sourcePlayerText: 'Keyboard_Guest',
      username: 'Keyboard_Guest',
    },
  ]);

  return (
    <ImportPlayerIdentityReview
      candidates={[]}
      onChange={setValues}
      values={values}
    />
  );
}

// F-01 privacy boundary: candidates only ever carry public fields. Local
// auto-matching is limited to linked players' public usernames; existing-guest
// reuse and ambiguity are resolved server-side, so the browser never receives a
// private personal name to match against.
const linkedKnown: ImportPlayerIdentityCandidate = {
  id: '11111111-1111-4111-8111-111111111111',
  isAccessible: true,
  isLinked: true,
  publicName: 'Known Guest',
};

describe('ImportPlayerIdentityReview', () => {
  it('keeps username creation separate and requires explicit creation', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ImportPlayerIdentityReview
        candidates={[]}
        onChange={onChange}
        values={[
          {
            createNew: false,
            mode: 'username',
            selectedPlayerId: null,
            sourcePlayerText: 'NEW_GUEST',
            username: 'New.Guest',
          },
        ]}
      />,
    );

    expect(
      screen.getByText(/confirm creation of a new unlinked guest/i),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /create new unlinked guest/i }),
    );

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        createNew: true,
        mode: 'username',
        selectedPlayerId: null,
        username: 'New.Guest',
      }),
    ]);
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
  });

  it('never auto-suggests an unlinked guest for a personal-name entry and offers explicit creation', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ImportPlayerIdentityReview
        candidates={[
          {
            id: '99999999-9999-4999-8999-999999999999',
            isAccessible: true,
            isLinked: false,
            publicName: 'Guest 12AB34CD',
          },
        ]}
        onChange={onChange}
        values={[
          {
            createNew: false,
            firstName: 'Known',
            lastName: 'Guest',
            mode: 'personal_name',
            selectedPlayerId: null,
            sourcePlayerText: 'Known Guest',
          },
        ]}
      />,
    );

    // No local personal-name match is offered, so the private name never
    // participates in browser-side matching.
    expect(
      screen.queryByRole('button', { name: /use existing guest/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create new unlinked guest/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /create new unlinked guest/i }),
    );
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        createNew: true,
        mode: 'personal_name',
        selectedPlayerId: null,
      }),
    ]);
  });

  it('surfaces ambiguous linked public-username matches and requires explicit selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const secondLinked: ImportPlayerIdentityCandidate = {
      ...linkedKnown,
      id: '22222222-2222-4222-8222-222222222222',
    };

    render(
      <ImportPlayerIdentityReview
        candidates={[linkedKnown, secondLinked]}
        onChange={onChange}
        values={[
          {
            mode: 'existing_player',
            selectedPlayerId: '',
            sourcePlayerText: 'Known Guest',
          },
        ]}
      />,
    );

    expect(screen.getByText(/multiple matching guests found/i)).toBeInTheDocument();
    const choices = screen.getAllByRole('button', {
      name: /use existing guest known guest/i,
    });
    expect(choices).toHaveLength(2);

    await user.click(choices[1]);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        mode: 'existing_player',
        selectedPlayerId: secondLinked.id,
        valueSource: 'user_corrected',
      }),
    ]);
  });

  it('keeps keyboard focus on the confirmation control after creation', async () => {
    const user = userEvent.setup();

    render(<StatefulUsernameReview />);
    await user.click(
      screen.getByRole('button', { name: /create new unlinked guest/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /new guest creation confirmed/i }),
      ).toHaveFocus(),
    );
  });
});
