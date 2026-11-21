import { expect, test } from './fixtures';

test('switch to pounds and dark mode', async ({ page, request }) => {
  // A finished workout with 100 kg × 5 to read back in pounds.
  const workout = await (await request.post('/api/workouts', { data: { name: 'Units check' } })).json();
  const exercises = await (await request.get('/api/exercises?q=deadlift')).json();
  const deadlift = exercises.find((e: { name: string }) => e.name === 'Deadlift');
  const added = await (
    await request.post(`/api/workouts/${workout.id}/exercises`, { data: { exerciseId: deadlift.id } })
  ).json();
  const workoutExerciseId = added.exercises[0].id;
  await request.post(`/api/workouts/${workout.id}/exercises/${workoutExerciseId}/sets`, {
    data: { weightKg: 100, reps: 5 },
  });
  await request.post(`/api/workouts/${workout.id}/finish`);

  await page.goto('/settings');
  await page.getByRole('radio', { name: 'Pounds' }).click();
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('button', { name: /Units check/ })).toContainText('1,102 lb');
});
