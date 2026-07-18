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

const personalCandidate: ImportPlayerIdentityCandidate = {
  firstName: 'Known',
  guestUsername: null,
  id: '11111111-1111-4111-8111-111111111111',
  identityMode: 'personal_name',
  isAccessible: true,
  isLinked: false,
  lastName: 'Guest',
  normalizedPersonalName: 'known guest',
  normalizedUsername: null,
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

  it('shows an exact personal-name guest and requires explicit reuse', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ImportPlayerIdentityReview
        candidates={[personalCandidate]}
        onChange={onChange}
        values={[
          {
            createNew: false,
            firstName: 'KNOWN',
            lastName: 'GUEST',
            mode: 'personal_name',
            selectedPlayerId: null,
            sourcePlayerText: 'Known Guest',
          },
        ]}
      />,
    );

    expect(screen.getByText(/exact guest candidate/i)).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /use existing guest known guest/i }),
    );

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        createNew: false,
        mode: 'personal_name',
        selectedPlayerId: personalCandidate.id,
      }),
    ]);
    expect(screen.queryByLabelText(/guest username/i)).not.toBeInTheDocument();
  });

  it('shows ambiguous candidates separately instead of silently selecting one', () => {
    render(
      <ImportPlayerIdentityReview
        candidates={[
          personalCandidate,
          {
            ...personalCandidate,
            id: '22222222-2222-4222-8222-222222222222',
          },
        ]}
        onChange={vi.fn()}
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

    expect(screen.getByText(/multiple matching guests found/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /use existing guest known guest/i }),
    ).toHaveLength(2);
  });

  it('surfaces ambiguous automatic source matches and requires explicit selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const secondCandidate = {
      ...personalCandidate,
      id: '22222222-2222-4222-8222-222222222222',
    };

    render(
      <ImportPlayerIdentityReview
        candidates={[personalCandidate, secondCandidate]}
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
        selectedPlayerId: secondCandidate.id,
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
