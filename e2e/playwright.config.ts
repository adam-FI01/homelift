import { defineConfig, devices } from '@playwright/test';

/**
 * Drives the packaged app (the jar with the UI inside) in Chromium at phone size. By default it
 * starts the jar on port 18081 with an empty database; set BASE_URL to test a running server.
 */
const port = 18081;
const external = process.env['BASE_URL'];
const dataDir = `${process.env['RUNNER_TEMP'] ?? '/tmp'}/homelift-e2e`;

export default defineConfig({
  testDir: 'tests',
  // The tests share one server and database, so they run in order.
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['github']] : 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: external ?? `http://localhost:${port}`,
    trace: 'off',
    // Set CHROMIUM_PATH to use a browser you already have instead of the one Playwright downloads.
    launchOptions: { executablePath: process.env['CHROMIUM_PATH'] },
  },
  webServer: external
    ? undefined
    : {
        command: `rm -rf ${dataDir} && java --enable-native-access=ALL-UNNAMED -jar $(ls ../backend/target/homelift-*.jar | head -1)`,
        url: `http://localhost:${port}/actuator/health`,
        env: { PORT: String(port), HOMELIFT_DATA_DIR: dataDir },
        timeout: 90_000,
        reuseExistingServer: false,
      },
});
