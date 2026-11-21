import { test as base, expect } from '@playwright/test';

/**
 * Every test starts from the same place: default settings and no workout in progress, so the
 * tests don't depend on each other's order or leftovers.
 */
export const test = base.extend<{ cleanState: void }>({
  cleanState: [
    async ({ request }, use) => {
      await request.put('/api/settings', {
        data: {
          defaultRestSeconds: 120,
          autoStartRest: true,
          restSound: false,
          restVibrate: false,
          units: 'KG',
          theme: 'SYSTEM',
          barKg: null,
        },
      });
      const current = await request.get('/api/workouts/current');
      if (current.status() === 200) {
        await request.delete(`/api/workouts/${(await current.json()).id}`);
      }
      await use();
    },
    { auto: true },
  ],
});

export { expect };
