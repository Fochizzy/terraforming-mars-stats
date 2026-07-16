import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GroupSettingsForm } from './group-settings-form';
import { groupRenameSchema } from '@/lib/validation/group-settings';

describe('groupRenameSchema', () => {
  it('requires a target group and a useful group name', () => {
    const parsed = groupRenameSchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      groupName: 'Friday Mars',
    });

    expect(parsed.groupId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(parsed.groupName).toBe('Friday Mars');
  });
});

describe('GroupSettingsForm', () => {
  it('lists memberships and submits a rename for the selected group', async () => {
    const user = userEvent.setup();
    const activeGroupId = '550e8400-e29b-41d4-a716-446655440001';
    const weeknightGroupId = '550e8400-e29b-41d4-a716-446655440002';
    const onRename = vi.fn().mockResolvedValue({
      status: 'success' as const,
      message: 'Renamed.',
    });

    render(
      <GroupSettingsForm
        currentGroupId={activeGroupId}
        groups={[
          { groupId: activeGroupId, groupName: 'Friday Mars', role: 'owner' },
          {
            groupId: weeknightGroupId,
            groupName: 'Tuesday Terraformers',
            role: 'editor',
          },
        ]}
        onRename={onRename}
      />,
    );

    expect(screen.getByRole('heading', { name: /your groups/i })).toBeInTheDocument();
    expect(screen.getByText(/active group/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tuesday Terraformers')).toBeInTheDocument();
    expect(screen.queryByText(/default expansions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/default promo sets/i)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/rename Tuesday Terraformers/i));
    await user.type(
      screen.getByLabelText(/rename Tuesday Terraformers/i),
      'Weeknight Mars',
    );
    await user.click(
      screen.getByRole('button', { name: /save Tuesday Terraformers/i }),
    );

    await waitFor(() =>
      expect(onRename).toHaveBeenCalledWith({
        groupId: weeknightGroupId,
        groupName: 'Weeknight Mars',
      }),
    );
  });
});
