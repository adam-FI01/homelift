import { expect, test } from './fixtures';

test('log a workout from start to finish', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Start workout' }).click();

  // The exercise sheet opens for a new workout.
  const sheet = page.getByRole('dialog', { name: 'Add exercise' });
  await sheet.getByRole('searchbox', { name: 'Search exercises' }).fill('bench press');
  await sheet.getByRole('button', { name: /^Bench Press/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bench Press' })).toBeVisible();

  // Starting weight for a barbell is the bar; nudge it up and log with one tap.
  await page.getByRole('button', { name: 'Increase weight by 2.5 kg' }).click();
  await page.getByRole('button', { name: 'Log set 1 · 22.5 kg × 8' }).click();
  await expect(page.getByRole('button', { name: 'Set 1 logged. Edit' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Rest timer' })).toBeVisible();

  // The next set fills in from the one just logged.
  await page.getByRole('button', { name: 'Log set 2 · 22.5 kg × 8' }).click();
  await expect(page.getByRole('button', { name: 'Set 2 logged. Edit' })).toBeVisible();

  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  const finish = page.getByRole('dialog', { name: 'Finish workout?' });
  await expect(finish).toContainText('360 kg');
  await finish.getByRole('textbox').fill('First e2e workout');
  await finish.getByRole('button', { name: 'Finish workout' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByLabel('Volume this week, open stats')).toBeVisible();

  await page.getByRole('link', { name: 'History' }).click();
  await page.getByRole('button', { name: /Workout/ }).filter({ hasText: '360 kg' }).first().click();
  const detail = page.getByRole('dialog');
  await expect(detail).toContainText('22.5 kg · 8, 8');
  await expect(detail.getByRole('textbox')).toHaveValue('First e2e workout');
});
