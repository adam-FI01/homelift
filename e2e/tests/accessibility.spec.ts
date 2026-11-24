import AxeBuilder from '@axe-core/playwright';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Runs the axe accessibility scanner on each main screen, in light and dark mode, and fails on
 * serious or critical problems (contrast, missing names, bad roles and the like). Passing this is
 * not the same as being accessible: it is the automatic part. A pass with VoiceOver on iOS is
 * still worth doing by hand.
 */

const THEMES = ['LIGHT', 'DARK'] as const;

// Sheets fade in; scanning halfway through the fade reads washed-out colours that nobody sees.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

/** Workout, routine and exercise to look at, created through the API so every screen has content. */
async function seed(request: APIRequestContext) {
  const exercises: { id: number; name: string }[] = await (await request.get('/api/exercises')).json();
  const id = (name: string) => exercises.find((e) => e.name === name)!.id;

  const routine = await (
    await request.post('/api/routines', {
      data: {
        name: 'A11y Push',
        exercises: [
          { exerciseId: id('Bench Press'), sets: 3, reps: 8, maxReps: 12, restSeconds: 120, autoProgress: true, supersetGroup: null },
          { exerciseId: id('Overhead Press'), sets: 3, reps: 8, maxReps: null, restSeconds: 90, autoProgress: false, supersetGroup: null },
        ],
      },
    })
  ).json();

  // One finished workout, so history, stats and the progress chart have something to show.
  const done = await (await request.post('/api/workouts', { data: { name: 'A11y done' } })).json();
  const added = await (
    await request.post(`/api/workouts/${done.id}/exercises`, { data: { exerciseId: id('Bench Press') } })
  ).json();
  for (const [weightKg, reps] of [[60, 8], [62.5, 8], [62.5, 6]]) {
    await request.post(`/api/workouts/${done.id}/exercises/${added.exercises[0].id}/sets`, { data: { weightKg, reps } });
  }
  await request.post(`/api/workouts/${done.id}/finish`);
  const body = await (
    await request.put('/api/body', { data: { date: new Date().toISOString().slice(0, 10), kind: 'WEIGHT', value: 80 } })
  ).json();

  return { routineId: routine.id as number, benchId: id('Bench Press'), doneId: done.id as number, bodyId: body.id as number };
}

async function setTheme(request: APIRequestContext, theme: (typeof THEMES)[number]) {
  await request.put('/api/settings', {
    data: { defaultRestSeconds: 120, autoStartRest: true, restSound: false, restVibrate: false, units: 'KG', theme, barKg: null },
  });
}

async function scan(page: Page, label: string, theme: (typeof THEMES)[number]) {
  // Make sure the scan really runs in the theme it claims to.
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme.toLowerCase());
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n${v.nodes
          .map((n) => `    ${n.target.join(' ')}  ${n.any[0]?.message ?? n.failureSummary ?? ''}`)
          .join('\n')}`,
    )
    .join('\n');
  expect(serious, `${label}\n${report}`).toEqual([]);
}

for (const theme of THEMES) {
  test.describe(`accessibility, ${theme.toLowerCase()} mode`, () => {
    let seeded = { routineId: 0, benchId: 0, doneId: 0, bodyId: 0 };

    test.beforeEach(async ({ request, page }) => {
      seeded = await seed(request);
      await setTheme(request, theme);
      // Settings are cached on the device; make the theme apply before the first paint.
      await page.addInitScript((t) => {
        localStorage.setItem('homelift.settings', JSON.stringify({ theme: t }));
      }, theme);
    });

    // Leave nothing behind: the other tests expect an empty history and no earlier lifts.
    test.afterEach(async ({ request }) => {
      const current = await request.get('/api/workouts/current');
      if (current.status() === 200) await request.delete(`/api/workouts/${(await current.json()).id}`);
      await request.delete(`/api/workouts/${seeded.doneId}`);
      await request.delete(`/api/routines/${seeded.routineId}`);
      await request.delete(`/api/body/${seeded.bodyId}`);
    });

    const screens: [string, () => string, (page: Page) => Promise<void>][] = [
      ['home', () => '/', (p) => p.getByLabel('Volume this week, open stats').waitFor()],
      ['history', () => '/history', (p) => p.getByRole('heading', { name: 'History' }).waitFor()],
      ['stats', () => '/stats', (p) => p.getByRole('heading', { name: 'Stats' }).waitFor()],
      ['settings', () => '/settings', (p) => p.getByRole('heading', { name: 'Settings' }).waitFor()],
      ['routines', () => '/routines', (p) => p.getByRole('region', { name: 'A11y Push' }).waitFor()],
      ['routine editor', () => `/routines/${seeded.routineId}`, (p) => p.getByPlaceholder('e.g. Push A').waitFor()],
      ['exercises', () => '/exercises', (p) => p.getByRole('heading', { name: 'Exercises' }).waitFor()],
      ['new exercise', () => '/exercises/new', (p) => p.getByRole('heading', { name: 'New exercise' }).waitFor()],
      ['exercise progress', () => `/exercises/${seeded.benchId}`, (p) => p.getByRole('heading', { level: 1, name: 'Bench Press' }).waitFor()],
      ['body', () => '/body', (p) => p.getByRole('heading', { name: 'Body' }).waitFor()],
      ['import', () => '/import', (p) => p.getByRole('heading', { name: 'Import workouts' }).waitFor()],
    ];

    for (const [name, url, ready] of screens) {
      test(name, async ({ page }) => {
        await page.goto(url());
        await ready(page);
        await scan(page, `${name}, ${theme.toLowerCase()}`, theme);
      });
    }

    test('workout in progress', async ({ page, request }) => {
      await request.post(`/api/routines/${seeded.routineId}/start`);
      await page.goto('/workout');
      await expect(page.getByRole('heading', { level: 1, name: 'Bench Press' })).toBeVisible();
      await scan(page, `workout, ${theme.toLowerCase()}`, theme);

      await page.getByRole('button', { name: /^Log set 1/ }).click();
      await expect(page.getByRole('button', { name: 'Set 1 logged. Edit' })).toBeVisible();
      await scan(page, `workout with a set logged, ${theme.toLowerCase()}`, theme);

      await page.getByRole('button', { name: 'Finish', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await scan(page, `finish sheet, ${theme.toLowerCase()}`, theme);

      // The routine name is marked as required, and leaving it empty shows an inline error.
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Save as routine' }).click();
      await dialog.getByRole('textbox', { name: /Routine name/ }).fill('');
      await dialog.getByRole('button', { name: 'Save routine' }).click();
      await expect(dialog.getByText('Enter a name for the routine.')).toBeVisible();
      await scan(page, `finish sheet with an error, ${theme.toLowerCase()}`, theme);
      await dialog.getByRole('button', { name: 'Keep going' }).click();

      // A confirmation dialog.
      await page.getByRole('button', { name: 'Discard workout' }).click();
      await expect(page.getByRole('dialog', { name: 'Discard this workout?' })).toBeVisible();
      await scan(page, `confirm dialog, ${theme.toLowerCase()}`, theme);
    });

    test('body, logging inline', async ({ page }) => {
      await page.goto('/body');
      await page.getByRole('button', { name: 'Log', exact: true }).click();
      await expect(page.getByRole('textbox', { name: /Weight/ })).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText('Enter a number greater than 0.')).toBeVisible();
      await scan(page, `body log form, ${theme.toLowerCase()}`, theme);
    });

    test('routine editor with the exercise picker open', async ({ page }) => {
      await page.goto('/routines/new');
      await expect(page.getByRole('dialog', { name: 'Add exercises' })).toBeVisible();
      await scan(page, `exercise picker, ${theme.toLowerCase()}`, theme);
    });
  });
}
