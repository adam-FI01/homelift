import { expect, test } from './fixtures';

test('the page behind a sheet does not scroll, and scrolling comes back when it closes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Start workout' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add exercise' });
  await expect(sheet).toBeVisible();

  const overflow = () => page.evaluate(() => getComputedStyle(document.documentElement).overflow);
  expect(await overflow()).toBe('hidden');

  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  expect(await overflow()).not.toBe('hidden');
});

test('finishing a workout confirms with a message', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Start workout' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add exercise' });
  await sheet.getByRole('searchbox', { name: 'Search exercises' }).fill('bench press');
  await sheet.getByRole('button', { name: /^Bench Press/ }).click();
  await page.getByRole('button', { name: /^Log set 1/ }).click();
  await expect(page.getByRole('button', { name: 'Set 1 logged. Edit' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('dialog', { name: 'Finish workout?' }).getByRole('button', { name: 'Finish workout' }).click();

  await expect(page.getByRole('status').getByText('Workout finished')).toBeVisible();
});
