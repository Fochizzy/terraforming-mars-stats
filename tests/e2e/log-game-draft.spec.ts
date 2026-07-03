import { expect, test } from '@playwright/test';

test('unauthenticated user is redirected to login from /log-game', async ({
  page,
}) => {
  await page.goto('/log-game');
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole('heading', { name: /join your group/i }),
  ).toBeVisible();
});
