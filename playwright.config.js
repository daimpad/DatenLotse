const { defineConfig, devices } = require('@playwright/test');

/**
 * DatenLotse hat keinen Build-Schritt – getestet wird die ausgelieferte App,
 * exakt so wie GitHub Pages sie serviert. Der Webserver ist derselbe, der auch
 * in der lokalen Entwicklung benutzt wird (python3 -m http.server).
 */
/* Normalerweise startet Playwright seinen eigenen, mitgelieferten Chromium.
   In Umgebungen mit vorinstalliertem Browser (Container, CI-Image ohne
   `playwright install`) kann er über PLAYWRIGHT_CHROMIUM_PATH gesetzt werden. */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8081',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
  ],
  webServer: {
    command: 'python3 -m http.server 8081 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8081/index.html',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
