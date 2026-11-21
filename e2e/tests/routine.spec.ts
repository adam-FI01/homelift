import { expect, test } from './fixtures';

test('build a routine and start a workout from it', async ({ page }) => {
  await page.goto('/routines');
  await page.getByRole('link', { name: 'New' }).click();

  const sheet = page.getByRole('dialog', { name: 'Add exercises' });
  await sheet.getByRole('searchbox', { name: 'Search exercises' }).fill('squat');
  await sheet.getByRole('checkbox', { name: /^Back Squat/ }).click();
  await sheet.getByRole('searchbox', { name: 'Search exercises' }).fill('leg curl');
  await sheet.getByRole('checkbox', { name: /^Leg Curl/ }).click();
  await sheet.getByRole('button', { name: 'Add 2 exercises' }).click();
  await expect(sheet).toBeHidden();

  await page.getByPlaceholder('e.g. Push A').fill('Legs E2E');
  await expect(page.getByText('2 exercises · 6 sets')).toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page).toHaveURL('/routines');
  const card = page.getByRole('region', { name: 'Legs E2E' });
  await card.getByRole('button', { name: 'Start workout' }).click();

  await expect(page).toHaveURL('/workout');
  await expect(page.getByRole('heading', { level: 1, name: 'Back Squat' })).toBeVisible();
  await expect(page.getByText('Exercise 1 of 2')).toBeVisible();

  await page.getByRole('button', { name: 'Discard workout' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Discard workout' }).click();
  await expect(page).toHaveURL('/');
});
