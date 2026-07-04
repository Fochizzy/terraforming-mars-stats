import { expect, test } from '@playwright/test';

test('unauthenticated user is redirected to login from /log-game/import', async ({
  page,
}) => {
  await page.goto('/log-game/import', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login/);
});
